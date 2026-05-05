from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from services.analysis_service import chat_answer, ai_screener

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str
    symbols: list[str] = []


@router.post("/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> dict:
    return chat_answer(payload.message, payload.symbols, db)


@router.get("/screener")
def run_ai_screener(db: Session = Depends(get_db)) -> dict:
    """Fetch and analyze NSE universe stocks for bullish candidates."""
    return ai_screener(db)
