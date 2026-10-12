import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException
from backend.app.db.database import begin_write_transaction, get_db
from backend.app.db.models import (
    AlertModel,
    LessonModel,
    MaintenanceModel,
    ProductionModel,
    utc_now_iso,
)
from backend.app.models.schemas import Alert, ListEnvelope
from backend.app.utils.datetime import parse_offset_datetime

router = APIRouter(prefix="/alerts", tags=["Alerts"])

def parse_iso(dt_str: str) -> datetime:
    return parse_offset_datetime(dt_str)

def model_to_schema(model: AlertModel) -> Alert:
    return Alert(
        id=model.id,
        entity_type=model.entity_type,
        entity_id=model.entity_id,
        kind=model.kind,
        severity=model.severity,
        message=model.message,
        triggered_at=model.triggered_at,
        acknowledged_at=model.acknowledged_at,
    )

def evaluate_and_persist_alerts(db: Session, now: Optional[datetime] = None):
    """
    Evaluates maintenance, lessons, and production according to SRS §9 rules
    and persists alerts with deduplication on (entity_type, entity_id, kind).
    """
    now_dt = now or datetime.now(timezone.utc)
    if now_dt.tzinfo is None or now_dt.utcoffset() is None:
        raise ValueError("Alert evaluation time must include a UTC offset.")
    now_dt = now_dt.astimezone(timezone.utc)
    begin_write_transaction(db)

    # 1. Evaluate Maintenance
    # due_soon: due_at - 24h to due_at
    # due: due_at to due_at + 15m
    # overdue: after due_at + 15m
    maintenance_tasks = db.query(MaintenanceModel).filter(MaintenanceModel.status == "scheduled").all()
    for m in maintenance_tasks:
        try:
            due_at = parse_iso(m.due_at)
        except Exception:
            continue

        kind = None
        severity = "info"
        msg = ""

        if due_at - timedelta(hours=24) <= now_dt < due_at:
            kind = "due_soon"
            severity = "info"
            msg = f"Maintenance '{m.title}' is due soon ({m.due_at})."
        elif due_at <= now_dt < due_at + timedelta(minutes=15):
            kind = "due"
            severity = "warning"
            msg = f"Maintenance '{m.title}' is due now."
        elif now_dt >= due_at + timedelta(minutes=15):
            kind = "overdue"
            severity = "critical"
            msg = f"Maintenance '{m.title}' is overdue!"

        if kind:
            existing = (
                db.query(AlertModel)
                .filter(
                    AlertModel.entity_type == "maintenance",
                    AlertModel.entity_id == m.id,
                    AlertModel.kind == kind,
                )
                .first()
            )
            if not existing:
                alert = AlertModel(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    entity_type="maintenance",
                    entity_id=m.id,
                    kind=kind,
                    severity=severity,
                    message=msg,
                    triggered_at=now_dt.astimezone(timezone.utc).isoformat(),
                )
                db.add(alert)

    # 2. Evaluate Lessons
    # due_soon: 15 minutes before starts_at
    # due: starts_at until ends_at
    # overdue: after ends_at
    lessons = db.query(LessonModel).filter(LessonModel.status == "scheduled").all()
    for l in lessons:
        try:
            s_at = parse_iso(l.starts_at)
            e_at = parse_iso(l.ends_at)
        except Exception:
            continue

        kind = None
        severity = "info"
        msg = ""

        if s_at - timedelta(minutes=15) <= now_dt < s_at:
            kind = "due_soon"
            severity = "info"
            msg = f"Training lesson '{l.title}' starts soon ({l.starts_at})."
        elif s_at <= now_dt < e_at:
            kind = "due"
            severity = "warning"
            msg = f"Training lesson '{l.title}' is currently running."
        elif now_dt >= e_at:
            kind = "overdue"
            severity = "critical"
            msg = f"Training lesson '{l.title}' was scheduled to end at {l.ends_at} but is not marked completed."

        if kind:
            existing = (
                db.query(AlertModel)
                .filter(
                    AlertModel.entity_type == "lesson",
                    AlertModel.entity_id == l.id,
                    AlertModel.kind == kind,
                )
                .first()
            )
            if not existing:
                alert = AlertModel(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    entity_type="lesson",
                    entity_id=l.id,
                    kind=kind,
                    severity=severity,
                    message=msg,
                    triggered_at=now_dt.astimezone(timezone.utc).isoformat(),
                )
                db.add(alert)

    # 3. Evaluate Production
    # due_soon: 15 minutes before starts_at
    # due: starts_at until ends_at
    # overdue: after ends_at
    production_runs = db.query(ProductionModel).filter(ProductionModel.status == "scheduled").all()
    for p in production_runs:
        try:
            s_at = parse_iso(p.starts_at)
            e_at = parse_iso(p.ends_at)
        except Exception:
            continue

        kind = None
        severity = "info"
        msg = ""

        if s_at - timedelta(minutes=15) <= now_dt < s_at:
            kind = "due_soon"
            severity = "info"
            msg = f"Production '{p.title}' starts in 15 minutes."
        elif s_at <= now_dt < e_at:
            kind = "due"
            severity = "warning"
            msg = f"Production '{p.title}' is currently in progress."
        elif now_dt >= e_at:
            kind = "overdue"
            severity = "critical"
            msg = f"Production '{p.title}' exceeded its end window ({p.ends_at}) without completion."

        if kind:
            existing = (
                db.query(AlertModel)
                .filter(
                    AlertModel.entity_type == "production",
                    AlertModel.entity_id == p.id,
                    AlertModel.kind == kind,
                )
                .first()
            )
            if not existing:
                alert = AlertModel(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    entity_type="production",
                    entity_id=p.id,
                    kind=kind,
                    severity=severity,
                    message=msg,
                    triggered_at=now_dt.astimezone(timezone.utc).isoformat(),
                )
                db.add(alert)

    db.commit()

@router.get("", response_model=ListEnvelope[Alert])
def list_alerts(
    unacknowledged: bool = Query(False, description="Filter unacknowledged alerts only"),
    db: Session = Depends(get_db),
):
    # Dynamically evaluate current alerts before returning
    evaluate_and_persist_alerts(db)

    query = db.query(AlertModel)
    if unacknowledged:
        query = query.filter(AlertModel.acknowledged_at.is_(None))

    records = query.order_by(AlertModel.triggered_at.desc()).all()
    items = [model_to_schema(r) for r in records]
    return ListEnvelope(items=items, total=len(items))

@router.post("/{alert_id}/acknowledge", response_model=Alert)
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    begin_write_transaction(db)
    model = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not model:
        raise NotFoundException(f"Alert '{alert_id}' not found.")

    if not model.acknowledged_at:
        model.acknowledged_at = utc_now_iso()
        db.commit()
        db.refresh(model)

    return model_to_schema(model)
