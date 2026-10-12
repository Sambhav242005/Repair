from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import AssetModel, CaseModel
from backend.app.models.schemas import ImpactResponse

router = APIRouter(prefix="/impact", tags=["Impact"])

@router.get("", response_model=ImpactResponse)
def get_impact(db: Session = Depends(get_db)):
    """
    SRS §10:
    confirmed_repairs = unique assets with a recorded repaired outcome,
    excluding subsequently retired/replaced assets.
    estimated_retained_mass_kg = sum known mass_kg for those assets, once per asset.
    """
    # 1. Find all distinct assets that have at least one repaired outcome
    repaired_cases = (
        db.query(CaseModel.asset_id)
        .filter(CaseModel.outcome == "repaired")
        .distinct()
        .all()
    )
    repaired_asset_ids = {r[0] for r in repaired_cases}

    # 2. Exclude assets that are currently retired or replaced
    active_repaired_assets = (
        db.query(AssetModel)
        .filter(
            AssetModel.id.in_(repaired_asset_ids),
            AssetModel.status.notin_(["retired"]),
        )
        .all()
    )

    confirmed_count = len(active_repaired_assets)
    total_retained_mass = 0.0
    missing_mass_count = 0

    for asset in active_repaired_assets:
        if asset.mass_kg is not None:
            total_retained_mass += float(asset.mass_kg)
        else:
            missing_mass_count += 1

    methodology = (
        "Calculated strictly from unique confirmed device repairs retained in service, "
        "excluding retired equipment. Estimated device mass retained in use counts each "
        "verified device mass once without speculative carbon multipliers."
    )

    return ImpactResponse(
        confirmed_repairs=confirmed_count,
        estimated_retained_mass_kg=round(total_retained_mass, 2),
        assets_missing_mass=missing_mass_count,
        methodology=methodology,
    )
