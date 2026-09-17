from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stockvision.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


import uuid


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Watchlist(Base):
    __tablename__ = "watchlists"
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="uq_watchlists_user_ticker"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    ticker: Mapped[str] = mapped_column(String(32), index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_watchlist_user_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SavedBacktest(Base):
    __tablename__ = "saved_backtests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    ticker: Mapped[str] = mapped_column(String(32), index=True)
    strategy_type: Mapped[str] = mapped_column(String(64))
    parameters_json: Mapped[str] = mapped_column(Text)
    last_run_result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    
    # Modern schema columns
    ticker: Mapped[str] = mapped_column(String(32), index=True)
    condition_type: Mapped[str] = mapped_column(String(64))
    threshold_value: Mapped[float] = mapped_column(Float, default=0.0)
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Legacy columns kept in sync for database NOT NULL constraints
    symbol: Mapped[str | None] = mapped_column(String(32), nullable=True)
    alert_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    def __init__(self, **kwargs):
        sym = kwargs.get("ticker") or kwargs.get("symbol") or ""
        cond = kwargs.get("condition_type") or kwargs.get("alert_type") or "price_above"
        val = kwargs.get("threshold_value") if kwargs.get("threshold_value") is not None else kwargs.get("value", 0.0)
        trig = kwargs.get("is_triggered") if kwargs.get("is_triggered") is not None else (not kwargs.get("is_active", True))
        
        kwargs["ticker"] = sym
        kwargs["symbol"] = sym
        kwargs["condition_type"] = cond
        kwargs["alert_type"] = cond
        kwargs["threshold_value"] = float(val)
        kwargs["value"] = float(val)
        kwargs["is_triggered"] = bool(trig)
        kwargs["is_active"] = not bool(trig)
        super().__init__(**kwargs)


class CacheEntry(Base):
    __tablename__ = "cache_entries"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    payload: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SavedForecast(Base):
    __tablename__ = "saved_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    model: Mapped[str] = mapped_column(String(64))
    forecast_date: Mapped[str] = mapped_column(String(32), index=True)
    predicted_price: Mapped[float] = mapped_column(Float)
    actual_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


def init_db() -> None:
    from sqlalchemy import text, inspect
    Base.metadata.create_all(bind=engine)
    
    # Dynamic schema self-healing
    inspector = inspect(engine)
    try:
        if "saved_forecasts" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("saved_forecasts")]
            if "last_checked_at" not in columns:
                with engine.begin() as conn:
                    if DATABASE_URL.startswith("sqlite"):
                        conn.execute(text("ALTER TABLE saved_forecasts ADD COLUMN last_checked_at TIMESTAMP"))
                    else:
                        conn.execute(text("ALTER TABLE saved_forecasts ADD COLUMN last_checked_at TIMESTAMP WITH TIME ZONE"))
    except Exception as e:
        print(f"[Database Init] Saved forecasts schema check error: {e}")

    try:
        if "alerts" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("alerts")]
            with engine.begin() as conn:
                if "ticker" not in columns and "symbol" in columns:
                    conn.execute(text("ALTER TABLE alerts ADD COLUMN ticker VARCHAR(32)"))
                    conn.execute(text("UPDATE alerts SET ticker = symbol WHERE ticker IS NULL"))
                if "condition_type" not in columns and "alert_type" in columns:
                    conn.execute(text("ALTER TABLE alerts ADD COLUMN condition_type VARCHAR(64)"))
                    conn.execute(text("UPDATE alerts SET condition_type = alert_type WHERE condition_type IS NULL"))
                if "threshold_value" not in columns and "value" in columns:
                    conn.execute(text("ALTER TABLE alerts ADD COLUMN threshold_value FLOAT"))
                    conn.execute(text("UPDATE alerts SET threshold_value = value WHERE threshold_value IS NULL"))
                if "is_triggered" not in columns:
                    bool_default = "0" if DATABASE_URL.startswith("sqlite") else "FALSE"
                    conn.execute(text(f"ALTER TABLE alerts ADD COLUMN is_triggered BOOLEAN DEFAULT {bool_default}"))
                    if "is_active" in columns:
                        conn.execute(text("UPDATE alerts SET is_triggered = NOT is_active WHERE is_triggered IS NULL"))
    except Exception as e:
        print(f"[Database Init] Alerts schema self-healing error: {e}")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
