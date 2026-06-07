from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from services.analysis_service import market_overview, screener

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/overview")
def overview(db: Session = Depends(get_db)) -> dict:
    return market_overview(db)


@router.get("/sectors")
def sectors(db: Session = Depends(get_db)) -> list[dict]:
    return market_overview(db)["sectors"]


@router.get("/screener")
def run_screener(q: str = Query("", description="Optional symbol/name query"), db: Session = Depends(get_db)) -> dict:
    return screener({"q": q}, db)
