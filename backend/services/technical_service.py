from __future__ import annotations

import math
from typing import Any

import pandas as pd
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange, BollingerBands

from models.schemas import BollingerPoint, IndicatorPoint, MACDPoint, StochasticPoint, TechnicalSummary


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _point(date: Any, value: Any) -> IndicatorPoint:
    if isinstance(date, pd.Timestamp):
        date = date.to_pydatetime()
    return IndicatorPoint(date=date, value=_safe_float(value))


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    required = {"Date", "Open", "High", "Low", "Close", "Volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"History data is missing columns: {', '.join(sorted(missing))}")
    prepared = df.copy()
    prepared["Close"] = pd.to_numeric(prepared["Close"], errors="coerce")
    prepared["High"] = pd.to_numeric(prepared["High"], errors="coerce")
    prepared["Low"] = pd.to_numeric(prepared["Low"], errors="coerce")
    prepared["Volume"] = pd.to_numeric(prepared["Volume"], errors="coerce").fillna(0)
    prepared = prepared.dropna(subset=["Close", "High", "Low"])
    if prepared.empty:
        raise ValueError("History data has no usable price rows")
    return prepared


def rsi(df: pd.DataFrame, window: int = 14) -> pd.Series:
    prepared = _prepare(df)
    return RSIIndicator(prepared["Close"], window=window).rsi()


def macd(df: pd.DataFrame) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = MACD(prepared["Close"], window_slow=26, window_fast=12, window_sign=9)
    return pd.DataFrame(
        {
            "macd": indicator.macd(),
            "signal": indicator.macd_signal(),
            "histogram": indicator.macd_diff(),
        }
    )


def bollinger_bands(df: pd.DataFrame, window: int = 20, window_dev: int = 2) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = BollingerBands(prepared["Close"], window=window, window_dev=window_dev)
    return pd.DataFrame(
        {
            "upper": indicator.bollinger_hband(),
            "middle": indicator.bollinger_mavg(),
            "lower": indicator.bollinger_lband(),
            "width": indicator.bollinger_wband(),
        }
    )


def sma(df: pd.DataFrame, window: int) -> pd.Series:
    prepared = _prepare(df)
    return SMAIndicator(prepared["Close"], window=window).sma_indicator()


def ema(df: pd.DataFrame, window: int) -> pd.Series:
    prepared = _prepare(df)
    return EMAIndicator(prepared["Close"], window=window).ema_indicator()


def atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
    prepared = _prepare(df)
    return AverageTrueRange(prepared["High"], prepared["Low"], prepared["Close"], window=window).average_true_range()


def stochastic(df: pd.DataFrame, window: int = 14, smooth_window: int = 3) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = StochasticOscillator(
        high=prepared["High"],
        low=prepared["Low"],
        close=prepared["Close"],
        window=window,
        smooth_window=smooth_window,
    )
    return pd.DataFrame({"k": indicator.stoch(), "d": indicator.stoch_signal()})


def _series_points(df: pd.DataFrame, values: pd.Series) -> list[IndicatorPoint]:
    points: list[IndicatorPoint] = []
    for idx, value in values.items():
        points.append(_point(df.iloc[idx]["Date"], value))
    return points


def calculate_all(df: pd.DataFrame) -> dict[str, Any]:
    prepared = _prepare(df).reset_index(drop=True)
    rsi_series = rsi(prepared)
    macd_df = macd(prepared)
    bb_df = bollinger_bands(prepared)
    sma_20 = sma(prepared, 20)
    sma_50 = sma(prepared, 50)
    sma_200 = sma(prepared, 200)
    ema_12 = ema(prepared, 12)
    ema_26 = ema(prepared, 26)
    atr_series = atr(prepared)
    stoch_df = stochastic(prepared)

    latest = prepared.index[-1]
    summary = TechnicalSummary(
        rsi=_safe_float(rsi_series.iloc[latest]),
        macd=_safe_float(macd_df["macd"].iloc[latest]),
        macd_signal=_safe_float(macd_df["signal"].iloc[latest]),
        macd_histogram=_safe_float(macd_df["histogram"].iloc[latest]),
        bollinger_upper=_safe_float(bb_df["upper"].iloc[latest]),
        bollinger_middle=_safe_float(bb_df["middle"].iloc[latest]),
        bollinger_lower=_safe_float(bb_df["lower"].iloc[latest]),
        bollinger_width=_safe_float(bb_df["width"].iloc[latest]),
        sma_20=_safe_float(sma_20.iloc[latest]),
        sma_50=_safe_float(sma_50.iloc[latest]),
        sma_200=_safe_float(sma_200.iloc[latest]),
        ema_12=_safe_float(ema_12.iloc[latest]),
        ema_26=_safe_float(ema_26.iloc[latest]),
        atr=_safe_float(atr_series.iloc[latest]),
        stochastic_k=_safe_float(stoch_df["k"].iloc[latest]),
        stochastic_d=_safe_float(stoch_df["d"].iloc[latest]),
    )

    dates = prepared["Date"]
    macd_points = [
        MACDPoint(
            date=dates.iloc[idx].to_pydatetime() if isinstance(dates.iloc[idx], pd.Timestamp) else dates.iloc[idx],
            macd=_safe_float(row["macd"]),
            signal=_safe_float(row["signal"]),
            histogram=_safe_float(row["histogram"]),
        )
        for idx, row in macd_df.iterrows()
    ]
    bb_points = [
        BollingerPoint(
            date=dates.iloc[idx].to_pydatetime() if isinstance(dates.iloc[idx], pd.Timestamp) else dates.iloc[idx],
            upper=_safe_float(row["upper"]),
            middle=_safe_float(row["middle"]),
            lower=_safe_float(row["lower"]),
            width=_safe_float(row["width"]),
        )
        for idx, row in bb_df.iterrows()
    ]
    stoch_points = [
        StochasticPoint(
            date=dates.iloc[idx].to_pydatetime() if isinstance(dates.iloc[idx], pd.Timestamp) else dates.iloc[idx],
            k=_safe_float(row["k"]),
            d=_safe_float(row["d"]),
        )
        for idx, row in stoch_df.iterrows()
    ]

    return {
        "summary": summary,
        "series": {
            "rsi": _series_points(prepared, rsi_series),
            "macd": macd_points,
            "bollinger": bb_points,
            "sma20": _series_points(prepared, sma_20),
            "sma50": _series_points(prepared, sma_50),
            "sma200": _series_points(prepared, sma_200),
            "ema12": _series_points(prepared, ema_12),
            "ema26": _series_points(prepared, ema_26),
            "atr": _series_points(prepared, atr_series),
            "stochastic": stoch_points,
        },
    }
