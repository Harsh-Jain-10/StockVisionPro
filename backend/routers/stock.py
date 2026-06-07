from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.schemas import CompanyInfo, HistoryResponse, Quote, SearchResult, TechnicalsResponse
from services.analysis_service import get_ai_summary, get_forecast, get_news, get_sentiment, get_signal
from services import technical_service
from services.data_service import get_company_info, get_history, get_history_df, get_quote, search_stocks

router = APIRouter(prefix="/api", tags=["stock"])


@router.get("/search", response_model=list[SearchResult])
def search(q: str = Query(..., min_length=1), limit: int = Query(12, ge=1, le=25)) -> list[SearchResult]:
    return search_stocks(q, limit=limit)


@router.get("/stock/{symbol}/quote", response_model=Quote)
def stock_quote(symbol: str, db: Session = Depends(get_db)) -> Quote:
    try:
        return get_quote(symbol, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch quote for {symbol}") from exc


@router.get("/stock/{symbol}/history", response_model=HistoryResponse)
def stock_history(
    symbol: str,
    period: str = Query("1y", description="yfinance period, e.g. 1d, 5d, 1mo, 1y, 5y, max"),
    db: Session = Depends(get_db),
) -> HistoryResponse:
    try:
        return get_history(symbol, period, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch history for {symbol}") from exc


@router.get("/stock/{symbol}/info", response_model=CompanyInfo)
def stock_info(symbol: str, db: Session = Depends(get_db)) -> CompanyInfo:
    try:
        return get_company_info(symbol, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch company info for {symbol}") from exc


@router.get("/stock/{symbol}/technicals", response_model=TechnicalsResponse)
def stock_technicals(
    symbol: str,
    period: str = Query("1y", description="Use at least 1y for SMA200"),
    db: Session = Depends(get_db),
) -> TechnicalsResponse:
    try:
        df = get_history_df(symbol, period, db)
        indicators = technical_service.calculate_all(df)
        return TechnicalsResponse(
            symbol=symbol.upper(),
            period=period.lower(),
            summary=indicators["summary"],
            series=indicators["series"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to calculate technicals for {symbol}") from exc


@router.get("/stock/{symbol}/forecast")
def stock_forecast(symbol: str, db: Session = Depends(get_db)) -> dict:
    try:
        return get_forecast(symbol, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to forecast {symbol}") from exc


@router.get("/stock/{symbol}/signal")
def stock_signal(symbol: str, db: Session = Depends(get_db)) -> dict:
    try:
        return get_signal(symbol, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to generate signal for {symbol}") from exc


@router.get("/stock/{symbol}/sentiment")
def stock_sentiment(symbol: str, db: Session = Depends(get_db)) -> dict:
    return get_sentiment(symbol, db)


@router.get("/stock/{symbol}/news")
def stock_news(symbol: str, db: Session = Depends(get_db)) -> list[dict]:
    return get_news(symbol, db)


@router.get("/stock/{symbol}/ai-summary")
def stock_ai_summary(symbol: str, db: Session = Depends(get_db)) -> dict:
    try:
        return get_ai_summary(symbol, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to generate AI summary for {symbol}") from exc
