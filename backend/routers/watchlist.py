from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import User, Watchlist, WatchlistItem, get_db
from models.schemas import WatchlistAddRequest, WatchlistCreate, WatchlistItemResponse, WatchlistResponseItem
from routers.auth import get_current_user
from services.data_service import get_quote, normalize_symbol
from services.stock_universe import STOCK_UNIVERSE

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


# ─────────────────────────────────────────────────────────────────────────────
# Scoped Per-User Endpoints (JWT Protected)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[dict[str, Any]])
def list_user_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Returns the logged-in user's personal watchlist with live quote & change."""
    items = db.scalars(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.added_at.desc())
    ).all()

    response = []
    for item in items:
        quote_data = None
        try:
            q = get_quote(item.ticker, db)
            quote_data = q.model_dump()
        except Exception:
            quote_data = None

        response.append({
            "id": item.id,
            "user_id": item.user_id,
            "ticker": item.ticker,
            "symbol": item.ticker,
            "name": STOCK_UNIVERSE.get(item.ticker),
            "added_at": item.added_at.isoformat(),
            "quote": quote_data,
        })
    return response


@router.post("", response_model=dict[str, Any])
def add_to_user_watchlist(
    payload: WatchlistAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Adds a ticker to the logged-in user's personal watchlist."""
    ticker = normalize_symbol(payload.ticker)
    if not ticker:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol.")

    count = db.scalar(
        select(Watchlist).where(Watchlist.user_id == current_user.id)
    )
    # Check if already exists
    existing = db.scalar(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == ticker,
        )
    )
    if existing:
        return {
            "id": existing.id,
            "user_id": existing.user_id,
            "ticker": existing.ticker,
            "added_at": existing.added_at.isoformat(),
            "status": "already_exists",
        }

    total_count = len(
        db.scalars(select(Watchlist).where(Watchlist.user_id == current_user.id)).all()
    )
    if total_count >= 50:
        raise HTTPException(status_code=400, detail="Watchlist limit is 50 symbols per account.")

    item = Watchlist(user_id=current_user.id, ticker=ticker)
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "user_id": item.user_id,
        "ticker": item.ticker,
        "symbol": item.ticker,
        "added_at": item.added_at.isoformat(),
        "status": "added",
    }


@router.delete("/{ticker}")
def delete_from_user_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Removes a ticker from the logged-in user's personal watchlist."""
    norm_ticker = normalize_symbol(ticker)
    item = db.scalar(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.ticker == norm_ticker,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Ticker not found in your watchlist.")

    db.delete(item)
    db.commit()
    return {"status": "deleted", "ticker": norm_ticker}


# ─────────────────────────────────────────────────────────────────────────────
# Legacy Endpoints (Maintained for Backward Compatibility)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/add", response_model=WatchlistItemResponse)
def add_item_legacy(payload: WatchlistCreate, db: Session = Depends(get_db)) -> WatchlistItem:
    symbol = normalize_symbol(payload.symbol)
    existing_count = db.query(WatchlistItem).filter(WatchlistItem.user_id == payload.user_id).count()
    if existing_count >= 50:
        raise HTTPException(status_code=400, detail="Watchlist limit reached.")
    existing = db.query(WatchlistItem).filter(WatchlistItem.user_id == payload.user_id, WatchlistItem.symbol == symbol).one_or_none()
    if existing:
        return existing
    item = WatchlistItem(user_id=payload.user_id, symbol=symbol, name=STOCK_UNIVERSE.get(symbol), position=existing_count)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{user_id}")
def list_items_legacy(user_id: str, db: Session = Depends(get_db)) -> list[dict]:
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).order_by(WatchlistItem.position).all()
    response = []
    for item in items:
        data = WatchlistItemResponse.model_validate(item).model_dump()
        try:
            data["quote"] = get_quote(item.symbol, db).model_dump()
        except Exception:
            data["quote"] = None
        response.append(data)
    return response


@router.delete("/{user_id}/{symbol}")
def delete_item_legacy(user_id: str, symbol: str, db: Session = Depends(get_db)) -> dict[str, str]:
    item = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id, WatchlistItem.symbol == normalize_symbol(symbol)).one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
