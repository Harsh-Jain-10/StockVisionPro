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


# Common weak passwords list for validation
COMMON_PASSWORDS = {
    "password", "12345678", "123456789", "1234567890", "qwerty123", "password123",
    "admin123", "welcome1", "iloveyou", "letmein1", "abc12345", "monkey123",
    "dragon123", "baseball", "football", "trustno1", "master123", "sunshine1"
}


class UserRegister(BaseModel):
    email: str
    password: str

    def validate_credentials(self) -> None:
        email_clean = self.email.strip().lower()
        if "@" not in email_clean or "." not in email_clean.split("@")[-1]:
            raise ValueError("Invalid email format.")
        if len(self.password) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isalpha() for c in self.password):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in self.password):
            raise ValueError("Password must contain at least one number.")
        if self.password.lower() in COMMON_PASSWORDS:
            raise ValueError("This password is too common. Please choose a stronger password.")


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: str = "user"
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int = 1800


class WatchlistAddRequest(BaseModel):
    ticker: str


class WatchlistResponseItem(BaseModel):
    id: int
    user_id: str
    ticker: str
    name: str | None = None
    added_at: datetime
    quote: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class SavedBacktestCreate(BaseModel):
    ticker: str
    strategy_type: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    last_run_result: dict[str, Any] | None = None


class SavedBacktestResponse(BaseModel):
    id: int
    user_id: str
    ticker: str
    strategy_type: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    last_run_result: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertCreateScoped(BaseModel):
    ticker: str
    condition_type: Literal["price_above", "price_below", "rsi_above", "rsi_below", "sma_crossover"]
    threshold_value: float = 0.0


class AlertScopedResponse(BaseModel):
    id: int
    user_id: str
    ticker: str
    condition_type: str
    threshold_value: float
    is_triggered: bool
    created_at: datetime
    triggered_at: datetime | None = None

    model_config = {"from_attributes": True}


class ModelConfidenceResponse(BaseModel):
    symbol: str
    model: str
    model_mape: float | None = None
    naive_mape: float | None = None
    skill_score: float | None = None
    label: str
    is_statistically_significant: bool = False
    is_benchmarked: bool = True
    explanation: str
    model_r2: float | None = None
    naive_r2: float | None = None
    dm_statistic: float | None = None
    p_value: float | None = None
