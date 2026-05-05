from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
import requests
import yfinance as yf
from sqlalchemy.orm import Session

from models.database import CacheEntry
from models.schemas import CompanyInfo, HistoryResponse, OHLCV, Quote, SearchResult
from services.stock_universe import SECTOR_HINTS, STOCK_UNIVERSE, infer_asset_type, infer_exchange

QUOTE_TTL_SECONDS = 10
HISTORY_TTL_HOURS = 24
INFO_TTL_DAYS = 7
VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YAHOO_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
SYMBOL_ALIASES: dict[str, list[str]] = {
    # Tata Motors old ticker now often resolves to split entities on providers.
    "TATAMOTORS.NS": ["TMPV.NS", "TMCV.NS", "TATAMTRDVR.NS", "TTM"],
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.isoformat()
    if pd.isna(value):
        return None
    return value


def _clean_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _clean_int(value: Any) -> int | None:
    number = _clean_float(value)
    return int(number) if number is not None else None


def _cache_get(db: Session, key: str) -> tuple[dict[str, Any], bool] | None:
    entry = db.get(CacheEntry, key)
    if not entry:
        return None
    expires_at = entry.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= _now():
        return None
    return json.loads(entry.payload), True


def _cache_set(db: Session, key: str, payload: dict[str, Any], ttl: timedelta) -> None:
    entry = db.get(CacheEntry, key)
    serialized = json.dumps(payload, default=_json_default)
    if entry:
        entry.payload = serialized
        entry.expires_at = _now() + ttl
    else:
        entry = CacheEntry(key=key, payload=serialized, expires_at=_now() + ttl)
        db.add(entry)
    db.commit()


def normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _symbol_candidates(symbol: str) -> list[str]:
    primary = normalize_symbol(symbol)
    aliases = [normalize_symbol(s) for s in SYMBOL_ALIASES.get(primary, [])]
    seen: set[str] = set()
    ordered: list[str] = []
    for candidate in [primary, *aliases]:
        if candidate and candidate not in seen:
            seen.add(candidate)
            ordered.append(candidate)
    return ordered


def search_stocks(query: str, limit: int = 12) -> list[SearchResult]:
    needle = query.strip().lower()
    if not needle:
        return []

    results: list[SearchResult] = []
    for symbol, name in STOCK_UNIVERSE.items():
        haystack = f"{symbol} {name}".lower()
        if needle in haystack:
            results.append(
                SearchResult(
                    symbol=symbol,
                    name=name,
                    exchange=infer_exchange(symbol),
                    sector=SECTOR_HINTS.get(symbol),
                    asset_type=infer_asset_type(symbol),
                )
            )
    return results[:limit]


def _history_dataframe(symbol: str, period: str) -> pd.DataFrame:
    try:
        return _history_dataframe_yahoo_chart(symbol, period)
    except Exception:
        pass

    ticker = yf.Ticker(symbol)
    try:
        df = ticker.history(period=period, auto_adjust=False)
        if not df.empty:
            return df.reset_index()
    except Exception:
        pass
    return _history_dataframe_yahoo_chart(symbol, period)


def _history_dataframe_yahoo_chart(symbol: str, period: str) -> pd.DataFrame:
    interval = "5m" if period == "1d" else "1d"
    response = requests.get(
        YAHOO_CHART_URL.format(symbol=symbol),
        params={"range": period, "interval": interval, "includePrePost": "false", "events": "div,splits"},
        headers=YAHOO_HEADERS,
        timeout=20,
    )
    if response.status_code == 404:
        raise ValueError(f"No historical data returned for {symbol}")
    response.raise_for_status()
    payload = response.json()
    chart_error = payload.get("chart", {}).get("error")
    if chart_error:
        raise ValueError(chart_error.get("description") or f"No historical data returned for {symbol}")
    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not result:
        raise ValueError(f"No historical data returned for {symbol}")

    timestamps = result.get("timestamp") or []
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    adj_close = ((result.get("indicators") or {}).get("adjclose") or [{}])[0].get("adjclose")
    if not timestamps or not quote:
        raise ValueError(f"No historical data returned for {symbol}")

    rows = []
    for idx, timestamp in enumerate(timestamps):
        close_value = (quote.get("close") or [None] * len(timestamps))[idx]
        if close_value is None:
            continue
        rows.append(
            {
                "Date": datetime.fromtimestamp(timestamp, tz=timezone.utc),
                "Open": (quote.get("open") or [None] * len(timestamps))[idx],
                "High": (quote.get("high") or [None] * len(timestamps))[idx],
                "Low": (quote.get("low") or [None] * len(timestamps))[idx],
                "Close": close_value,
                "Adj Close": adj_close[idx] if adj_close and idx < len(adj_close) else close_value,
                "Volume": (quote.get("volume") or [None] * len(timestamps))[idx],
            }
        )
    if not rows:
        raise ValueError(f"No historical data returned for {symbol}")
    return pd.DataFrame(rows)


def _chart_meta(symbol: str) -> dict[str, Any]:
    response = requests.get(
        YAHOO_CHART_URL.format(symbol=symbol),
        params={"range": "1d", "interval": "1d"},
        headers=YAHOO_HEADERS,
        timeout=20,
    )
    if response.status_code == 404:
        raise ValueError(f"No quote metadata returned for {symbol}")
    response.raise_for_status()
    payload = response.json()
    chart_error = payload.get("chart", {}).get("error")
    if chart_error:
        raise ValueError(chart_error.get("description") or f"No quote metadata returned for {symbol}")
    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not result:
        raise ValueError(f"No quote metadata returned for {symbol}")
    return result.get("meta") or {}


def _fast_info_get(fast_info: Any, key: str) -> Any:
    try:
        return fast_info.get(key)
    except Exception:
        try:
            return fast_info[key]
        except Exception:
            return None


def history_to_rows(df: pd.DataFrame) -> list[OHLCV]:
    rows: list[OHLCV] = []
    for record in df.to_dict(orient="records"):
        date_value = record.get("Date") or record.get("Datetime")
        if isinstance(date_value, pd.Timestamp):
            date_value = date_value.to_pydatetime()
        rows.append(
            OHLCV(
                date=date_value,
                open=_clean_float(record.get("Open")),
                high=_clean_float(record.get("High")),
                low=_clean_float(record.get("Low")),
                close=_clean_float(record.get("Close")),
                adj_close=_clean_float(record.get("Adj Close")),
                volume=_clean_int(record.get("Volume")),
            )
        )
    return rows


def _inject_live_row(symbol: str, period: str, rows: list[OHLCV], db: Session) -> list[OHLCV]:
    # Keep intraday mode untouched; for multi-day ranges append latest quote as today's point.
    if period == "1d" or not rows:
        return rows
    try:
        latest_row_date = rows[-1].date.date()
    except Exception:
        return rows
    today_utc = _now().date()
    if latest_row_date >= today_utc:
        return rows
    try:
        quote = get_quote(symbol, db)
    except Exception:
        return rows
    if quote.price is None:
        return rows
    live_row = OHLCV(
        date=_now(),
        open=quote.open or quote.price,
        high=quote.day_high or quote.price,
        low=quote.day_low or quote.price,
        close=quote.price,
        adj_close=quote.price,
        volume=quote.volume,
    )
    return [*rows, live_row]


def get_history(symbol: str, period: str, db: Session) -> HistoryResponse:
    requested_symbol = normalize_symbol(symbol)
    period = period.lower()
    if period not in VALID_PERIODS:
        raise ValueError(f"Unsupported period '{period}'")

    candidates = _symbol_candidates(requested_symbol)
    last_error: Exception | None = None
    for candidate in candidates:
        cache_key = f"history:{candidate}:{period}"
        cached = _cache_get(db, cache_key)
        if cached:
            payload, was_cached = cached
            response = HistoryResponse.model_validate({**payload, "cached": was_cached})
            response.symbol = requested_symbol
            response.rows = _inject_live_row(requested_symbol, period, response.rows, db)
            return response
        try:
            df = _history_dataframe(candidate, period)
        except Exception as exc:
            last_error = exc
            continue
        response = HistoryResponse(symbol=requested_symbol, period=period, rows=history_to_rows(df), cached=False)
        response.rows = _inject_live_row(requested_symbol, period, response.rows, db)
        _cache_set(db, cache_key, response.model_dump(), timedelta(hours=HISTORY_TTL_HOURS))
        return response
    if last_error:
        raise ValueError(str(last_error))
    raise ValueError(f"No historical data returned for {requested_symbol}")


def get_history_df(symbol: str, period: str, db: Session) -> pd.DataFrame:
    response = get_history(symbol, period, db)
    records = [row.model_dump() for row in response.rows]
    df = pd.DataFrame(records)
    if df.empty:
        raise ValueError(f"No historical data available for {symbol}")
    df = df.rename(
        columns={
            "date": "Date",
            "open": "Open",
            "high": "High",
            "low": "Low",
            "close": "Close",
            "adj_close": "Adj Close",
            "volume": "Volume",
        }
    )
    return df


def get_quote(symbol: str, db: Session) -> Quote:
    requested_symbol = normalize_symbol(symbol)
    candidates = _symbol_candidates(requested_symbol)
    last_error: Exception | None = None
    for candidate in candidates:
        cache_key = f"quote:{candidate}"
        cached = _cache_get(db, cache_key)
        if cached:
            payload, was_cached = cached
            quote = Quote.model_validate({**payload, "cached": was_cached})
            quote.symbol = requested_symbol
            return quote

        ticker = yf.Ticker(candidate)
        fast_info: Any = {}
        info: dict[str, Any] = {}
        meta: dict[str, Any] = {}

        try:
            meta = _chart_meta(candidate)
        except Exception:
            try:
                fast_info = ticker.fast_info
            except Exception:
                fast_info = {}

        price = _clean_float(meta.get("regularMarketPrice") or _fast_info_get(fast_info, "last_price"))
        previous_close = _clean_float(meta.get("chartPreviousClose") or meta.get("previousClose") or _fast_info_get(fast_info, "previous_close"))
        open_price = _clean_float(meta.get("regularMarketOpen") or _fast_info_get(fast_info, "open"))
        day_high = _clean_float(meta.get("regularMarketDayHigh") or _fast_info_get(fast_info, "day_high"))
        day_low = _clean_float(meta.get("regularMarketDayLow") or _fast_info_get(fast_info, "day_low"))
        try:
            if price is None:
                hist = _history_dataframe(candidate, "5d")
                latest = hist.iloc[-1]
                previous = hist.iloc[-2] if len(hist) > 1 else latest
                price = _clean_float(latest.get("Close"))
                previous_close = _clean_float(previous.get("Close"))
                open_price = _clean_float(latest.get("Open"))
                day_high = _clean_float(latest.get("High"))
                day_low = _clean_float(latest.get("Low"))
        except Exception as exc:
            last_error = exc
            continue
        if price is None:
            continue
        change = price - previous_close if price is not None and previous_close else None
        change_pct = (change / previous_close) * 100 if change is not None and previous_close else None

        response = Quote(
            symbol=requested_symbol,
            name=info.get("shortName") or info.get("longName") or meta.get("shortName") or meta.get("longName") or STOCK_UNIVERSE.get(requested_symbol),
            price=price,
            previous_close=previous_close,
            open=open_price,
            day_high=day_high,
            day_low=day_low,
            change=_clean_float(change),
            change_pct=_clean_float(change_pct),
            volume=_clean_int(_fast_info_get(fast_info, "last_volume") or info.get("volume") or info.get("regularMarketVolume") or meta.get("regularMarketVolume")),
            market_cap=_clean_float(_fast_info_get(fast_info, "market_cap") or info.get("marketCap")),
            currency=_fast_info_get(fast_info, "currency") or info.get("currency") or meta.get("currency"),
            exchange=info.get("exchange") or meta.get("exchangeName") or infer_exchange(requested_symbol),
            timestamp=_now(),
            cached=False,
        )
        _cache_set(db, cache_key, response.model_dump(), timedelta(seconds=QUOTE_TTL_SECONDS))
        return response

    if last_error:
        raise ValueError(str(last_error))
    raise ValueError(f"No quote data returned for {requested_symbol}")


def get_company_info(symbol: str, db: Session) -> CompanyInfo:
    symbol = normalize_symbol(symbol)
    cache_key = f"info:{symbol}"
    cached = _cache_get(db, cache_key)
    if cached:
        payload, was_cached = cached
        return CompanyInfo.model_validate({**payload, "cached": was_cached})

    meta: dict[str, Any] = {}
    try:
        meta = _chart_meta(symbol)
    except Exception:
        meta = {}
    if not meta and symbol not in STOCK_UNIVERSE:
        raise ValueError(f"No company info returned for {symbol}")

    try:
        quote = get_quote(symbol, db)
    except Exception:
        quote = None

    response = CompanyInfo(
        symbol=symbol,
        name=meta.get("longName") or meta.get("shortName") or (quote.name if quote else None) or STOCK_UNIVERSE.get(symbol),
        description=None,
        sector=SECTOR_HINTS.get(symbol),
        industry=None,
        employees=None,
        website=None,
        country=None,
        exchange=meta.get("exchangeName") or (quote.exchange if quote else None) or infer_exchange(symbol),
        market_cap=quote.market_cap if quote else None,
        trailing_pe=None,
        forward_pe=None,
        eps=None,
        dividend_yield=None,
        beta=None,
        fifty_two_week_high=_clean_float(meta.get("fiftyTwoWeekHigh")),
        fifty_two_week_low=_clean_float(meta.get("fiftyTwoWeekLow")),
        cached=False,
    )
    _cache_set(db, cache_key, response.model_dump(), timedelta(days=INFO_TTL_DAYS))
    return response
