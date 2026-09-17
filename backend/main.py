from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import select
from models.database import SessionLocal, init_db, Alert, utc_now
from routers import ai, alerts, auth, compare, market, saved_backtests, stock, watchlist, backtest, forecast

from services.data_service import get_quote, get_history_df

load_dotenv()

app = FastAPI(
    title="StockVision Pro API",
    description="Phase 1 backend foundation for real market data and technical indicators.",
    version="0.1.0",
)

cors_origins_raw = os.getenv("CORS_ORIGIN", "http://localhost:5173")
cors_origins = [o.strip() for o in cors_origins_raw.split(",")]
cors_origins += [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def check_alerts_loop() -> None:
    print("[Alerts Loop] Starting background alert checking loop...")
    while True:
        try:
            await asyncio.sleep(60)
            with SessionLocal() as db:
                active_alerts = db.scalars(
                    select(Alert).where(Alert.is_triggered == False)
                ).all()
                if not active_alerts:
                    continue
                
                from collections import defaultdict
                alerts_by_symbol = defaultdict(list)
                for a in active_alerts:
                    symbol_key = a.ticker or a.symbol
                    if symbol_key:
                        alerts_by_symbol[symbol_key].append(a)
                
                for symbol, symbol_alerts in alerts_by_symbol.items():
                    try:
                        quote = get_quote(symbol, db)
                        current_price = quote.price
                        if current_price is None:
                            continue

                        df = get_history_df(symbol, "1y", db)
                        from services.technical_service import calculate_all
                        indicators = calculate_all(df)
                        summary = indicators["summary"]
                        
                        for alert in symbol_alerts:
                            triggered = False
                            trigger_reason = ""
                            cond = alert.condition_type or alert.alert_type
                            val = alert.threshold_value if alert.threshold_value is not None else alert.value
                            
                            if cond in ("price_above", "above"):
                                if current_price > val:
                                    triggered = True
                                    trigger_reason = f"Price ${current_price:,.2f} crossed above threshold ${val:,.2f}"
                            elif cond in ("price_below", "below"):
                                if current_price < val:
                                    triggered = True
                                    trigger_reason = f"Price ${current_price:,.2f} crossed below threshold ${val:,.2f}"
                            elif cond == "sma_crossover":
                                if summary.sma_20 is not None and summary.sma_50 is not None:
                                    if summary.sma_20 > summary.sma_50:
                                        triggered = True
                                        trigger_reason = f"SMA 20 (${summary.sma_20:.2f}) crossed above SMA 50 (${summary.sma_50:.2f})"
                            elif cond in ("rsi_below", "rsi_oversold"):
                                threshold = val if val and val > 0 else 30.0
                                if summary.rsi is not None and summary.rsi < threshold:
                                    triggered = True
                                    trigger_reason = f"RSI is {summary.rsi:.2f} (Below {threshold:.0f})"
                            elif cond in ("rsi_above", "rsi_overbought"):
                                threshold = val if val and val > 0 else 70.0
                                if summary.rsi is not None and summary.rsi > threshold:
                                    triggered = True
                                    trigger_reason = f"RSI is {summary.rsi:.2f} (Above {threshold:.0f})"
                                    
                            if triggered:
                                alert.is_triggered = True
                                alert.triggered_at = utc_now()
                                db.commit()
                                print(f"[Alert Triggered] Alert ID: {alert.id} | Symbol: {symbol} | Reason: {trigger_reason}")
                    except Exception as e:
                        print(f"[Alerts Loop Error] Failed to process alerts for {symbol}: {e}")
        except Exception as e:
            print(f"[Alerts Loop Error] Loop encountered an error: {e}")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    asyncio.create_task(check_alerts_loop())


@app.get("/health")
def health() -> dict[str, str]:
    try:
        with SessionLocal() as db:
            db.execute(select(1))
        return {"status": "ok", "db": "connected", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        return {"status": "error", "db": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}

app.include_router(auth.router)
app.include_router(stock.router)
app.include_router(market.router)
app.include_router(watchlist.router)
app.include_router(alerts.router)
app.include_router(saved_backtests.router)
app.include_router(compare.router)
app.include_router(ai.router)
app.include_router(backtest.router)
app.include_router(forecast.router)


def _quote_payload(symbol: str) -> dict:
    with SessionLocal() as db:
        quote = get_quote(symbol, db)
        return quote.model_dump(mode="json")


@app.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket) -> None:
    await websocket.accept()
    symbols = ["AAPL", "MSFT", "NVDA", "BTC-USD"]
    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=0.1)
                if isinstance(message, dict) and isinstance(message.get("symbols"), list):
                    symbols = [str(symbol).upper() for symbol in message["symbols"]][:12]
            except asyncio.TimeoutError:
                pass

            quotes = []
            for symbol in symbols:
                try:
                    quotes.append(await asyncio.to_thread(_quote_payload, symbol))
                except Exception:
                    quotes.append({"symbol": symbol, "price": None, "change_pct": None})
            await websocket.send_json({"type": "prices", "data": quotes, "timestamp": datetime.now(timezone.utc).isoformat()})
            await asyncio.sleep(int(os.getenv("PRICE_REFRESH_SECONDS", "10")))
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close()
