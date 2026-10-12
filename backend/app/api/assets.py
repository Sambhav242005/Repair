import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException
from backend.app.db.database import begin_write_transaction, get_db
from backend.app.db.models import AlertModel, AssetModel, ProductionModel, utc_now_iso
from backend.app.models.schemas import Asset, AssetCreate, AssetUpdate, ListEnvelope, LocalDeviceCandidate
from scripts.collect_diagnostics import detect_device_identity
from .local_access import require_local_ui

router = APIRouter(prefix="/assets", tags=["Assets"])


def _identity_key(value: str | None) -> str:
    return " ".join((value or "").casefold().split())

def model_to_schema(model: AssetModel) -> Asset:
    return Asset(
        id=model.id,
        name=model.name,
        category=model.category,
        manufacturer=model.manufacturer,
        model=model.model,
        status=model.status,
        mass_kg=model.mass_kg,
    )

@router.get("", response_model=ListEnvelope[Asset])
def list_assets(db: Session = Depends(get_db)):
    records = db.query(AssetModel).all()
    items = [model_to_schema(r) for r in records]
    return ListEnvelope(items=items, total=len(items))


@router.get("/local-device", response_model=LocalDeviceCandidate)
def detect_local_device(request: Request, db: Session = Depends(get_db)):
    """Read local Windows make/model and suggest a fleet record; never saves automatically."""
    require_local_ui(request, "Local device detection")
    try:
        identity = detect_device_identity()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None

    existing = next((asset for asset in db.query(AssetModel).filter(AssetModel.category == "computer").all()
                     if _identity_key(asset.manufacturer) == _identity_key(identity["manufacturer"])
                     and _identity_key(asset.model) == _identity_key(identity["model"])), None)
    return LocalDeviceCandidate(
        **identity,
        suggested_name=f"{identity['manufacturer']} {identity['model']}",
        existing_asset_id=existing.id if existing else None,
        existing_asset_name=existing.name if existing else None,
    )

@router.post("", response_model=Asset, status_code=status.HTTP_201_CREATED)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    asset_id = f"asset_{uuid.uuid4().hex[:8]}"
    model = AssetModel(
        id=asset_id,
        name=payload.name,
        category=payload.category.value if hasattr(payload.category, "value") else str(payload.category),
        manufacturer=payload.manufacturer,
        model=payload.model,
        status="operational",
        mass_kg=payload.mass_kg,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_to_schema(model)

@router.patch("/{asset_id}", response_model=Asset)
def update_asset(asset_id: str, payload: AssetUpdate, db: Session = Depends(get_db)):
    begin_write_transaction(db)
    model = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not model:
        raise NotFoundException(f"Asset '{asset_id}' not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    old_status = model.status

    for key, value in update_dict.items():
        if value is not None:
            if hasattr(value, "value"):
                value = value.value
            setattr(model, key, value)

    if update_dict.get("status") == "retired" and old_status != "retired":
        model.retired_at = utc_now_iso()

    # SRS §9: "Changing an asset to faulty/maintenance raises equipment_unavailable
    # for existing future or active production jobs; never silently cancel jobs."
    new_status = model.status
    if new_status in ["faulty", "maintenance"] and old_status != new_status:
        now_str = utc_now_iso()
        affected_jobs = (
            db.query(ProductionModel)
            .filter(
                ProductionModel.asset_id == asset_id,
                ProductionModel.status == "scheduled",
                ProductionModel.ends_at > now_str,
            )
            .all()
        )
        for job in affected_jobs:
            # Persist alert with unique check on (entity_type, entity_id, kind)
            existing_alert = (
                db.query(AlertModel)
                .filter(
                    AlertModel.entity_type == "production",
                    AlertModel.entity_id == job.id,
                    AlertModel.kind == "equipment_unavailable",
                )
                .first()
            )
            if not existing_alert:
                alert = AlertModel(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    entity_type="production",
                    entity_id=job.id,
                    kind="equipment_unavailable",
                    severity="critical",
                    message=f"Production '{job.title}' impacted: Asset '{model.name}' became {new_status}.",
                    triggered_at=now_str,
                )
                db.add(alert)

    db.commit()
    db.refresh(model)
    return model_to_schema(model)
