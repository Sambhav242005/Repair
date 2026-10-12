import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import (
    AlreadyCompletedException,
    AssetUnavailableException,
    NotFoundException,
    ScheduleConflictException,
    ValidationException,
)
from backend.app.db.database import get_db
from backend.app.db.models import (
    AssetModel,
    LessonModel,
    MaintenanceModel,
    ProductionModel,
    utc_now_iso,
)
from backend.app.models.schemas import (
    Lesson,
    LessonCreate,
    ListEnvelope,
    Maintenance,
    MaintenanceCompleteRequest,
    MaintenanceCompleteResponse,
    MaintenanceCreate,
    Production,
    ProductionCreate,
)

router = APIRouter(tags=["Factory Planning"])

def parse_iso(dt_str: str) -> datetime:
    # Handles ISO formats like 2026-10-12T08:00:00Z or +00:00
    cleaned = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(cleaned)

def check_half_open_overlap(s1: str, e1: str, s2: str, e2: str) -> bool:
    """SRS §9: Half-open windows [start, end); touching endpoints do not conflict."""
    t_s1, t_e1 = parse_iso(s1), parse_iso(e1)
    t_s2, t_e2 = parse_iso(s2), parse_iso(e2)
    return t_s1 < t_e2 and t_s2 < t_e1

def find_asset_conflict(
    db: Session,
    asset_id: str,
    starts_at: str,
    ends_at: str,
    exclude_type: Optional[str] = None,
    exclude_id: Optional[str] = None,
):
    """Checks for reservation conflicts on an asset across maintenance, production, and blocking lessons."""
    # 1. Maintenance reservations
    m_query = db.query(MaintenanceModel).filter(
        MaintenanceModel.asset_id == asset_id,
        MaintenanceModel.status == "scheduled",
        MaintenanceModel.starts_at.isnot(None),
        MaintenanceModel.ends_at.isnot(None),
    )
    for m in m_query.all():
        if exclude_type == "maintenance" and m.id == exclude_id:
            continue
        if check_half_open_overlap(starts_at, ends_at, m.starts_at, m.ends_at):
            return {
                "conflicting_entity_id": m.id,
                "conflicting_type": "maintenance",
                "title": m.title,
            }

    # 2. Production runs
    p_query = db.query(ProductionModel).filter(
        ProductionModel.asset_id == asset_id,
        ProductionModel.status == "scheduled",
    )
    for p in p_query.all():
        if exclude_type == "production" and p.id == exclude_id:
            continue
        if check_half_open_overlap(starts_at, ends_at, p.starts_at, p.ends_at):
            return {
                "conflicting_entity_id": p.id,
                "conflicting_type": "production",
                "title": p.title,
            }

    # 3. Blocking lessons
    l_query = db.query(LessonModel).filter(
        LessonModel.asset_id == asset_id,
        LessonModel.status == "scheduled",
        LessonModel.blocks_asset.is_(True),
    )
    for l in l_query.all():
        if exclude_type == "lesson" and l.id == exclude_id:
            continue
        if check_half_open_overlap(starts_at, ends_at, l.starts_at, l.ends_at):
            return {
                "conflicting_entity_id": l.id,
                "conflicting_type": "lesson",
                "title": l.title,
            }

    return None

# ================= MAINTENANCE =================
def maintenance_to_schema(m: MaintenanceModel) -> Maintenance:
    return Maintenance(
        id=m.id,
        asset_id=m.asset_id,
        title=m.title,
        description=m.description,
        interval_days=m.interval_days,
        due_at=m.due_at,
        starts_at=m.starts_at,
        ends_at=m.ends_at,
        assignee=m.assignee,
        status=m.status,
        completed_at=m.completed_at,
    )

@router.get("/maintenance", response_model=ListEnvelope[Maintenance])
def list_maintenance(db: Session = Depends(get_db)):
    records = db.query(MaintenanceModel).all()
    items = [maintenance_to_schema(r) for r in records]
    return ListEnvelope(items=items, total=len(items))

