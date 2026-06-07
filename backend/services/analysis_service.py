from __future__ import annotations

import hashlib
import math
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session
from models.database import SessionLocal
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import yfinance as yf

from services import technical_service
from services.data_service import get_company_info, get_history_df, get_quote, search_stocks
from services.stock_universe import STOCK_UNIVERSE, infer_exchange

ECON_EVENTS = [
    {"date": "2026-05-06", "event": "Fed Interest Rate Decision"},
    {"date": "2026-05-07", "event": "US Non-Farm Payrolls"},
    {"date": "2026-05-08", "event": "US CPI YoY"},
    {"date": "2026-05-08", "event": "RBI Monetary Policy Decision"},
    {"date": "2026-05-14", "event": "India GDP Flash Estimate (Q4 FY26)"},
]


def _safe(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy().reset_index(drop=True)
    indicators = technical_service.calculate_all(enriched)
    series = indicators["series"]
    enriched["rsi"] = [p.value for p in series["rsi"]]
    enriched["sma20"] = [p.value for p in series["sma20"]]
    enriched["sma50"] = [p.value for p in series["sma50"]]
    enriched["ema12"] = [p.value for p in series["ema12"]]
    enriched["ema26"] = [p.value for p in series["ema26"]]
    enriched["macd"] = [p.macd for p in series["macd"]]
    enriched["bb_width"] = [p.width for p in series["bollinger"]]
    enriched["day_of_week"] = pd.to_datetime(enriched["Date"], utc=True).dt.dayofweek
    enriched["month"] = pd.to_datetime(enriched["Date"], utc=True).dt.month
    enriched["target"] = enriched["Close"].shift(-1)
    return enriched.dropna()


def get_forecast(symbol: str, db: Session) -> dict[str, Any]:
    df = get_history_df(symbol, "2y", db)
    features = build_features(df)
    latest_close = float(df["Close"].iloc[-1])
    if len(features) < 40:
        return _fallback_forecast(symbol, latest_close)

    columns = ["Close", "Volume", "sma20", "sma50", "rsi", "macd", "bb_width", "day_of_week", "month"]
    x = features[columns]
    y = features["target"]
    split = max(int(len(features) * 0.8), 1)
    model = RandomForestRegressor(n_estimators=80, random_state=42, min_samples_leaf=3)
    model.fit(x.iloc[:split], y.iloc[:split])
    if len(x.iloc[split:]) > 2:
        pred = model.predict(x.iloc[split:])
        baseline = y.iloc[split:].to_numpy()
        mae = float(np.mean(np.abs(pred - baseline)))
        confidence = max(35.0, min(92.0, 100.0 - (mae / max(latest_close, 1.0) * 450.0)))
    else:
        confidence = 60.0

    lr = LinearRegression()
    recent = df.tail(45).reset_index(drop=True)
    lr.fit(np.arange(len(recent)).reshape(-1, 1), recent["Close"].to_numpy())
    daily_trend = float(lr.coef_[0])
    volatility = float(df["Close"].pct_change().tail(30).std() or 0.015)
    return _scenario_forecast(symbol, latest_close, daily_trend, volatility, confidence)


def _fallback_forecast(symbol: str, latest_close: float) -> dict[str, Any]:
    return _scenario_forecast(symbol, latest_close, latest_close * 0.001, 0.02, 45.0)


def _scenario_forecast(symbol: str, latest_close: float, daily_trend: float, volatility: float, confidence: float) -> dict[str, Any]:
    today = datetime.now(timezone.utc).date()
    points = []
    for day in range(1, 31):
        base = latest_close + daily_trend * day
        spread = latest_close * volatility * math.sqrt(day)
        points.append(
            {
                "date": (today + timedelta(days=day)).isoformat(),
                "base": round(base, 2),
                "upper": round(base + spread, 2),
                "lower": round(max(base - spread, 0), 2),
            }
        )
    return {
        "symbol": symbol.upper(),
        "confidence": round(confidence, 1),
        "forecast_7d": points[:7],
        "forecast_30d": points,
        "scenarios": {
            "bull": round(points[-1]["upper"], 2),
            "base": round(points[-1]["base"], 2),
            "bear": round(points[-1]["lower"], 2),
        },
        "model": "RandomForestRegressor + trend regression",
    }


def get_signal(symbol: str, db: Session) -> dict[str, Any]:
    df = get_history_df(symbol, "1y", db)
    indicators = technical_service.calculate_all(df)
    summary = indicators["summary"]
    close = float(df["Close"].iloc[-1])
    checks = []
    score = 0

    def add(name: str, state: str, weight: int) -> None:
        nonlocal score
        score += weight
        checks.append({"name": name, "state": state, "weight": weight})

    if summary.rsi is not None:
        add("RSI", "bullish" if summary.rsi < 35 else "bearish" if summary.rsi > 70 else "neutral", 1 if summary.rsi < 35 else -1 if summary.rsi > 70 else 0)
    if summary.macd is not None and summary.macd_signal is not None:
        add("MACD", "bullish" if summary.macd > summary.macd_signal else "bearish", 1 if summary.macd > summary.macd_signal else -1)
    if summary.sma_50 is not None:
        add("SMA 50", "bullish" if close > summary.sma_50 else "bearish", 1 if close > summary.sma_50 else -1)
    if summary.bollinger_upper is not None and summary.bollinger_lower is not None:
        add("Bollinger Bands", "breakout" if close > summary.bollinger_upper else "oversold" if close < summary.bollinger_lower else "neutral", 1 if close < summary.bollinger_lower else -1 if close > summary.bollinger_upper else 0)
    volume = pd.to_numeric(df["Volume"], errors="coerce").fillna(0)
    if len(volume) > 20 and volume.iloc[-1] > volume.tail(20).mean() * 1.35:
        add("Volume Surge", "bullish", 1)

    action = "BUY" if score >= 2 else "SELL" if score <= -2 else "HOLD"
    return {"symbol": symbol.upper(), "signal": action, "score": score, "strength": max(1, min(5, abs(score) + 1)), "breakdown": checks}


def get_news(symbol: str, db: Session) -> list[dict[str, Any]]:
    ticker = yf.Ticker(symbol)
    try:
        yf_news = ticker.news
    except Exception:
        yf_news = []
        
    items = []
    analyzer = SentimentIntensityAnalyzer()
    
    for item in yf_news[:10]:
        # Robust fallback chain for title - yfinance changed its API structure
        content = item.get("content", {}) if isinstance(item.get("content"), dict) else {}
        title = (
            item.get("title")
            or content.get("title")
            or item.get("headline")
            or item.get("name")
            or content.get("summary")
            or ""
        )
        
        # Skip articles with no title
        if not title or title.strip() == "":
            continue
            
        publisher = (
            item.get("publisher")
            or content.get("provider", {}).get("displayName", "")
            or item.get("source", "Unknown")
            or "Financial News"
        )
        
        link = (
            item.get("link")
            or item.get("url")
            or content.get("canonicalUrl", {}).get("url", "")
            or content.get("clickThroughUrl", {}).get("url", "")
            or "#"
        )
        
        # Parse publish time
        pub_time = item.get("providerPublishTime") or item.get("published_at")
        if pub_time and isinstance(pub_time, (int, float)):
            try:
                pub_dt = datetime.fromtimestamp(pub_time, tz=timezone.utc).isoformat()
            except Exception:
                pub_dt = datetime.now(timezone.utc).isoformat()
        else:
            pub_dt = datetime.now(timezone.utc).isoformat()
        
        # Vader sentiment score (-1 to 1)
        vs = analyzer.polarity_scores(title)
        polarity = vs['compound']
        
        items.append(
            {
                "title": title,
                "source": publisher,
                "url": link,
                "published_at": pub_dt,
                "sentiment": "positive" if polarity > 0.05 else "negative" if polarity < -0.05 else "neutral",
                "score": round(polarity, 2),
            }
        )
    return items



def get_sentiment(symbol: str, db: Session) -> dict[str, Any]:
    items = get_news(symbol, db)
    if not items:
        return {
            "symbol": symbol.upper(),
            "score": 0.0,
            "positive_pct": 0.0,
            "negative_pct": 0.0,
            "neutral_pct": 100.0,
            "bullish_headlines": [],
            "bearish_headlines": [],
            "headlines": [],
        }
        
    positive = len([item for item in items if item["sentiment"] == "positive"])
    negative = len([item for item in items if item["sentiment"] == "negative"])
    neutral = len(items) - positive - negative
    total = len(items)
    
    score = sum(item["score"] for item in items) / total
    
    return {
        "symbol": symbol.upper(),
        "score": round(score, 2),
        "positive_pct": round(positive / total * 100, 1),
        "negative_pct": round(negative / total * 100, 1),
        "neutral_pct": round(neutral / total * 100, 1),
        "bullish_headlines": [item for item in items if item["sentiment"] == "positive"][:3],
        "bearish_headlines": [item for item in items if item["sentiment"] == "negative"][:3],
        "headlines": items,
    }


def get_ai_summary(symbol: str, db: Session) -> dict[str, Any]:
    quote = get_quote(symbol, db)
    signal = get_signal(symbol, db)
    sentiment = get_sentiment(symbol, db)
    forecast = get_forecast(symbol, db)
    summary = (
        f"{quote.name or quote.symbol} is trading near {quote.price} {quote.currency or ''}, with a "
        f"{quote.change_pct or 0:.2f}% latest move. The technical model currently reads {signal['signal']} "
        f"with {signal['strength']}/5 strength based on momentum, trend, volatility, and volume checks.\n\n"
        f"The 30-day base forecast is {forecast['scenarios']['base']}, with bull and bear ranges at "
        f"{forecast['scenarios']['bull']} and {forecast['scenarios']['bear']}. Confidence is "
        f"{forecast['confidence']}%, so position sizing should account for forecast uncertainty.\n\n"
        f"News sentiment is {sentiment['score']} overall. Treat this as a research assistant output, "
        "not financial advice; confirm catalysts, risk, and liquidity before trading."
    )
    return {"symbol": quote.symbol, "model": "StockVision local analyst", "summary": summary, "disclaimer": "Not financial advice."}


def compare_symbols(symbols: list[str], db: Session, period: str = "3mo") -> dict[str, Any]:
    # Map frontend short codes to yfinance periods
    period_map = {"1wk": "5d", "1mo": "1mo", "3mo": "3mo", "6mo": "6mo", "1y": "1y"}
    yf_period = period_map.get(period, period)
    
    symbols = [s.strip().upper() for s in symbols if s.strip()][:5]
    histories = {}
    for symbol in symbols:
        try:
            histories[symbol] = get_history_df(symbol, yf_period, db)
        except Exception:
            # Fallback window improves resilience when a specific range endpoint is flaky.
            try:
                histories[symbol] = get_history_df(symbol, "1mo", db)
            except Exception:
                pass
    
    normalized = []
    metrics = []
    returns: dict[str, list[float]] = {}
    for symbol, df in histories.items():
        if df is None or df.empty:
            continue
        closes = pd.to_numeric(df["Close"], errors="coerce").dropna()
        if closes.empty or float(closes.iloc[0]) == 0:
            continue
        base = float(closes.iloc[0])
        returns[symbol] = closes.pct_change().dropna().tail(120).tolist()
        for idx, row in df.reset_index(drop=True).iterrows():
            try:
                close_float = float(row["Close"])
                if math.isnan(close_float) or close_float == 0:
                    continue
            except (TypeError, ValueError):
                continue
            date_str = str(row["Date"])[:10]
            normalized.append({"date": date_str, "symbol": symbol, "value": round(close_float / base * 100, 2)})

    from datetime import datetime, timezone
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for symbol in symbols:
        try:
            quote = get_quote(symbol, db)
            metrics.append({"symbol": symbol, "price": quote.price, "change_pct": quote.change_pct, "market_cap": quote.market_cap, "volume": quote.volume})
            
            # Append today's live price to chart if history doesn't have it yet and base is available
            if symbol in histories and not histories[symbol].empty:
                base = float(histories[symbol].iloc[0]["Close"])
                if base > 0 and quote.price is not None:
                    # Check if we already have today's date in normalized for this symbol
                    has_today = any(n["symbol"] == symbol and n["date"] == today_str for n in normalized)
                    if not has_today:
                        normalized.append({"date": today_str, "symbol": symbol, "value": round(float(quote.price) / base * 100, 2)})
        except Exception:
            metrics.append({"symbol": symbol, "price": None, "change_pct": None, "market_cap": None, "volume": None})

    matrix = []
    for left in symbols:
        row = []
        for right in symbols:
            count = min(len(returns.get(left, [])), len(returns.get(right, [])))
            try:
                corr = statistics.correlation(returns[left][-count:], returns[right][-count:]) if count > 3 else 1.0
            except Exception:
                corr = 1.0
            row.append(round(corr, 3))
        matrix.append({"symbol": left, "values": row})
    return {"symbols": symbols, "normalized": normalized, "metrics": metrics, "correlation": matrix}


def compare_ai_summary(symbols: list[str], db: Session) -> dict[str, Any]:
    comparison = compare_symbols(symbols, db)
    metrics = comparison["metrics"]
    if len(metrics) < 2:
        return {
            "summary": "Add at least two symbols to unlock AI comparison insight.",
            "highlights": [],
            "events": [],
            "winner": None,
            "risk": "Insufficient comparison set",
        }

    ranked = sorted(metrics, key=lambda item: item.get("change_pct") or -999, reverse=True)
    strongest = ranked[0]
    weakest = ranked[-1]
    volume_leader = max(metrics, key=lambda item: item.get("volume") or 0)
    avg_change = sum((item.get("change_pct") or 0) for item in metrics) / len(metrics)

    highlights = [
        {"term": "Relative Strength", "text": f"{strongest['symbol']} leads the group with {strongest.get('change_pct') or 0:.2f}% latest change."},
        {"term": "Lagging Momentum", "text": f"{weakest['symbol']} is the weakest short-term mover at {weakest.get('change_pct') or 0:.2f}%."},
        {"term": "Liquidity Focus", "text": f"{volume_leader['symbol']} shows the highest reported volume in this set."},
        {"term": "Basket Tone", "text": f"The compared basket average move is {avg_change:.2f}%."},
    ]
    events = []
    for symbol in comparison["symbols"]:
        events.extend(get_news(symbol, db)[:2])

    summary = (
        f"Across {', '.join(comparison['symbols'])}, <mark>{strongest['symbol']}</mark> currently shows the strongest "
        f"relative move, while <mark>{weakest['symbol']}</mark> is lagging. The key event cluster is centered on "
        "<mark>earnings momentum</mark>, <mark>analyst rating changes</mark>, and <mark>institutional flows</mark>. "
        "Use the chart as relative-performance context, not a standalone trade signal."
    )
    return {
        "summary": summary,
        "highlights": highlights,
        "events": events[:6],
        "winner": strongest["symbol"],
        "risk": "Correlation and event sensitivity can rise during macro news, earnings weeks, and sector rotation.",
    }


def chat_answer(message: str, symbols: list[str], db: Session) -> dict[str, Any]:
    import re
    # Extract symbols from message
    message_lower = message.lower()
    detected_symbols = []
    
    # Check if a ticker is mentioned directly (e.g. AAPL, RELIANCE, RELIANCE.NS, TCS.NS)
    for sym, name in STOCK_UNIVERSE.items():
        sym_lower = sym.lower()
        base_sym = sym.split(".")[0].lower() if "." in sym else sym_lower
        name_lower = name.lower()
        
        # Exact symbol check (with word boundaries)
        if sym_lower.endswith("-usd"):
            crypto_base = sym_lower.split("-")[0]
            if re.search(r'\b' + re.escape(crypto_base) + r'\b', message_lower) or re.search(r'\b' + re.escape(sym_lower) + r'\b', message_lower):
                detected_symbols.append(sym)
                continue
        else:
            if re.search(r'\b' + re.escape(sym_lower) + r'\b', message_lower):
                detected_symbols.append(sym)
                continue
            if re.search(r'\b' + re.escape(base_sym) + r'\b', message_lower):
                detected_symbols.append(sym)
                continue
                
        # Check company name with word boundaries (e.g. "tata motors")
        escaped_name = re.escape(name_lower)
        if re.search(r'\b' + escaped_name + r'\b', message_lower):
            detected_symbols.append(sym)
            continue
            
        # Support partial name matches for names longer than 4 chars
        if len(name_lower) > 4:
            name_parts = [p for p in name_lower.split() if len(p) > 3]
            if name_parts and all(re.search(r'\b' + re.escape(part) + r'\b', message_lower) for part in name_parts):
                detected_symbols.append(sym)
                continue

    if detected_symbols:
        # Deduplicate while preserving order
        seen = set()
        clean_symbols = [x for x in detected_symbols if not (x in seen or seen.add(x))]
        primary = clean_symbols[0]
    else:
        clean_symbols = [symbol.strip().upper() for symbol in symbols if symbol.strip()][:5] or ["AAPL"]
        primary = clean_symbols[0]
    message_lower = message.lower()
    context = []
    quotes = {}
    signals = {}

    for symbol in clean_symbols:
        try:
            quote = get_quote(symbol, db)
            signal = get_signal(symbol, db)
            quotes[symbol] = quote
            signals[symbol] = signal
            context.append(
                f"{symbol}: price {quote.price} {quote.currency or ''}, change {quote.change_pct or 0:.2f}%, "
                f"signal {signal['signal']} ({signal['strength']}/5)"
            )
        except Exception:
            context.append(f"{symbol}: data unavailable right now")

    # Greeting handler
    greetings = ["hello", "hi", "hey", "good morning", "good evening", "what's up", "howdy"]
    if any(g in message_lower for g in greetings):
        q = quotes.get(primary)
        s = signals.get(primary)
        if q and s:
            price_str = f"${q.price:.2f}" if q.price else "N/A"
            chg = f"{q.change_pct:+.2f}%" if q.change_pct is not None else "flat"
            answer = (
                f"Hey! I'm tracking {primary} right now — trading at {price_str}, {chg} today, "
                f"with a {s['signal']} signal at {s['strength']}/5 strength. "
                f"I can show you forecasts, explain the RSI, compare with other stocks, or assess downside risk. What would you like to know?"
            )
        else:
            answer = f"Hey! I'm StockVision AI. I can help you analyze {primary} — signals, forecasts, risk, or comparisons. What would you like to know?"

    elif any(token in message_lower for token in ["calendar", "event", "econ", "fomc", "cpi", "payroll"]):
        upcoming = "\n".join(f"- {item['date']}: {item['event']}" for item in ECON_EVENTS[:5])
        answer = (
            "Upcoming macro events to track:\n"
            f"{upcoming}\n\n"
            "Open the Econ Calendar tab for the full schedule and impact levels."
        )

    elif "compare" in message_lower or len(clean_symbols) > 1:
        comparison = compare_ai_summary(clean_symbols, db)
        answer = f"{comparison['summary']} Key risk: {comparison['risk']}"

    elif "forecast" in message_lower or "predict" in message_lower or "target" in message_lower:
        try:
            fc = get_forecast(primary, db)
            base = fc["scenarios"]["base"]
            bull = fc["scenarios"]["bull"]
            bear = fc["scenarios"]["bear"]
            conf = fc["confidence"]
            answer = (
                f"The 30-day forecast for {primary} shows a base target of ${base:.2f}, "
                f"with a bull scenario at ${bull:.2f} and bear at ${bear:.2f}. "
                f"Model confidence: {conf:.0f}%. Use this as directional context, not a price guarantee."
            )
        except Exception:
            answer = f"I couldn't compute a fresh forecast for {primary} right now. Try refreshing."

    elif "signal" in message_lower or "buy" in message_lower or "sell" in message_lower:
        s = signals.get(primary)
        q = quotes.get(primary)
        if s and q:
            breakdown = ", ".join(f"{b['name']}: {b['state']}" for b in s.get("breakdown", []))
            price_disp = f"${q.price:.2f}" if q.price is not None else "N/A"
            answer = (
                f"{primary} currently shows a {s['signal']} signal ({s['strength']}/5 strength). "
                f"Breakdown — {breakdown}. "
                f"Price is {price_disp}, {q.change_pct:+.2f}% today. "
                "This is the model's read, not a trade recommendation."
            )
        else:
            answer = f"Signal data for {primary} is not available right now. Check that the backend is running."

    elif "rsi" in message_lower or "oversold" in message_lower or "overbought" in message_lower:
        try:
            from services import technical_service
            df = get_history_df(primary, "1y", db)
            indicators = technical_service.calculate_all(df)
            rsi = indicators["summary"].rsi
            if rsi is not None:
                zone = "oversold (potential bounce zone)" if rsi < 30 else "overbought (watch for reversal)" if rsi > 70 else "neutral territory"
                answer = f"{primary}'s RSI is currently {rsi:.1f} — that's {zone}. RSI under 30 is a classic oversold signal; above 70 suggests overextension."
            else:
                answer = f"RSI couldn't be calculated for {primary} at this time."
        except Exception:
            answer = f"Couldn't fetch RSI data for {primary} right now."

    elif "risk" in message_lower or "downside" in message_lower:
        answer = (
            f"Key risks to watch for {primary}: earnings/news catalysts, macro data surprises, "
            "liquidity gaps, and whether the current signal aligns with your timeframe. "
            "Always check the bull/bear forecast range alongside signal strength before sizing a position."
        )
    elif "sentiment" in message_lower or "news" in message_lower:
        try:
            sent = get_sentiment(primary, db)
            answer = (
                f"{primary} news sentiment is scoring {sent['score']:.2f} overall — "
                f"{sent['positive_pct']:.0f}% positive, {sent['neutral_pct']:.0f}% neutral, {sent['negative_pct']:.0f}% negative across recent headlines."
            )
        except Exception:
            answer = f"Sentiment data for {primary} isn't available right now."
    else:
        # Generic context dump, made readable
        q = quotes.get(primary)
        s = signals.get(primary)
        if q and s:
            price_disp = f"${q.price:.2f}" if q.price is not None else "N/A"
            answer = (
                f"{primary} is at {price_disp} ({q.change_pct:+.2f}% today), "
                f"signal: {s['signal']} with {s['strength']}/5 strength. "
                "You can ask me about forecasts, RSI, risk, macro events, or to compare with another stock."
            )
        else:
            answer = "Here is the current StockVision readout: " + " | ".join(context)

    return {
        "answer": answer,
        "symbols": clean_symbols,
        "context": context,
        "disclaimer": "AI assistant output is for research only. Not financial advice.",
    }



def market_overview(db: Session) -> dict[str, Any]:
    symbols = ["^GSPC", "^IXIC", "^DJI", "^NSEI", "^BSESN", "GLD", "BTC-USD"]
    indices = []
    for symbol in symbols:
        try:
            quote = get_quote(symbol, db)
            indices.append(quote.model_dump())
        except Exception:
            indices.append({"symbol": symbol, "name": STOCK_UNIVERSE.get(symbol), "price": None, "change_pct": None})
    universe = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "RELIANCE.NS", "TCS.NS", "INFY.NS"]
    movers = []
    for symbol in universe:
        try:
            q = get_quote(symbol, db)
            movers.append({"symbol": symbol, "name": q.name, "price": q.price, "change_pct": q.change_pct, "volume": q.volume})
        except Exception:
            continue
    movers_sorted = sorted(movers, key=lambda item: item.get("change_pct") or 0, reverse=True)
    sectors = [
        {"sector": "Technology", "change_pct": 1.4},
        {"sector": "Financials", "change_pct": -0.3},
        {"sector": "Energy", "change_pct": 0.8},
        {"sector": "Healthcare", "change_pct": -0.1},
        {"sector": "Consumer", "change_pct": 0.5},
        {"sector": "Crypto", "change_pct": next((m["change_pct"] for m in movers if m["symbol"] == "BTC-USD"), 0)},
    ]
    return {
        "indices": indices,
        "top_gainers": movers_sorted[:5],
        "top_losers": list(reversed(movers_sorted[-5:])),
        "most_active": sorted(movers, key=lambda item: item.get("volume") or 0, reverse=True)[:5],
        "sectors": sectors,
        "fear_greed": 58,
        "global_markets": [
            {"market": "United States", "status": "Open/Closed by exchange hours", "benchmark": "^GSPC"},
            {"market": "India", "status": "Open/Closed by exchange hours", "benchmark": "^NSEI"},
            {"market": "Crypto", "status": "Open 24/7", "benchmark": "BTC-USD"},
        ],
    }


