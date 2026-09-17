from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, SavedForecast, CacheEntry
from models.schemas import ModelConfidenceResponse
from services.data_service import get_history_df
from services.forecasting_service import train_and_forecast, generate_technical_signal

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

class ForecastRunRequest(BaseModel):
    symbol: str
    model: Optional[str] = None
    horizon: int = 30

def update_opportunities_in_background():
    from models.database import SessionLocal, CacheEntry
    from services.data_service import get_history_df
    from services.forecasting_service import train_and_forecast
    import json
    from datetime import datetime, timezone, timedelta
    
    db = SessionLocal()
    try:
        cache_key = "forecast_opportunities"
        
        universe = [
            "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "NFLX", "AMD", "QCOM", 
            "AVGO", "JPM", "BAC", "V", "MA", "WMT", "MCD", "KO", "PEP", "NKE",
            "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", 
            "WIPRO.NS", "HINDUNILVR.NS", "BAJFINANCE.NS", "MARUTI.NS", "TITAN.NS", "LT.NS", 
            "SUNPHARMA.NS", "ULTRACEMCO.NS", "ASIANPAINT.NS", "TATAMOTORS.NS"
        ]
        
        bullish_opts = []
        bearish_opts = []
        
        for sym in universe:
            try:
                df = get_history_df(sym, "1y", db)
                res = train_and_forecast(df, "seasonal_trend", 30, db)
                
                current_price = res["historical"][-1]["close"]
                target_price = res["forecast"][-1]["base"]
                change_pct = ((target_price - current_price) / current_price) * 100
                
                opp = {
                    "symbol": sym,
                    "current_price": round(current_price, 2),
                    "expected_price": round(target_price, 2),
                    "expected_change_pct": round(change_pct, 2)
                }
                
                if change_pct > 0:
                    bullish_opts.append(opp)
                else:
                    bearish_opts.append(opp)
            except Exception as e:
                print(f"[Background Opportunities Scanner] Failed to scan {sym}: {e}")
                
        bullish_opts = sorted(bullish_opts, key=lambda x: x["expected_change_pct"], reverse=True)
        bearish_opts = sorted(bearish_opts, key=lambda x: x["expected_change_pct"])
        
        result = {
            "bullish": bullish_opts[:10],
            "bearish": bearish_opts[:10]
        }
        
        serialized = json.dumps(result)
        entry = db.get(CacheEntry, cache_key)
        if entry:
            entry.payload = serialized
            entry.expires_at = datetime.now(timezone.utc) + timedelta(hours=6)
        else:
            entry = CacheEntry(
                key=cache_key,
                payload=serialized,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=6)
            )
            db.add(entry)
        db.commit()
        print(f"[Background Opportunities Scanner] Successfully updated opportunities cache at {datetime.now(timezone.utc)}")
    except Exception as e:
        print(f"[Background Opportunities Scanner Error] Failed: {e}")
    finally:
        db.close()

@router.post("/run")
def run_forecast(payload: ForecastRunRequest, db: Session = Depends(get_db)):
    try:
        symbol = payload.symbol.upper()
        # Use 1y data to ensure we have sufficient data points (>= 20)
        df = get_history_df(symbol, "1y", db)
        res = train_and_forecast(df, payload.model, payload.horizon, db)
        
        # Save predictions in database to track accuracy history
        from sqlalchemy import select
        actual_model = res.get("selected_model", payload.model) or "seasonal_trend"
        for f in res["forecast"]:
            # Check if there is already an entry for this symbol, model, and date
            q = select(SavedForecast).where(
                SavedForecast.symbol == symbol,
                SavedForecast.model == actual_model,
                SavedForecast.forecast_date == f["date"]
            )
            existing = db.scalar(q)
            if not existing:
                entry = SavedForecast(
                    symbol=symbol,
                    model=actual_model,
                    forecast_date=f["date"],
                    predicted_price=f["base"]
                )
                db.add(entry)
        db.commit()
        
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
        res_90 = train_and_forecast(df, model, 90, db)
        
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
            "insights": res_90["insights"],
            "scenarios": res_90.get("scenarios"),
            "explanations": res_90.get("explanations"),
            "multifactor": res_90.get("multifactor"),
            "news_correlation": res_90.get("news_correlation")
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run forecast comparison: {str(exc)}")

