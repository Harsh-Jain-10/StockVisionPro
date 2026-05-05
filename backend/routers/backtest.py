from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import ta
from typing import Any
import math

from models.database import get_db
from models.schemas import BacktestRequest
from services.data_service import get_history_df

router = APIRouter(prefix="/api/backtest", tags=["Backtest"])


@router.post("/run")
def run_backtest(req: BacktestRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    # Use params from request with sensible defaults
    short_window = int(req.params.get("short_window", 20))
    long_window = int(req.params.get("long_window", 50))
    rsi_period = int(req.params.get("rsi_period", 14))
    rsi_overbought = float(req.params.get("overbought", 70))
    rsi_oversold = float(req.params.get("oversold", 30))

    slow_period = long_window if req.strategy == "sma_crossover" else rsi_period

    period = (req.period or "2y").lower()
    try:
        df = get_history_df(req.symbol, period, db)
        df = df.set_index(pd.to_datetime(df["Date"], utc=True)).sort_index()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Unable to load market data for backtest: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=404, detail="No historical data found for backtest.")

    # Data length guard
    if len(df) < slow_period + 10:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough data. Need at least {slow_period + 10} trading days, got {len(df)}. Try a longer period."
        )

    df.index = pd.to_datetime(df.index)

    initial_capital = 100_000.0
    capital = initial_capital
    position_shares = 0.0
    trades: list[dict] = []

    try:
        if req.strategy == "sma_crossover":
            df["sma_fast"] = ta.trend.sma_indicator(df["Close"], window=short_window)
            df["sma_slow"] = ta.trend.sma_indicator(df["Close"], window=long_window)

            for i in range(1, len(df)):
                if pd.isna(df["sma_slow"].iloc[i]) or pd.isna(df["sma_fast"].iloc[i]):
                    continue

                # Golden Cross → Buy
                if (
                    df["sma_fast"].iloc[i] > df["sma_slow"].iloc[i]
                    and df["sma_fast"].iloc[i - 1] <= df["sma_slow"].iloc[i - 1]
                ):
                    if capital > 0:
                        price = float(df["Close"].iloc[i])
                        shares_bought = capital / price
                        capital = 0.0
                        position_shares += shares_bought
                        trades.append({"type": "buy", "date": str(df.index[i].date()), "price": price, "shares": shares_bought, "value": shares_bought * price})

                # Death Cross → Sell
                elif (
                    df["sma_fast"].iloc[i] < df["sma_slow"].iloc[i]
                    and df["sma_fast"].iloc[i - 1] >= df["sma_slow"].iloc[i - 1]
                ):
                    if position_shares > 0:
                        price = float(df["Close"].iloc[i])
                        value = position_shares * price
                        capital += value
                        trades.append({"type": "sell", "date": str(df.index[i].date()), "price": price, "shares": position_shares, "value": value})
                        position_shares = 0.0

        elif req.strategy == "rsi_oversold":
            df["rsi"] = ta.momentum.rsi(df["Close"], window=rsi_period)

            for i in range(1, len(df)):
                if pd.isna(df["rsi"].iloc[i]):
                    continue
                # RSI crosses below oversold → Buy
                if df["rsi"].iloc[i] < rsi_oversold and df["rsi"].iloc[i - 1] >= rsi_oversold:
                    if capital > 0:
                        price = float(df["Close"].iloc[i])
                        shares_bought = capital / price
                        capital = 0.0
                        position_shares += shares_bought
                        trades.append({"type": "buy", "date": str(df.index[i].date()), "price": price, "shares": shares_bought, "value": shares_bought * price})
                # RSI crosses above overbought → Sell
                elif df["rsi"].iloc[i] > rsi_overbought and df["rsi"].iloc[i - 1] <= rsi_overbought:
                    if position_shares > 0:
                        price = float(df["Close"].iloc[i])
                        value = position_shares * price
                        capital += value
                        trades.append({"type": "sell", "date": str(df.index[i].date()), "price": price, "shares": position_shares, "value": value})
                        position_shares = 0.0
        else:
            raise HTTPException(status_code=400, detail="Unknown strategy. Use 'sma_crossover' or 'rsi_oversold'.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest strategy error: {str(e)}")

    # Close any open position at period end
    if position_shares > 0:
        price = float(df["Close"].iloc[-1])
        value = position_shares * price
        capital += value
        trades.append({"type": "sell", "date": str(df.index[-1].date()), "price": price, "shares": position_shares, "value": value})
        position_shares = 0.0

    total_return_pct = ((capital - initial_capital) / initial_capital) * 100

    # Win rate: count profitable round-trips
    winning_trades = 0
    round_trips = 0
    for i in range(0, len(trades) - 1, 2):
        if trades[i]["type"] == "buy" and i + 1 < len(trades) and trades[i + 1]["type"] == "sell":
            round_trips += 1
            if trades[i + 1]["price"] > trades[i]["price"]:
                winning_trades += 1
    win_rate = (winning_trades / round_trips * 100) if round_trips > 0 else 0.0

    # Build equity curve
    equity_curve: list[dict] = []
    running_capital = initial_capital
    running_shares = 0.0
    trade_events = {t["date"]: t for t in trades}

    for i in range(len(df)):
        date_str = str(df.index[i].date())
        price = float(df["Close"].iloc[i])
        if date_str in trade_events:
            ev = trade_events[date_str]
            if ev["type"] == "buy":
                running_shares = ev["shares"]
                running_capital = 0.0
            else:
                running_capital = ev["value"]
                running_shares = 0.0
        equity = running_capital + running_shares * price
        equity_curve.append({"date": date_str, "equity": round(equity, 2)})

    # Max drawdown
    peak = initial_capital
    max_drawdown_pct = 0.0
    for point in equity_curve:
        if point["equity"] > peak:
            peak = point["equity"]
        dd = (peak - point["equity"]) / peak * 100 if peak > 0 else 0
        if dd > max_drawdown_pct:
            max_drawdown_pct = dd

    # Sharpe Ratio (annualized, risk-free rate ~4%)
    sharpe_ratio = 0.0
    if len(equity_curve) > 1:
        returns = []
        for i in range(1, len(equity_curve)):
            prev = equity_curve[i-1]["equity"]
            curr = equity_curve[i]["equity"]
            if prev > 0:
                returns.append((curr - prev) / prev)
        if returns:
            avg_ret = sum(returns) / len(returns)
            std_ret = (sum((r - avg_ret) ** 2 for r in returns) / len(returns)) ** 0.5
            risk_free_daily = 0.04 / 252
            if std_ret > 0:
                sharpe_ratio = round(((avg_ret - risk_free_daily) / std_ret) * math.sqrt(252), 2)

    return {
        "symbol": req.symbol,
        "strategy": req.strategy,
        "period": req.period,
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        "total_return_pct": round(total_return_pct, 2),
        "win_rate": round(win_rate, 2),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "sharpe_ratio": sharpe_ratio,
        "total_trades": len(trades),
        "trades": trades,
        "equity_curve": equity_curve,
    }
