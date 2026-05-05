from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models.database import SessionLocal, init_db
from routers import ai, alerts, compare, market, stock, watchlist, portfolio, backtest
from services.data_service import get_quote

load_dotenv()

app = FastAPI(
    title="StockVision Pro API",
    description="Phase 1 backend foundation for real market data and technical indicators.",
    version="0.1.0",
)

cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        cors_origin,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


app.include_router(stock.router)
app.include_router(market.router)
app.include_router(watchlist.router)
app.include_router(alerts.router)
app.include_router(compare.router)
app.include_router(ai.router)
app.include_router(portfolio.router)
app.include_router(backtest.router)


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
