from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db
from services.data_service import get_history_df
from services.forecasting_service import train_and_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

class ForecastRunRequest(BaseModel):
    symbol: str
    model: str
    horizon: int = 30

@router.post("/run")
def run_forecast(payload: ForecastRunRequest, db: Session = Depends(get_db)):
    try:
        symbol = payload.symbol.upper()
        # Use 1y data to ensure we have sufficient data points (>= 20)
        df = get_history_df(symbol, "1y", db)
        res = train_and_forecast(df, payload.model, payload.horizon)
        return res
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run forecast: {str(exc)}")

@router.get("/compare")
def compare_forecasts(
    symbol: str = Query(...),
    model: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        symbol = symbol.upper()
        df = get_history_df(symbol, "1y", db)
        
        # We run the forecasting model once for 90 days
        res_90 = train_and_forecast(df, model, 90)
        
        # Slices
        forecast_90 = res_90["forecast"]
        forecast_30 = forecast_90[:30]
        forecast_7 = forecast_90[:7]
        
        return {
            "symbol": symbol,
            "model": model,
            "metrics": res_90["metrics"],
            "historical": res_90["historical"],
            "forecast_7d": forecast_7,
            "forecast_30d": forecast_30,
            "forecast_90d": forecast_90,
            "insights": res_90["insights"]
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run forecast comparison: {str(exc)}")
