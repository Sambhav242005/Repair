import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException, ValidationException
from backend.app.db.database import get_db
from backend.app.db.models import AssetModel, DiagnosticModel
from backend.app.models.schemas import (
    Diagnostic, DiagnosticCreate, DiagnosticTriageRequest, DiagnosticTriageResponse,
    ListEnvelope, LocalDiagnosticCollectRequest,
)
from backend.app.services.automation.clef import ClefSelector
from backend.app.services.ai.provider import ProviderError
from scripts.collect_diagnostics import collect, detect_device_identity
from .local_access import require_local_ui

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

MAX_DIAGNOSTIC_JSON_BYTES = 100 * 1024  # 100 KB

DIAGNOSTIC_CHOICES = {
    "memory": "Review the report's available memory relative to total memory and ask about the workload; do not claim current process usage.",
    "storage": "Review free space on the system disk; do not claim drive health or infer a failing disk from capacity alone.",
    "clarify_symptoms": "Ask the teacher when the problem started, what they observe, and whether an error message appears.",
    "it_review": "Recommend a qualified campus IT review when the reported symptom is sudden shutdown, overheating, suspected compromise, or not explained by this limited report.",
}

DIAGNOSTIC_RECOMMENDATIONS = {
    "memory": ("Review memory use", "The snapshot reports available and total memory, but not which apps are using it. Ask what was running when the problem occurred."),
    "storage": ("Review storage space", "The snapshot reports free and total system-disk space. It does not test drive health or identify which files use space."),
    "clarify_symptoms": ("Gather a few details", "Ask when the issue started, what was happening at the time, and the exact error or behavior before choosing another check."),
    "it_review": ("Ask campus IT to review it", "This basic report cannot explain the symptom safely. Have IT inspect the computer before making changes."),
}


def _identity_key(value: str | None) -> str:
    return " ".join((value or "").casefold().split())


def _save_diagnostic(payload: DiagnosticCreate, db: Session) -> Diagnostic:
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

    model = DiagnosticModel(
        id=f"diag_{uuid.uuid4().hex[:8]}",
        asset_id=payload.asset_id,
        collected_at=payload.collected_at,
        payload_json=raw_json,
        collector_version=payload.collector_version,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_to_schema(model)

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
    return _save_diagnostic(payload, db)


@router.post("/collect-local", response_model=Diagnostic, status_code=status.HTTP_201_CREATED)
def collect_local_diagnostic(payload: LocalDiagnosticCollectRequest, request: Request, db: Session = Depends(get_db)):
    """Collect a fixed, read-only local report for a matching registered Windows computer."""
    require_local_ui(request, "Local PC diagnostics")
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")
    if asset.category != "computer":
        raise ValidationException("Local PC reports can only be saved to a computer equipment record.")
    try:
        identity = detect_device_identity()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    if (_identity_key(asset.manufacturer) != _identity_key(identity["manufacturer"])
            or _identity_key(asset.model) != _identity_key(identity["model"])):
        raise HTTPException(status_code=409, detail="The selected equipment does not match this PC. Detect and add this PC, or select its matching equipment record.")
    try:
        report = DiagnosticCreate.model_validate(collect(payload.asset_id))
    except (OSError, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"Could not collect the local read-only report: {exc}") from None
    return _save_diagnostic(report, db)


@router.post("/clef-review", response_model=DiagnosticTriageResponse)
async def clef_review_diagnostic(payload: DiagnosticTriageRequest, request: Request, db: Session = Depends(get_db)):
    """Ask Clef to select one bounded advisory focus from a saved report. No system checks are executed."""
    require_local_ui(request, "Clef diagnostic review")
    report = db.query(DiagnosticModel).filter(
        DiagnosticModel.id == payload.diagnostic_id,
        DiagnosticModel.asset_id == payload.asset_id,
    ).first()
    if not report:
        raise NotFoundException("Saved diagnostic report not found for this equipment.")
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")
    if asset.category != "computer":
        raise ValidationException("Clef's local PC triage is only available for computer equipment records.")
    report_data = json.loads(report.payload_json)
    state = {
        "reported_issue": payload.issue.strip(),
        "computer_model": {"manufacturer": asset.manufacturer, "model": asset.model},
        "read_only_report": report_data,
        "report_limits": ["No running process list, event log, serial number, hostname, or user identity is included.",
                          "The report is a point-in-time snapshot and cannot prove a root cause."],
    }
    try:
        selection = await ClefSelector().select_diagnostic_focus(state, DIAGNOSTIC_CHOICES)
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    title, recommendation = DIAGNOSTIC_RECOMMENDATIONS[selection.action_id]
    return DiagnosticTriageResponse(
        focus=selection.action_id,
        title=title,
        recommendation=recommendation,
        confidence=selection.confidence,
        probabilities=selection.probabilities,
    )
