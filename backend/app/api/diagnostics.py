import json
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException, ValidationException
from backend.app.db.database import get_db
from backend.app.db.models import AssetModel, DiagnosticModel
from backend.app.models.schemas import Diagnostic, DiagnosticCreate, ListEnvelope

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

MAX_DIAGNOSTIC_JSON_BYTES = 100 * 1024  # 100 KB

def model_to_schema(model: DiagnosticModel) -> Diagnostic:
    payload = json.loads(model.payload_json)
    return Diagnostic(
        id=model.id,
        asset_id=model.asset_id,
        collected_at=model.collected_at,
        os=payload["os"],
        memory=payload["memory"],
        disks=payload["disks"],
        cpu=payload["cpu"],
        collector_version=model.collector_version,
    )


@router.get("", response_model=ListEnvelope[Diagnostic])
def list_diagnostics(asset_id: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(DiagnosticModel)
    if asset_id:
        query = query.filter(DiagnosticModel.asset_id == asset_id)
    records = query.order_by(DiagnosticModel.collected_at.desc()).all()
    return ListEnvelope(items=[model_to_schema(record) for record in records], total=len(records))

@router.post("", response_model=Diagnostic, status_code=status.HTTP_201_CREATED)
def import_diagnostic(payload: DiagnosticCreate, db: Session = Depends(get_db)):
    # Verify asset exists
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

    payload_dict = {
        "os": payload.os.model_dump(),
        "memory": payload.memory.model_dump(),
        "disks": [d.model_dump() for d in payload.disks],
        "cpu": payload.cpu.model_dump(),
    }
    raw_json = json.dumps(payload_dict)
    if len(raw_json.encode("utf-8")) > MAX_DIAGNOSTIC_JSON_BYTES:
        raise ValidationException("Diagnostic payload exceeds maximum limit of 100 KB.")

    diag_id = f"diag_{uuid.uuid4().hex[:8]}"
    model = DiagnosticModel(
        id=diag_id,
        asset_id=payload.asset_id,
        collected_at=payload.collected_at,
        payload_json=raw_json,
        collector_version=payload.collector_version,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_to_schema(model)
