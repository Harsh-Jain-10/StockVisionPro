from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from services.analysis_service import compare_ai_summary, compare_symbols

router = APIRouter(prefix="/api", tags=["compare"])


@router.get("/compare")
def compare(
    symbols: str = Query("AAPL,MSFT,NVDA"),
    period: str = Query("3mo", description="History period: 1wk, 1mo, 3mo, 6mo"),
    db: Session = Depends(get_db)
) -> dict:
    return compare_symbols(symbols.split(","), db, period=period)


@router.get("/compare/summary")
def compare_summary(symbols: str = Query(...), db: Session = Depends(get_db)) -> dict:
    return compare_ai_summary(symbols.split(","), db)
