from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import WatchlistItem, get_db
from models.schemas import WatchlistCreate, WatchlistItemResponse
from services.data_service import get_quote, normalize_symbol
from services.stock_universe import STOCK_UNIVERSE

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.post("/add", response_model=WatchlistItemResponse)
def add_item(payload: WatchlistCreate, db: Session = Depends(get_db)) -> WatchlistItem:
    symbol = normalize_symbol(payload.symbol)
    existing_count = db.query(WatchlistItem).filter(WatchlistItem.user_id == payload.user_id).count()
    if existing_count >= 20:
        raise HTTPException(status_code=400, detail="Watchlist limit is 20 symbols")
    existing = db.query(WatchlistItem).filter(WatchlistItem.user_id == payload.user_id, WatchlistItem.symbol == symbol).one_or_none()
    if existing:
        return existing
    item = WatchlistItem(user_id=payload.user_id, symbol=symbol, name=STOCK_UNIVERSE.get(symbol), position=existing_count)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{user_id}")
def list_items(user_id: str, db: Session = Depends(get_db)) -> list[dict]:
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
def delete_item(user_id: str, symbol: str, db: Session = Depends(get_db)) -> dict[str, str]:
    item = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id, WatchlistItem.symbol == normalize_symbol(symbol)).one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
