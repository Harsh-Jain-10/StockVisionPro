from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    detail: str


class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None
    sector: str | None = None
    asset_type: str = "stock"


class Quote(BaseModel):
    symbol: str
    name: str | None = None
    price: float | None = None
    previous_close: float | None = None
    open: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    change: float | None = None
    change_pct: float | None = None
    volume: int | None = None
    market_cap: float | None = None
    currency: str | None = None
    exchange: str | None = None
    timestamp: datetime
    cached: bool = False


class OHLCV(BaseModel):
    date: datetime
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    adj_close: float | None = None
    volume: int | None = None


class HistoryResponse(BaseModel):
    symbol: str
    period: str
    rows: list[OHLCV]
    cached: bool = False


class CompanyInfo(BaseModel):
    symbol: str
    name: str | None = None
    description: str | None = None
    sector: str | None = None
    industry: str | None = None
    employees: int | None = None
    website: str | None = None
    country: str | None = None
    exchange: str | None = None
    market_cap: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    eps: float | None = None
    dividend_yield: float | None = None
    beta: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    cached: bool = False


class IndicatorPoint(BaseModel):
    date: datetime
    value: float | None = None


class MACDPoint(BaseModel):
    date: datetime
    macd: float | None = None
    signal: float | None = None
    histogram: float | None = None


class BollingerPoint(BaseModel):
    date: datetime
    upper: float | None = None
    middle: float | None = None
    lower: float | None = None
    width: float | None = None


class StochasticPoint(BaseModel):
    date: datetime
    k: float | None = None
    d: float | None = None


class TechnicalSummary(BaseModel):
    rsi: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    macd_histogram: float | None = None
    bollinger_upper: float | None = None
    bollinger_middle: float | None = None
    bollinger_lower: float | None = None
    bollinger_width: float | None = None
    sma_20: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    ema_12: float | None = None
    ema_26: float | None = None
    atr: float | None = None
    stochastic_k: float | None = None
    stochastic_d: float | None = None


class TechnicalsResponse(BaseModel):
    symbol: str
    period: str
    summary: TechnicalSummary
    series: dict[str, list[Any]] = Field(default_factory=dict)


class WatchlistCreate(BaseModel):
    user_id: str
    symbol: str


class WatchlistItemResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    name: str | None = None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    user_id: str
    symbol: str
    type: Literal["above", "below", "percent_change", "sma_crossover", "rsi_oversold", "rsi_overbought"]
    value: float


class AlertResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    alert_type: str
    value: float
    is_active: bool
    triggered_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertHistoryItem(BaseModel):
    id: int
    user_id: str
    symbol: str
    alert_type: str
    value: float
    is_active: bool
    triggered_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PortfolioItemResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    shares: float
    average_price: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioTradeRequest(BaseModel):
    user_id: str
    symbol: str
    action: Literal["buy", "sell"]
    shares: float
    price: float | None = None


class PortfolioTransactionResponse(BaseModel):
    id: int
    user_id: str
    symbol: str
    action: str
    shares: float
    price: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class BacktestRequest(BaseModel):
    symbol: str
    strategy: str
    period: str = "2y"
    params: dict = Field(default_factory=dict)


class BacktestTrade(BaseModel):
    type: str
    date: datetime
    price: float
    shares: float
    value: float


class BacktestResponse(BaseModel):
    symbol: str
    strategy: str
    period: str
    initial_capital: float
    final_capital: float
    total_return_pct: float
    win_rate_pct: float
    total_trades: int
    trades: list[BacktestTrade]
