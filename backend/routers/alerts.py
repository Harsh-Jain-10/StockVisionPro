from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import Alert, User, get_db
from models.schemas import AlertCreate, AlertCreateScoped, AlertResponse, AlertScopedResponse
from routers.auth import get_current_user
from services.data_service import normalize_symbol

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ─────────────────────────────────────────────────────────────────────────────
# Scoped Per-User Endpoints (JWT Protected)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[dict[str, Any]])
def list_user_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Returns all alerts configured by the logged-in user."""
    alerts = db.scalars(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    ).all()

    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "ticker": a.ticker,
            "symbol": a.ticker,
            "condition_type": a.condition_type,
            "alert_type": a.condition_type,
            "threshold_value": a.threshold_value,
            "value": a.threshold_value,
            "is_triggered": a.is_triggered,
            "is_active": not a.is_triggered,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts
    ]


@router.post("", response_model=dict[str, Any])
def create_user_alert(
    payload: AlertCreateScoped,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Creates a new threshold alert for the logged-in user."""
    ticker = normalize_symbol(payload.ticker)
    if not ticker:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol.")

    valid_conditions = {"price_above", "price_below", "rsi_above", "rsi_below", "sma_crossover"}
    if payload.condition_type not in valid_conditions:
        raise HTTPException(
            status_code=400,
            detail=f"Condition must be one of: {', '.join(sorted(valid_conditions))}",
        )

    alert = Alert(
        user_id=current_user.id,
        ticker=ticker,
        condition_type=payload.condition_type,
        threshold_value=payload.threshold_value,
        is_triggered=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return {
        "id": alert.id,
        "user_id": alert.user_id,
        "ticker": alert.ticker,
        "symbol": alert.ticker,
        "condition_type": alert.condition_type,
        "alert_type": alert.condition_type,
        "threshold_value": alert.threshold_value,
        "value": alert.threshold_value,
        "is_triggered": alert.is_triggered,
        "is_active": not alert.is_triggered,
        "created_at": alert.created_at.isoformat(),
        "status": "created",
    }


@router.get("/triggered", response_model=list[dict[str, Any]])
def list_triggered_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Returns triggered alerts for the logged-in user to drive in-app notification badges."""
    triggered = db.scalars(
        select(Alert)
        .where(
            Alert.user_id == current_user.id,
            Alert.is_triggered == True,
        )
        .order_by(Alert.triggered_at.desc())
    ).all()

    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "ticker": a.ticker,
            "symbol": a.ticker,
            "condition_type": a.condition_type,
            "threshold_value": a.threshold_value,
            "is_triggered": True,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in triggered
    ]


@router.delete("/{alert_id}")
def delete_user_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Deletes an alert belonging to the logged-in user."""
    alert = db.scalar(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == current_user.id,
        )
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    db.delete(alert)
    db.commit()
    return {"status": "deleted", "id": str(alert_id)}


# ─────────────────────────────────────────────────────────────────────────────
# Legacy Endpoints (Maintained for Backward Compatibility)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/add", response_model=AlertResponse)
def add_alert_legacy(payload: AlertCreate, db: Session = Depends(get_db)) -> Alert:
    # Map legacy type strings to condition_type
    type_map = {
        "above": "price_above",
        "below": "price_below",
        "rsi_oversold": "rsi_below",
        "rsi_overbought": "rsi_above",
        "sma_crossover": "sma_crossover",
    }
    cond = type_map.get(payload.type, payload.type)

    alert = Alert(
        user_id=payload.user_id,
        ticker=normalize_symbol(payload.symbol),
        condition_type=cond,
        threshold_value=payload.value,
        is_triggered=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{user_id}", response_model=list[AlertResponse])
def list_alerts_legacy(user_id: str, db: Session = Depends(get_db)) -> list[Alert]:
    return db.query(Alert).filter(Alert.user_id == user_id).order_by(Alert.created_at.desc()).all()
