import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException
from backend.app.db.database import get_db
from backend.app.db.models import AlertModel, AssetModel, ProductionModel, utc_now_iso
from backend.app.models.schemas import Asset, AssetCreate, AssetUpdate, ListEnvelope

router = APIRouter(prefix="/assets", tags=["Assets"])

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