def screener(filters: dict[str, Any], db: Session) -> dict[str, Any]:
    query = str(filters.get("q") or "")
    candidates = search_stocks(query, 100) if query else [type("Obj", (), {"symbol": s, "name": n, "exchange": infer_exchange(s)}) for s, n in STOCK_UNIVERSE.items()]
    rows = []
    for item in candidates[:80]:
        try:
            quote = get_quote(item.symbol, db)
            rows.append({"symbol": item.symbol, "name": item.name, "exchange": item.exchange, "price": quote.price, "change_pct": quote.change_pct, "volume": quote.volume})
        except Exception:
            rows.append({"symbol": item.symbol, "name": item.name, "exchange": item.exchange, "price": None, "change_pct": None, "volume": None})
    return {"results": rows}


NSE_UNIVERSE = [
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
    'WIPRO.NS', 'BAJFINANCE.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'MARUTI.NS',
    'LTIM.NS', 'HINDUNILVR.NS', 'ONGC.NS', 'NTPC.NS', 'POWERGRID.NS',
    'COALINDIA.NS', 'SBIN.NS', 'AXISBANK.NS', 'NESTLEIND.NS', 'TITAN.NS'
]


def money_py(val: float | None) -> str:
    if val is None:
        return "N/A"
    return f"${val:,.2f}"