@router.get("/signal-card")
def get_signal_card(
    symbol: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        symbol = symbol.upper()
        df = get_history_df(symbol, "1y", db)
        sig = generate_technical_signal(df)
        return sig
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate signal card: {str(exc)}")

@router.get("/opportunities")
def get_opportunities(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        import json
        from datetime import datetime, timezone, timedelta
        
        cache_key = "forecast_opportunities"
        entry = db.get(CacheEntry, cache_key)
        now_utc = datetime.now(timezone.utc)
        
        cache_stale = (not entry) or (entry.expires_at.replace(tzinfo=timezone.utc) < now_utc)
        
        if cache_stale:
            background_tasks.add_task(update_opportunities_in_background)
            
        if entry:
            return json.loads(entry.payload)
            
        # Quick synchronous scan for 5 major stocks if cache is completely empty
        quick_universe = ["AAPL", "MSFT", "NVDA", "RELIANCE.NS", "TCS.NS"]
        bullish_opts = []
        bearish_opts = []
        
        for sym in quick_universe:
            try:
                df = get_history_df(sym, "1y", db)
                res = train_and_forecast(df, "seasonal_trend", 30, db)
                
                current_price = res["historical"][-1]["close"]
                target_price = res["forecast"][-1]["base"]
                change_pct = ((target_price - current_price) / current_price) * 100
                
                opp = {
                    "symbol": sym,
                    "current_price": round(current_price, 2),
                    "expected_price": round(target_price, 2),
                    "expected_change_pct": round(change_pct, 2)
                }
                
                if change_pct > 0:
                    bullish_opts.append(opp)
                else:
                    bearish_opts.append(opp)
            except Exception:
                pass
                
        bullish_opts = sorted(bullish_opts, key=lambda x: x["expected_change_pct"], reverse=True)
        bearish_opts = sorted(bearish_opts, key=lambda x: x["expected_change_pct"])
        
        return {
            "bullish": bullish_opts,
            "bearish": bearish_opts
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to scan opportunities: {str(exc)}")

@router.get("/accuracy")
def get_accuracy_tracker(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import select
        from datetime import datetime, timezone, timedelta
        
        # Update elapsed saved forecasts where actual close price is still missing and last_checked_at is older than 24h
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        
        q_pending = select(SavedForecast).where(
            SavedForecast.actual_price == None,
            SavedForecast.forecast_date <= today_str,
            (SavedForecast.last_checked_at == None) | (SavedForecast.last_checked_at < one_day_ago)
        )
        pending = db.scalars(q_pending).all()
        
        if pending:
            from collections import defaultdict
            symbols_map = defaultdict(list)
            for p in pending:
                symbols_map[p.symbol].append(p)
                
            for symbol, entries in symbols_map.items():
                try:
                    df = get_history_df(symbol, "1mo", db)
                    df["DateStr"] = df["Date"].apply(lambda d: d.strftime("%Y-%m-%d") if isinstance(d, datetime) else str(d)[:10])
                    
                    for entry in entries:
                        entry.last_checked_at = datetime.now(timezone.utc)
                        row = df[df["DateStr"] == entry.forecast_date]
                        if not row.empty:
                            entry.actual_price = float(row.iloc[0]["Close"])
                        else:
                            # Forward-fill if weekend or market holiday
                            sorted_df = df.sort_values(by="DateStr")
                            closer_rows = sorted_df[sorted_df["DateStr"] <= entry.forecast_date]
                            if not closer_rows.empty:
                                entry.actual_price = float(closer_rows.iloc[-1]["Close"])
                except Exception as e:
                    print(f"[Accuracy Sync] Failed to update actuals for {symbol}: {e}")
                    for entry in entries:
                        entry.last_checked_at = datetime.now(timezone.utc)
                        
            db.commit()
            
        q_resolved = select(SavedForecast).where(
            SavedForecast.actual_price != None
        ).order_by(SavedForecast.forecast_date.desc()).limit(100)
        resolved = db.scalars(q_resolved).all()
        
        # Count forecasts saved but not yet elapsed (future dates waiting for actuals)
        q_pending_count = select(SavedForecast).where(
            SavedForecast.actual_price == None
        )
        pending_count = len(db.scalars(q_pending_count).all())
        
        items = []
        total_err_pct = 0.0
        count = 0
        
        for r in resolved:
            predicted = r.predicted_price
            actual = r.actual_price
            
            err = abs(actual - predicted)
            err_pct = (err / actual) * 100 if actual > 0 else 0.0
            accuracy_pct = max(0.0, 100.0 - err_pct)
            
            total_err_pct += err_pct
            count += 1
            
            items.append({
                "id": r.id,
                "symbol": r.symbol,
                "model": r.model,
                "date": r.forecast_date,
                "predicted": round(predicted, 2),
                "actual": round(actual, 2),
                "accuracy": round(accuracy_pct, 2)
            })
        
        # Return null accuracy when there is nothing evaluated yet (avoids misleading "100%")
        avg_accuracy = round(100.0 - (total_err_pct / count), 2) if count > 0 else None
        
        q_earliest_pending = select(SavedForecast.forecast_date).where(
            SavedForecast.actual_price == None
        ).order_by(SavedForecast.forecast_date.asc()).limit(1)
        earliest_pending = db.scalar(q_earliest_pending)
        
        return {
            "average_accuracy": avg_accuracy,
            "total_evaluated": count,
            "pending_count": pending_count,
            "earliest_pending_date": earliest_pending,
            "history": items
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accuracy history: {str(exc)}")


@router.get("/{symbol}/confidence", response_model=ModelConfidenceResponse)
def get_forecast_confidence(symbol: str, model: Optional[str] = None):
    """
    Returns the model's honest out-of-sample skill score vs. naive persistence for the ticker.
    skill_score = (1 - model_MAPE / naive_MAPE) * 100
    Derived from the multi-fold walk-forward validation with Newey-West HAC Diebold-Mariano tests
    and Benjamini-Hochberg FDR correction.
    """
    import json
    from pathlib import Path

    sym = symbol.upper().strip()
    data_path = Path(__file__).resolve().parent.parent / "data" / "walk_forward_results.json"

    benchmark_data = {}
    if data_path.exists():
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                benchmark_data = json.load(f)
        except Exception as e:
            print(f"[Forecast Confidence] Error reading benchmark data: {e}")

    if sym in benchmark_data:
        ticker_models = benchmark_data[sym]
        chosen_model = model if model and model in ticker_models else ("GradientBoosting" if "GradientBoosting" in ticker_models else list(ticker_models.keys())[0])
        entry = ticker_models[chosen_model]
        return ModelConfidenceResponse(
            symbol=sym,
            model=chosen_model,
            model_mape=entry.get("model_mape"),
            naive_mape=entry.get("naive_mape"),
            skill_score=entry.get("skill_score"),
            label=entry.get("label", "No validated edge"),
            is_statistically_significant=entry.get("fdr_significant", False),
            is_benchmarked=True,
            explanation=entry.get("explanation", "This forecast has not shown a statistically validated advantage over simply assuming tomorrow's price equals today's price."),
            model_r2=entry.get("model_r2"),
            naive_r2=entry.get("naive_r2"),
            dm_statistic=entry.get("dm_statistic"),
            p_value=entry.get("p_value"),
        )
    else:
        # Symbol is outside the 36-ticker benchmarked universe
        return ModelConfidenceResponse(
            symbol=sym,
            model=model or "GradientBoosting",
            model_mape=None,
            naive_mape=None,
            skill_score=None,
            label="Not yet validated for this ticker",
            is_statistically_significant=False,
            is_benchmarked=False,
            explanation="This ticker has not yet undergone the 2-year expanding-window walk-forward validation with multiple-testing correction. Rigorous out-of-sample benchmark results are currently available for the 36 core liquid equities.",
            model_r2=None,
            naive_r2=None,
            dm_statistic=None,
            p_value=None,
        )