@router.post("/maintenance", response_model=Maintenance, status_code=status.HTTP_201_CREATED)
def create_maintenance(payload: MaintenanceCreate, db: Session = Depends(get_db)):
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

    if payload.interval_days is not None and payload.interval_days <= 0:
        raise ValidationException("interval_days must be positive when supplied.")

    # A reservation window requires both starts_at and ends_at
    if (payload.starts_at and not payload.ends_at) or (payload.ends_at and not payload.starts_at):
        raise ValidationException("A maintenance reservation window requires both starts_at and ends_at.")

    if payload.starts_at and payload.ends_at:
        t_start, t_end = parse_iso(payload.starts_at), parse_iso(payload.ends_at)
        if t_start >= t_end:
            raise ValidationException("starts_at must be strictly before ends_at.")

        # Check for schedule conflicts
        conflict = find_asset_conflict(db, payload.asset_id, payload.starts_at, payload.ends_at)
        if conflict:
            raise ScheduleConflictException(
                f"Schedule conflict: Asset '{asset.name}' is already reserved during this window.",
                details=conflict,
            )

    m_id = f"maint_{uuid.uuid4().hex[:8]}"
    model = MaintenanceModel(
        id=m_id,
        asset_id=payload.asset_id,
        title=payload.title,
        description=payload.description,
        interval_days=payload.interval_days,
        due_at=payload.due_at,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        assignee=payload.assignee,
        status="scheduled",
        completed_at=None,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return maintenance_to_schema(model)

@router.post("/maintenance/{maint_id}/complete", response_model=MaintenanceCompleteResponse)
def complete_maintenance(
    maint_id: str,
    payload: MaintenanceCompleteRequest,
    db: Session = Depends(get_db),
):
    model = db.query(MaintenanceModel).filter(MaintenanceModel.id == maint_id).first()
    if not model:
        raise NotFoundException(f"Maintenance task '{maint_id}' not found.")

    if model.status == "completed":
        raise AlreadyCompletedException(
            f"Maintenance task '{maint_id}' is already completed.",
            details={"completed_at": model.completed_at},
        )

    # Mark current as completed
    model.status = "completed"
    model.completed_at = payload.completed_at

    next_model = None
    # SRS §9: "Recurring maintenance creates a new entity on completion; completed_at + interval_days."
    if model.interval_days and model.interval_days > 0:
        c_time = parse_iso(payload.completed_at)
        next_due = (c_time + timedelta(days=model.interval_days)).isoformat()
        next_id = f"maint_{uuid.uuid4().hex[:8]}"

        next_model = MaintenanceModel(
            id=next_id,
            asset_id=model.asset_id,
            title=model.title,
            description=model.description,
            interval_days=model.interval_days,
            due_at=next_due,
            starts_at=None,
            ends_at=None,
            assignee=model.assignee,
            status="scheduled",
            completed_at=None,
        )
        db.add(next_model)

    db.commit()
    db.refresh(model)
    if next_model:
        db.refresh(next_model)

    return MaintenanceCompleteResponse(
        completed=maintenance_to_schema(model),
        next=maintenance_to_schema(next_model) if next_model else None,
    )

# ================= TRAINING LESSONS =================
def lesson_to_schema(l: LessonModel) -> Lesson:
    return Lesson(
        id=l.id,
        asset_id=l.asset_id,
        title=l.title,
        instructions=l.instructions,
        starts_at=l.starts_at,
        ends_at=l.ends_at,
        assignee=l.assignee,
        blocks_asset=l.blocks_asset,
        status=l.status,
    )

@router.get("/lessons", response_model=ListEnvelope[Lesson])
def list_lessons(db: Session = Depends(get_db)):
    records = db.query(LessonModel).all()
    items = [lesson_to_schema(r) for r in records]
    return ListEnvelope(items=items, total=len(items))

@router.post("/lessons", response_model=Lesson, status_code=status.HTTP_201_CREATED)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)):
    t_start, t_end = parse_iso(payload.starts_at), parse_iso(payload.ends_at)
    if t_start >= t_end:
        raise ValidationException("starts_at must be strictly before ends_at.")

    if payload.blocks_asset:
        if not payload.asset_id:
            raise ValidationException("A blocking lesson requires an asset_id.")
        asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
        if not asset:
            raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

        # Check for schedule conflicts
        conflict = find_asset_conflict(db, payload.asset_id, payload.starts_at, payload.ends_at)
        if conflict:
            raise ScheduleConflictException(
                f"Schedule conflict: Asset is reserved during this window.",
                details=conflict,
            )
    elif payload.asset_id:
        asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
        if not asset:
            raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

    l_id = f"lesson_{uuid.uuid4().hex[:8]}"
    model = LessonModel(
        id=l_id,
        asset_id=payload.asset_id,
        title=payload.title,
        instructions=payload.instructions,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        assignee=payload.assignee,
        blocks_asset=payload.blocks_asset,
        status="scheduled",
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return lesson_to_schema(model)

@router.post("/lessons/{lesson_id}/complete", response_model=Lesson)
def complete_lesson(lesson_id: str, db: Session = Depends(get_db)):
    model = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not model:
        raise NotFoundException(f"Lesson '{lesson_id}' not found.")

    if model.status == "completed":
        raise AlreadyCompletedException(f"Lesson '{lesson_id}' is already completed.")

    model.status = "completed"
    db.commit()
    db.refresh(model)
    return lesson_to_schema(model)

# ================= PRODUCTION =================
def production_to_schema(p: ProductionModel) -> Production:
    return Production(
        id=p.id,
        asset_id=p.asset_id,
        title=p.title,
        starts_at=p.starts_at,
        ends_at=p.ends_at,
        quantity=p.quantity,
        status=p.status,
    )

@router.get("/production", response_model=ListEnvelope[Production])
def list_production(db: Session = Depends(get_db)):
    records = db.query(ProductionModel).all()
    items = [production_to_schema(r) for r in records]
    return ListEnvelope(items=items, total=len(items))

@router.post("/production", response_model=Production, status_code=status.HTTP_201_CREATED)
def create_production(payload: ProductionCreate, db: Session = Depends(get_db)):
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

    # SRS §9: "An unavailable asset rejects new production."
    if asset.status in ["faulty", "maintenance", "retired"]:
        raise AssetUnavailableException(
            f"Asset '{asset.name}' is currently {asset.status} and cannot be scheduled for production.",
            details={"asset_id": asset.id, "status": asset.status},
        )

    if payload.quantity <= 0:
        raise ValidationException("Quantity must be positive.")

    t_start, t_end = parse_iso(payload.starts_at), parse_iso(payload.ends_at)
    if t_start >= t_end:
        raise ValidationException("starts_at must be strictly before ends_at.")

    # Check for schedule conflicts
    conflict = find_asset_conflict(db, payload.asset_id, payload.starts_at, payload.ends_at)
    if conflict:
        raise ScheduleConflictException(
            f"Schedule conflict: Asset is reserved during this window.",
            details=conflict,
        )

    p_id = f"prod_{uuid.uuid4().hex[:8]}"
    model = ProductionModel(
        id=p_id,
        asset_id=payload.asset_id,
        title=payload.title,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        quantity=payload.quantity,
        status="scheduled",
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return production_to_schema(model)

@router.post("/production/{prod_id}/complete", response_model=Production)
def complete_production(prod_id: str, db: Session = Depends(get_db)):
    model = db.query(ProductionModel).filter(ProductionModel.id == prod_id).first()
    if not model:
        raise NotFoundException(f"Production '{prod_id}' not found.")

    if model.status == "completed":
        raise AlreadyCompletedException(f"Production '{prod_id}' is already completed.")

    model.status = "completed"
    db.commit()
    db.refresh(model)
    return production_to_schema(model)
