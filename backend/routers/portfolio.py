from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.database import get_db, PortfolioItem, PortfolioTransaction, utc_now, CreditRequest, User
from models.schemas import PortfolioTradeRequest, PortfolioTransactionResponse, CreditRequestCreate, CreditRequestResponse
from services.data_service import get_quote
from services.mail_service import send_credit_request_admin_email, send_credit_approval_user_email, send_credit_rejection_user_email
from routers.auth import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

# NOTE: Static routes like /requests, /request-credits, and /trade must come BEFORE 
# parameterized routes like /{user_id} to avoid FastAPI matching those path components as user_id.

@router.get("/requests", response_model=list[CreditRequestResponse])
def get_user_credit_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reqs = db.scalars(
        select(CreditRequest)
        .where(CreditRequest.user_id == current_user.id)
        .order_by(CreditRequest.created_at.desc())
    ).all()
    return list(reqs)


@router.post("/request-credits", response_model=CreditRequestResponse)
def request_credits(payload: CreditRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = CreditRequest(
        user_id=current_user.id,
        amount=payload.amount,
        reason=payload.reason,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    
    # Send email notification to admin
    send_credit_request_admin_email(current_user.email, payload.amount, payload.reason)
    
    return req


@router.post("/trade", response_model=PortfolioTransactionResponse)
def execute_trade(trade: PortfolioTradeRequest, db: Session = Depends(get_db)):
    quote = get_quote(trade.symbol, db)
    if not quote or not quote.price:
        raise HTTPException(status_code=400, detail="Cannot fetch current price for this symbol.")

    trade_price = quote.price  # always use real-time price

    item = db.scalar(
        select(PortfolioItem).where(
            PortfolioItem.user_id == trade.user_id,
            PortfolioItem.symbol == trade.symbol,
        )
    )

    if trade.action == "buy":
        if not item:
            item = PortfolioItem(
                user_id=trade.user_id,
                symbol=trade.symbol,
                shares=trade.shares,
                average_price=trade_price,
            )
            db.add(item)
        else:
            total_cost = (item.shares * item.average_price) + (trade.shares * trade_price)
            item.shares += trade.shares
            item.average_price = total_cost / item.shares

    elif trade.action == "sell":
        if not item or item.shares < trade.shares:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares. You hold {item.shares if item else 0} but tried to sell {trade.shares}.",
            )
        item.shares -= trade.shares
        if item.shares <= 0:
            db.delete(item)

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'buy' or 'sell'.")

    db.commit()

    transaction = PortfolioTransaction(
        user_id=trade.user_id,
        symbol=trade.symbol,
        action=trade.action,
        shares=trade.shares,
        price=trade_price,
        timestamp=utc_now(),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/{user_id}/transactions", response_model=list[PortfolioTransactionResponse])
def get_transactions(user_id: str, db: Session = Depends(get_db)):
    transactions = db.scalars(
        select(PortfolioTransaction)
        .where(PortfolioTransaction.user_id == user_id)
        .order_by(PortfolioTransaction.timestamp.desc())
    ).all()
    return list(transactions)


@router.get("/{user_id}")
def get_portfolio(user_id: str, db: Session = Depends(get_db)):
    items = db.scalars(select(PortfolioItem).where(PortfolioItem.user_id == user_id)).all()
    transactions = db.scalars(select(PortfolioTransaction).where(PortfolioTransaction.user_id == user_id)).all()

    cash_balance = 100_000.0
    for t in transactions:
        if t.action == "buy":
            cash_balance -= t.shares * t.price
        elif t.action == "credit":
            cash_balance += t.price
        else:  # sell
            cash_balance += t.shares * t.price

    positions = []
    total_positions_value = 0.0

    for item in items:
        quote = get_quote(item.symbol, db)
        current_price = quote.price if quote and quote.price else item.average_price

        pos_value = item.shares * current_price
        total_positions_value += pos_value

        unrealized_pl_pct = 0.0
        if item.average_price > 0:
            unrealized_pl_pct = ((current_price - item.average_price) / item.average_price) * 100

        positions.append({
            "symbol": item.symbol,
            "shares": item.shares,
            "average_cost": item.average_price,
            "current_price": current_price,
            "unrealized_pl_pct": unrealized_pl_pct,
        })

    total_value = cash_balance + total_positions_value
    total_return_pct = ((total_value - 100_000.0) / 100_000.0) * 100

    return {
        "cash_balance": cash_balance,
        "total_value": total_value,
        "total_return_pct": total_return_pct,
        "positions": positions,
    }
