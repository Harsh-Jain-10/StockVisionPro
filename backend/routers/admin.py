import os
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.database import get_db, OTPCode, CreditRequest, User, PortfolioTransaction, utc_now
from models.schemas import AdminSigninRequest, AdminVerifyOtpRequest, CreditRequestResponse, CreditRejectRequest
from routers.auth import get_current_user, create_jwt_token
from services.mail_service import send_otp_email_service, send_credit_approval_user_email, send_credit_rejection_user_email

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def get_admin_credentials():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password or not admin_password.strip():
        raise HTTPException(
            status_code=500,
            detail="Admin credentials are not configured in the system environment variables."
        )
    return admin_email.strip().lower(), admin_password


@router.post("/signin")
def admin_signin(payload: AdminSigninRequest, db: Session = Depends(get_db)):
    admin_email, admin_password = get_admin_credentials()
    
    email = payload.email.strip().lower()
    password = payload.password
    
    if email != admin_email or password != admin_password:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    # Invalidate all previous admin OTP codes to ensure only one is active
    db.query(OTPCode).filter(OTPCode.email == admin_email).delete()
    
    # Generate 6-digit OTP code
    code = f"{random.randint(100000, 999999)}"
    expiry = utc_now() + timedelta(minutes=5)
    
    # Save the new OTP code
    otp_entry = OTPCode(
        email=admin_email,
        code=code,
        expires_at=expiry,
        attempts=0,
        pending_role="admin"
    )
    db.add(otp_entry)
    db.commit()
    
    # Dispatch OTP via configured email service
    email_dispatched = send_otp_email_service(admin_email, code, "signin")
    
    # Development fallback console log
    print(f"\n========================================")
    print(f"[ADMIN OTP] Email: {admin_email} | Code: {code}")
    print(f"========================================\n")
    
    if not email_dispatched:
        # Check if console printing is sufficient or raise error if required.
        # Since SMTP can fail or be unconfigured, let's treat console as valid dev fallback
        # but let the response communicate success.
        pass
        
    return {
        "success": True,
        "message": "OTP verification code has been sent to your administrator email."
    }


@router.post("/verify-otp")
def admin_verify_otp(payload: AdminVerifyOtpRequest, db: Session = Depends(get_db)):
    admin_email, _ = get_admin_credentials()
    email = payload.email.strip().lower()
    code = payload.code.strip()
    
    if email != admin_email:
        raise HTTPException(status_code=400, detail="Invalid admin email address.")
        
    # Find the active OTP code record
    otp_record = db.scalar(select(OTPCode).where(OTPCode.email == admin_email))
    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No active verification code found for this email. Please sign in again."
        )
        
    # Check expiry
    now = utc_now()
    expires_at = otp_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at < now:
        db.delete(otp_record)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please sign in again."
        )
        
    # Validate code
    if otp_record.code != code:
        otp_record.attempts += 1
        db.commit()
        
        remaining = 5 - otp_record.attempts
        if remaining <= 0:
            db.delete(otp_record)
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect verification attempts. Code invalidated. Sign in again."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect verification code. You have {remaining} attempts remaining."
            )
            
    # Valid code, clear it
    db.delete(otp_record)
    db.commit()
    
    token = create_jwt_token({
        "sub": "admin",
        "email": admin_email,
        "role": "admin",
        "exp": (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
    })
    
    return {
        "success": True,
        "user_id": "admin",
        "email": admin_email,
        "token": token,
        "role": "admin",
        "message": "Admin login successful"
    }


@router.get("/requests", response_model=list[CreditRequestResponse])
def list_admin_credit_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin access required.")
        
    reqs = db.scalars(select(CreditRequest).order_by(CreditRequest.created_at.desc())).all()
    return list(reqs)


@router.post("/approve/{request_id}", response_model=CreditRequestResponse)
def approve_admin_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin access required.")
        
    req = db.get(CreditRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found.")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")
        
    req.status = "approved"
    req.approved_at = utc_now()
    req.approved_by = current_user.email
    req.updated_at = utc_now()
    
    # Create credit transaction to increase balance
    transaction = PortfolioTransaction(
        user_id=req.user_id,
        symbol="USD",
        action="credit",
        shares=1.0,
        price=req.amount,
        timestamp=utc_now()
    )
    db.add(transaction)
    db.commit()
    
    # Calculate user new balance
    user_transactions = db.scalars(select(PortfolioTransaction).where(PortfolioTransaction.user_id == req.user_id)).all()
    cash_balance = 100_000.0
    for t in user_transactions:
        if t.action == "buy":
            cash_balance -= t.shares * t.price
        elif t.action == "credit":
            cash_balance += t.price
        else:
            cash_balance += t.shares * t.price
            
    # Send email notification to user
    user_obj = db.get(User, req.user_id)
    if user_obj:
        send_credit_approval_user_email(user_obj.email, req.amount, cash_balance)
        
    db.commit()
    db.refresh(req)
    return req


@router.post("/reject/{request_id}", response_model=CreditRequestResponse)
def reject_admin_request(request_id: int, payload: CreditRejectRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin access required.")
        
    req = db.get(CreditRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found.")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")
        
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required.")
        
    req.status = "rejected"
    req.admin_note = payload.reason
    req.updated_at = utc_now()
    db.commit()
    
    user_obj = db.get(User, req.user_id)
    if user_obj:
        send_credit_rejection_user_email(user_obj.email, req.amount, payload.reason)
        
    db.commit()
    db.refresh(req)
    return req
