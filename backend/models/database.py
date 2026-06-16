from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint, create_engine
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


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_watchlist_user_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    alert_type: Mapped[str] = mapped_column(String(32))
    value: Mapped[float] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CacheEntry(Base):
    __tablename__ = "cache_entries"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    payload: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="user")


class OTPCode(Base):
    __tablename__ = "otp_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code: Mapped[str] = mapped_column(String(6))


class CreditRequest(Base):
    __tablename__ = "credit_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    amount: Mapped[float] = mapped_column(Float)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # "pending", "approved", "rejected"
    admin_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_portfolio_user_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    shares: Mapped[float] = mapped_column(Float, default=0.0)
    average_price: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class PortfolioTransaction(Base):
    __tablename__ = "portfolio_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    action: Mapped[str] = mapped_column(String(10)) # "buy" or "sell"
    shares: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

from sqlalchemy import text

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    
    # Self-healing SQLite migrations to add new columns if they don't exist
    with engine.begin() as conn:


        # Check credit_requests table for admin_note
        try:
            conn.execute(text("SELECT admin_note FROM credit_requests LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE credit_requests ADD COLUMN admin_note VARCHAR(255) NULL"))
                print("[Migration] Added admin_note column to credit_requests table.")
            except Exception as e:
                print(f"[Migration Warning] Could not alter credit_requests admin_note: {e}")

        # Check credit_requests table for approved_at
        try:
            conn.execute(text("SELECT approved_at FROM credit_requests LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE credit_requests ADD COLUMN approved_at DATETIME NULL"))
                print("[Migration] Added approved_at column to credit_requests table.")
            except Exception as e:
                print(f"[Migration Warning] Could not alter credit_requests approved_at: {e}")

        # Check credit_requests table for approved_by
        try:
            conn.execute(text("SELECT approved_by FROM credit_requests LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE credit_requests ADD COLUMN approved_by VARCHAR(255) NULL"))
                print("[Migration] Added approved_by column to credit_requests table.")
            except Exception as e:
                print(f"[Migration Warning] Could not alter credit_requests approved_by: {e}")



def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
