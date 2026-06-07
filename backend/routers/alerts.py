from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import Alert, get_db
from models.schemas import AlertCreate, AlertResponse
from services.data_service import normalize_symbol

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.post("/add", response_model=AlertResponse)
def add_alert(payload: AlertCreate, db: Session = Depends(get_db)) -> Alert:
    alert = Alert(user_id=payload.user_id, symbol=normalize_symbol(payload.symbol), alert_type=payload.type, value=payload.value)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{user_id}", response_model=list[AlertResponse])
def list_alerts(user_id: str, db: Session = Depends(get_db)) -> list[Alert]:
    return db.query(Alert).filter(Alert.user_id == user_id).order_by(Alert.created_at.desc()).all()


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"status": "deleted"}