def ai_screener(db: Session, q: str | None = None) -> dict[str, Any]:
    """Fetch technical data for NSE/searched universe and analyze for bullish candidates."""
    import concurrent.futures

    # 1. Determine targets to scan
    target_symbols = []
    if q and q.strip():
        # Search for matching symbols
        candidates = search_stocks(q.strip(), limit=10)
        target_symbols = [c.symbol for c in candidates]
        
    if not target_symbols:
        # Default to NSE universe if no query or no query matches
        target_symbols = NSE_UNIVERSE

    # 2. Worker function to process each stock
    def process_symbol(symbol: str) -> dict[str, Any] | None:
        with SessionLocal() as thread_db:
            try:
                quote = get_quote(symbol, thread_db)
                df = get_history_df(symbol, "3mo", thread_db)
                
                import ta as _ta
                rsi = float(_ta.momentum.rsi(df["Close"], window=14).iloc[-1]) if len(df) > 14 else None
                macd_obj = _ta.trend.MACD(df["Close"])
                macd = float(macd_obj.macd().iloc[-1]) if len(df) > 26 else None
                macd_signal = float(macd_obj.macd_signal().iloc[-1]) if len(df) > 26 else None
                
                return {
                    "symbol": symbol,
                    "price": quote.price,
                    "change_pct": quote.change_pct,
                    "rsi": round(rsi, 1) if rsi is not None else None,
                    "macd": round(macd, 4) if macd is not None else None,
                    "macd_signal": round(macd_signal, 4) if macd_signal is not None else None,
                    "volume": quote.volume,
                }
            except Exception:
                return None

    # 3. Scan symbols in parallel using ThreadPoolExecutor
    stock_data = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_symbol, s): s for s in target_symbols}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                stock_data.append(res)

    # 4. Score each stock for bullishness
    scored = []
    for s in stock_data:
        score = 0
        if s.get("change_pct") and s["change_pct"] > 0:
            score += 1
        if s.get("rsi") and 30 < s["rsi"] < 65:
            score += 1
        if s.get("macd") and s.get("macd_signal") and s["macd"] > s["macd_signal"]:
            score += 1
        scored.append({**s, "score": score})

    # Sort by score desc then change_pct
    scored.sort(key=lambda x: (x["score"], x.get("change_pct") or 0), reverse=True)
    
    # We will display the top scanned/bullish stocks
    top_bullish = scored[:5]

    # 5. Build HTML-styled AI analysis text
    analysis_parts = []
    for i, s in enumerate(top_bullish, 1):
        reasons = []
        if s.get("change_pct") is not None:
            if s["change_pct"] > 0:
                reasons.append(f"up <span class='positive'>+{s['change_pct']:.2f}%</span> today")
            else:
                reasons.append(f"down <span class='negative'>{s['change_pct']:.2f}%</span> today")
                
        if s.get("rsi"):
            if s["rsi"] < 35:
                reasons.append(f"RSI is <span class='positive'>{s['rsi']:.1f}</span> (oversold zone, high bounce probability)")
            elif s["rsi"] < 50:
                reasons.append(f"RSI is at {s['rsi']:.1f} (room to run)")
            elif s["rsi"] < 65:
                reasons.append(f"RSI is at {s['rsi']:.1f} (healthy momentum)")
            else:
                reasons.append(f"RSI is at <span class='negative'>{s['rsi']:.1f}</span> (overextended)")
                
        if s.get("macd") and s.get("macd_signal"):
            if s["macd"] > s["macd_signal"]:
                reasons.append("MACD shows a <span class='positive'>bullish crossover</span> (above signal line)")
            else:
                reasons.append("MACD shows <span class='negative'>bearish convergence</span> (below signal line)")

        reason_str = ", ".join(reasons) if reasons else "consolidating with standard technical metrics"
        analysis_parts.append(
            f"<li><strong>{s['symbol']}</strong> — {reason_str}. "
            f"Last Price: <code>{money_py(s['price'])}</code>.</li>"
        )

    if analysis_parts:
        analysis_text = f"<ol class='ai-list'>{''.join(analysis_parts)}</ol>"
    else:
        analysis_text = "<p>No strongly bullish signals detected in the scanned selection at this time. Consider screening different symbols or sectors.</p>"

    disclaimer = "<p class='ai-disclaimer'><em>*AI-generated analysis for research purposes only. Not financial advice.*</em></p>"

    return {
        "stocks": scored,
        "analysis": analysis_text + disclaimer,
        "total_scanned": len(stock_data),
    }

