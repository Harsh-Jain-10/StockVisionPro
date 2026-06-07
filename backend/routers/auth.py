from __future__ import annotations

import os
import random
import uuid
import hashlib
import secrets
import smtplib
import json
import base64
import hmac
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from models.database import OTPCode, User, OTPRequestLog, get_db, utc_now
from models.schemas import AuthSendOtpRequest, AuthVerifyOtpRequest, AuthSigninRequest, AuthVerifyOtpResponse
from services.mail_service import send_otp_email_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_key_for_stockvision_pro")

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)


def create_jwt_token(payload: dict) -> str:
    secret = os.getenv("JWT_SECRET", "super_secret_jwt_key_stockvision_pro")
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    
    header_b64 = base64url_encode(header_json)
    payload_b64 = base64url_encode(payload_json)
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_jwt_token(token: str) -> dict | None:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        secret = os.getenv("JWT_SECRET", "super_secret_jwt_key_stockvision_pro")
        
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_signature_b64 = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
        
        payload_bytes = base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        if 'exp' in payload:
            exp = payload['exp']
            if datetime.now(timezone.utc).timestamp() > exp:
                return None
                
        return payload
    except Exception as e:
        print(f"[JWT Error] Token verification failed: {e}")
        return None


def get_current_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    
    token = authorization.split(" ")[1]
    payload = verify_jwt_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token or session expired.")
    
    if payload.get("role") == "admin":
        return User(id="admin", email=payload.get("email", "admin@stockvision.pro"), role="admin")
        
    user = db.scalar(select(User).where(User.id == payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def hash_password(password: str) -> str:
    """Hash a password using secure PBKDF2 with SHA-256 and a random salt."""
    salt = secrets.token_hex(16)
    pbkdf2 = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return f"{salt}:{pbkdf2.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its PBKDF2 hash."""
    try:
        salt, hash_val = hashed.split(":")
        expected_pbkdf2 = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        )
        return secrets.compare_digest(expected_pbkdf2.hex(), hash_val)
    except Exception:
        return False


def send_otp_email(email_to: str, code: str, action: str) -> bool:
    """Send an OTP code via SMTP. Returns True on success, False on configuration absence or failure."""
    return send_otp_email_service(email_to, code, action)


@router.post("/send-otp")
def send_otp(payload: AuthSendOtpRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    # Simple email validation
    if "@" not in email or "." not in email or len(email) < 5:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    admin_email = os.getenv("ADMIN_EMAIL")
    if admin_email and email == admin_email.strip().lower():
        raise HTTPException(
            status_code=400,
            detail="Admin logins are managed separately. Please use the Admin Portal."
        )

    # Check user existence depending on action
    user = db.scalar(select(User).where(User.email == email))
    if payload.action == "signin":
        if not user:
            raise HTTPException(
                status_code=404, 
                detail="This email is not registered yet. Please switch to the 'Sign Up' tab to create an account."
            )

    if payload.action == "signup":
        if user:
            raise HTTPException(
                status_code=400, 
                detail="This email is already registered. Please switch to the 'Sign In' tab."
            )
        if not payload.password or len(payload.password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password is required and must be at least 6 characters long."
            )

    if payload.action == "reset_password":
        if not user:
            raise HTTPException(
                status_code=404,
                detail="This email is not registered yet. Please sign up to create an account."
            )
        if not payload.password or len(payload.password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password is required and must be at least 6 characters long."
            )

    # Enforce Rate Limiting (60s cooldown, max 3 requests in 15 minutes)
    now = utc_now()
    # Purge expired log entries older than 15 minutes to save storage
    db.query(OTPRequestLog).filter(OTPRequestLog.requested_at < now - timedelta(minutes=15)).delete()

    # 1. 60-second cooldown check
    last_log = db.scalar(
        select(OTPRequestLog)
        .where(OTPRequestLog.email == email)
        .order_by(OTPRequestLog.requested_at.desc())
        .limit(1)
    )
    if last_log:
        last_time = last_log.requested_at
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)
        elapsed = (now - last_time).total_seconds()
        if elapsed < 60:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(60 - elapsed)} seconds before requesting another code."
            )

    # 2. Max 3 requests in 15 minutes check
    recent_count = db.scalar(
        select(func.count(OTPRequestLog.id))
        .where(
            OTPRequestLog.email == email,
            OTPRequestLog.requested_at >= now - timedelta(minutes=15)
        )
    ) or 0
    if recent_count >= 3:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait 15 minutes before requesting another verification code."
        )

    # Record this request in the rate limiting logs
    new_log = OTPRequestLog(email=email, requested_at=now)
    db.add(new_log)

    # Generate 6-digit OTP code
    code = f"{random.randint(100000, 999999)}"
    expiry = utc_now() + timedelta(minutes=5)

    # Delete existing active OTP for this email
    db.query(OTPCode).filter(OTPCode.email == email).delete()

    # Save new OTP entry
    otp_entry = OTPCode(
        email=email,
        code=code,
        expires_at=expiry,
        attempts=0,
        pending_password=hash_password(payload.password) if (payload.action in ("signup", "reset_password") and payload.password) else None,
        pending_role=payload.role
    )
    db.add(otp_entry)
    db.commit()

    # Attempt to send SMTP email
    email_dispatched = send_otp_email(email, code, payload.action)

    # Print to console for verification/fallback checking
    print(f"\n========================================")
    print(f"[AUTH OTP] Email: {email} | Action: {payload.action} | Code: {code}")
    print(f"========================================\n")

    if not email_dispatched:
        # Delete database OTP so it can't be used if email failed
        db.delete(otp_entry)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please try again later."
        )

    return {
        "success": True,
        "message": "OTP code has been generated and sent to your email address."
    }


