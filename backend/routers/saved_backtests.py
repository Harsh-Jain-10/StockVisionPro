from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import SavedBacktest, User, get_db
from models.schemas import BacktestRequest, SavedBacktestCreate, SavedBacktestResponse
from routers.auth import get_current_user
from routers.backtest import run_backtest
from services.data_service import normalize_symbol

router = APIRouter(prefix="/api/saved-backtests", tags=["saved-backtests"])


@router.get("", response_model=list[dict[str, Any]])
def list_saved_backtests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Returns all saved backtest strategies for the current authenticated user."""
    items = db.scalars(
        select(SavedBacktest)
        .where(SavedBacktest.user_id == current_user.id)
        .order_by(SavedBacktest.created_at.desc())
    ).all()

    results = []
    for item in items:
        params = {}
        last_run = None
        try:
            params = json.loads(item.parameters_json) if item.parameters_json else {}
        except Exception:
            params = {}
        try:
            last_run = json.loads(item.last_run_result_json) if item.last_run_result_json else None
        except Exception:
            last_run = None

        results.append({
            "id": item.id,
            "user_id": item.user_id,
            "ticker": item.ticker,
            "strategy_type": item.strategy_type,
            "parameters": params,
            "last_run_result": last_run,
            "created_at": item.created_at.isoformat(),
        })
    return results


@router.post("", response_model=dict[str, Any])
def create_saved_backtest(
    payload: SavedBacktestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Saves a backtest strategy configuration for the user."""
    ticker = normalize_symbol(payload.ticker)
    if not ticker:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol.")

    params_json = json.dumps(payload.parameters or {})
    last_run_json = json.dumps(payload.last_run_result) if payload.last_run_result else None

    saved = SavedBacktest(
        user_id=current_user.id,
        ticker=ticker,
        strategy_type=payload.strategy_type,
        parameters_json=params_json,
        last_run_result_json=last_run_json,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return {
        "id": saved.id,
        "user_id": saved.user_id,
        "ticker": saved.ticker,
        "strategy_type": saved.strategy_type,
        "parameters": payload.parameters,
        "last_run_result": payload.last_run_result,
        "created_at": saved.created_at.isoformat(),
        "status": "saved",
    }


@router.delete("/{backtest_id}")
def delete_saved_backtest(
    backtest_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Deletes a saved backtest strategy."""
    item = db.scalar(
        select(SavedBacktest).where(
            SavedBacktest.id == backtest_id,
            SavedBacktest.user_id == current_user.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Saved strategy not found.")

    db.delete(item)
    db.commit()
    return {"status": "deleted", "id": str(backtest_id)}


@router.post("/{backtest_id}/rerun", response_model=dict[str, Any])
def rerun_saved_backtest(
    backtest_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Re-executes a saved backtest against current market data and updates its record."""
    item = db.scalar(
        select(SavedBacktest).where(
            SavedBacktest.id == backtest_id,
            SavedBacktest.user_id == current_user.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Saved strategy not found.")

    params = {}
    try:
        params = json.loads(item.parameters_json) if item.parameters_json else {}
    except Exception:
        params = {}

    req = BacktestRequest(
        symbol=item.ticker,
        strategy=item.strategy_type,
        params=params,
        period="2y",
    )

    try:
        # Execute using existing backtest engine
        fresh_result = run_backtest(req, db)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rerun backtest: {str(exc)}")

    # Update database record with fresh result
    item.last_run_result_json = json.dumps(fresh_result)
    db.commit()

    return {
        "id": item.id,
        "user_id": item.user_id,
        "ticker": item.ticker,
        "strategy_type": item.strategy_type,
        "parameters": params,
        "last_run_result": fresh_result,
        "created_at": item.created_at.isoformat(),
        "status": "rerun_success",
    }
