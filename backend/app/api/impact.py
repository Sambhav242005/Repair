from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.db.database import get_db
from backend.app.db.models import AssetModel, CaseModel
from backend.app.models.schemas import ImpactResponse
from backend.app.utils.datetime import parse_offset_datetime

router = APIRouter(prefix="/impact", tags=["Impact"])

@router.get("", response_model=ImpactResponse)
def get_impact(db: Session = Depends(get_db)):
    """
    SRS §10:
    confirmed_repairs = unique assets with a recorded repaired outcome,
    excluding subsequently retired/replaced assets.
    estimated_retained_mass_kg = sum known mass_kg for those assets, once per asset.
    """
    # Choose each asset's latest repaired/replaced outcome using its recorded
    # outcome timestamp. Case creation time is used only for legacy null rows.
    candidates = db.query(CaseModel).filter(CaseModel.outcome.in_(["repaired", "replaced"])).all()
    latest_by_asset = {}
    for case in candidates:
        try:
            occurred_at = parse_offset_datetime(case.outcome_at or case.created_at)
        except ValueError:
            continue
        previous = latest_by_asset.get(case.asset_id)
        if previous is None or (occurred_at, case.id) > previous[:2]:
            latest_by_asset[case.asset_id] = (occurred_at, case.id, case.outcome)

    latest_repaired_ids = {
        asset_id for asset_id, (_, _, outcome) in latest_by_asset.items() if outcome == "repaired"
    }
    active_repaired_assets = db.query(AssetModel).filter(
        AssetModel.id.in_(latest_repaired_ids), AssetModel.status != "retired"
    ).all() if latest_repaired_ids else []

    # A device retired after its repair stopped being retained, even if it was
    # later marked operational again. A new repaired outcome after retirement
    # can make it count again.
    retained_assets = []
    for asset in active_repaired_assets:
        outcome_time = latest_by_asset[asset.id][0]
        if asset.retired_at:
            try:
                if parse_offset_datetime(asset.retired_at) >= outcome_time:
                    continue
            except ValueError:
                continue
        retained_assets.append(asset)

    confirmed_count = len(retained_assets)
    total_retained_mass = 0.0
    missing_mass_count = 0

    for asset in retained_assets:
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