@router.post("/verify-otp", response_model=AuthVerifyOtpResponse)
def verify_otp(payload: AuthVerifyOtpRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and OTP code are required.")

    admin_email = os.getenv("ADMIN_EMAIL")
    if admin_email and email == admin_email.strip().lower():
        raise HTTPException(
            status_code=400,
            detail="Admin verification is managed separately. Please use the Admin Portal."
        )

    # Check user existence depending on action
    user = db.scalar(select(User).where(User.email == email))
    if payload.action == "signin" and not user:
        raise HTTPException(status_code=404, detail="User account not found. Please sign up.")
    if payload.action == "signup" and user:
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in.")
    if payload.action == "reset_password" and not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Find the active OTP code record
    otp_record = db.scalar(select(OTPCode).where(OTPCode.email == email))
    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No active verification code found for this email. Please request a new one."
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
            detail="Verification code has expired. Please request a new one."
        )

    # Validate OTP code value
    if otp_record.code != code:
        otp_record.attempts += 1
        db.commit()
        
        remaining = 5 - otp_record.attempts
        if remaining <= 0:
            db.delete(otp_record)
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect verification attempts. This code has been invalidated. Please request a new one."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect verification code. You have {remaining} attempts remaining."
            )

    # Retrieve pending password hash if signup or reset_password
    pending_password_hash = otp_record.pending_password if payload.action in ("signup", "reset_password") else None

    # Code is valid, remove it
    db.delete(otp_record)
    db.commit()

    # Success: Register or retrieve or update user
    token = None
    if payload.action == "signup":
        user_id = f"usr_{uuid.uuid4().hex}"
        pending_role = otp_record.pending_role or "user"
        admin_email = os.getenv("ADMIN_EMAIL")
        if admin_email and email == admin_email.strip().lower():
            pending_role = "admin"
        user = User(id=user_id, email=email, hashed_password=pending_password_hash, role=pending_role)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        try:
            from services.mongodb_service import sync_user_to_mongodb
            sync_user_to_mongodb(user.id, user.email, user.hashed_password, user.role)
        except Exception as e:
            print(f"[MongoDB Sync Warning] Failed to trigger sync: {e}")
        
        token = create_jwt_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "exp": (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
        })
    elif payload.action == "reset_password":
        admin_email = os.getenv("ADMIN_EMAIL")
        if admin_email and user.email == admin_email.strip().lower():
            user.role = "admin"
        user.hashed_password = pending_password_hash
        user.updated_at = utc_now()
        db.commit()
        db.refresh(user)
        user_id = user.id
        
        try:
            from services.mongodb_service import sync_user_to_mongodb
            sync_user_to_mongodb(user.id, user.email, user.hashed_password, user.role)
        except Exception as e:
            print(f"[MongoDB Sync Warning] Failed to trigger sync: {e}")
        
        token = create_jwt_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "exp": (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
        })
    else:
        user_id = user.id
        admin_email = os.getenv("ADMIN_EMAIL")
        if admin_email and user.email == admin_email.strip().lower():
            if user.role != "admin":
                user.role = "admin"
                db.commit()
                db.refresh(user)
        token = create_jwt_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role or "user",
            "exp": (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
        })

    return {
        "success": True,
        "user_id": user_id,
        "email": email,
        "token": token,
        "role": user.role or "user",
        "message": "Authentication successful",
    }


@router.post("/signin")
def signin(payload: AuthSigninRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    password = payload.password
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
        
    admin_email = os.getenv("ADMIN_EMAIL")
    if admin_email and email == admin_email.strip().lower():
        raise HTTPException(
            status_code=400,
            detail="Admin logins are managed separately. Please use the Admin Portal."
        )
        
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    if not user.hashed_password:
        raise HTTPException(
            status_code=400, 
            detail="This account does not have a password set. Please verify your email via signup."
        )
        
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
            
    token = create_jwt_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role or "user",
        "exp": (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
    })
    
    return {
        "success": True,
        "user_id": user.id,
        "email": user.email,
        "token": token,
        "role": user.role or "user",
        "message": "Login successful"
    }
