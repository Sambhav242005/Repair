from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.utils.datetime import normalize_utc_iso
from backend.app.models.enums import (
    AssetCategory,
    AssetStatus,
    CaseStatus,
    StepStatus,
    HypothesisLikelihood,
    Recommendation,
    CaseOutcome,
    EntityType,
    AlertKind,
    AlertSeverity,
    JobKind,
    JobStatus,
    OperationalStatus,
    TraceStepStatus,
)

T = TypeVar("T")

class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    @field_validator(
        "due_at", "starts_at", "ends_at", "completed_at", "collected_at",
        "triggered_at", "created_at", "acknowledged_at", mode="before", check_fields=False,
    )
    @classmethod
    def normalize_offset_timestamps(cls, value):
        if value is None:
            return None
        return normalize_utc_iso(value)

# --- Canonical Error Envelope ---
class ErrorDetail(BaseSchema):
    code: str
    message: str
    details: Optional[Any] = None

class ErrorEnvelope(BaseSchema):
    error: ErrorDetail

# --- Generic List Response ---
class ListEnvelope(BaseSchema, Generic[T]):
    items: List[T] = Field(default_factory=list)
    total: int = 0

# --- Asset Schemas ---
class Asset(BaseSchema):
    id: str
    name: str
    category: AssetCategory
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    status: AssetStatus
    mass_kg: Optional[float] = None

class AssetCreate(BaseSchema):
    name: str
    category: AssetCategory
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    mass_kg: Optional[float] = None

class AssetUpdate(BaseSchema):
    name: Optional[str] = None
    category: Optional[AssetCategory] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    status: Optional[AssetStatus] = None
    mass_kg: Optional[float] = None

class LocalDeviceCandidate(BaseSchema):
    manufacturer: str
    model: str
    suggested_name: str
    existing_asset_id: Optional[str] = None
    existing_asset_name: Optional[str] = None

class LocalDiagnosticCollectRequest(BaseSchema):
    asset_id: str = Field(min_length=1, max_length=200)

class DiagnosticTriageRequest(BaseSchema):
    diagnostic_id: str = Field(min_length=1, max_length=200)
    asset_id: str = Field(min_length=1, max_length=200)
    issue: str = Field(min_length=3, max_length=500)

class DiagnosticTriageResponse(BaseSchema):
    focus: str
    title: str
    recommendation: str
    confidence: float
    probabilities: dict[str, float]

# --- Case & Analysis Schemas ---
class EvidenceItem(BaseSchema):
    source_id: str
    title: str
    url: Optional[str] = None

class Hypothesis(BaseSchema):
    cause: str
    likelihood: HypothesisLikelihood
    evidence: List[str] = Field(default_factory=list)

class Step(BaseSchema):
    id: str
    instruction: str
    expected_result: str
    stop_condition: Optional[str] = None
    status: StepStatus = StepStatus.PENDING

class Analysis(BaseSchema):
    summary: str
    hypotheses: List[Hypothesis] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    steps: List[Step] = Field(default_factory=list)
    recommendation: Recommendation
    evidence: List[EvidenceItem] = Field(default_factory=list)
    estimated_repair_cost_paise: Optional[int] = None
    cost_basis: Optional[str] = None

class Case(BaseSchema):
    id: str
    asset_id: str
    symptoms: str
    screenshot_id: Optional[str] = None
    diagnostic_id: Optional[str] = None
    status: CaseStatus = CaseStatus.OPEN
    analysis: Optional[Analysis] = None
    outcome: Optional[CaseOutcome] = None
    outcome_note: Optional[str] = None
    created_at: str

class CaseCreate(BaseSchema):
    asset_id: str
    symptoms: str
    screenshot_id: Optional[str] = None
    diagnostic_id: Optional[str] = None

class StepStatusUpdate(BaseSchema):
    status: StepStatus

class CaseOutcomeUpdate(BaseSchema):
    outcome: CaseOutcome
    note: Optional[str] = None

# --- Screenshot Schemas ---
class ScreenshotUploadResponse(BaseSchema):
    id: str
    mime_type: str
    size_bytes: int

class ScreenshotAction(BaseSchema):
    instruction: str
    visible_label: Optional[str] = None

class ScreenshotAdvice(BaseSchema):
    observations: List[str] = Field(default_factory=list)
    suggested_actions: List[ScreenshotAction] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)

class ScreenshotAdviceRequest(BaseSchema):
    screenshot_id: str
    question: str

# --- Diagnostic Schemas ---
class OSInfo(BaseSchema):
    name: str
    version: str

class MemoryInfo(BaseSchema):
    total_bytes: int
    available_bytes: int

class DiskInfo(BaseSchema):
    label: str
    total_bytes: int
    free_bytes: int

class CPUInfo(BaseSchema):
    logical_count: int

class Diagnostic(BaseSchema):
    id: str
    asset_id: str
    collected_at: str
    os: OSInfo
    memory: MemoryInfo
    disks: List[DiskInfo] = Field(default_factory=list)
    cpu: CPUInfo
    collector_version: str

class DiagnosticCreate(BaseSchema):
    asset_id: str
    collected_at: str
    os: OSInfo
    memory: MemoryInfo
    disks: List[DiskInfo] = Field(default_factory=list)
    cpu: CPUInfo
    collector_version: str

# --- Factory Schemas ---
class Maintenance(BaseSchema):
    id: str
    asset_id: str
    title: str
    description: str
    interval_days: Optional[int] = None
    due_at: str
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    assignee: str
    status: OperationalStatus = OperationalStatus.SCHEDULED
    completed_at: Optional[str] = None

class MaintenanceCreate(BaseSchema):
    asset_id: str
    title: str
    description: str
    due_at: str
    assignee: str
    interval_days: Optional[int] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None

class MaintenanceCompleteRequest(BaseSchema):
    completed_at: str

class MaintenanceCompleteResponse(BaseSchema):
    completed: Maintenance
    next: Optional[Maintenance] = None

class Lesson(BaseSchema):
    id: str
    asset_id: Optional[str] = None
    title: str
    instructions: str
    starts_at: str
    ends_at: str
    assignee: str
    blocks_asset: bool = False
    status: OperationalStatus = OperationalStatus.SCHEDULED

class LessonCreate(BaseSchema):
    title: str
    instructions: str
    starts_at: str
    ends_at: str
    assignee: str
    asset_id: Optional[str] = None
    blocks_asset: bool = False

class Production(BaseSchema):
    id: str
    asset_id: str
    title: str
    starts_at: str
    ends_at: str
    quantity: int
    status: OperationalStatus = OperationalStatus.SCHEDULED

class ProductionCreate(BaseSchema):
    asset_id: str
    title: str
    starts_at: str
    ends_at: str
    quantity: int

# --- Alert Schemas ---
class Alert(BaseSchema):
    id: str
    entity_type: EntityType
    entity_id: str
    kind: AlertKind
    severity: AlertSeverity
    message: str
    triggered_at: str
    acknowledged_at: Optional[str] = None

# --- Job Schemas ---
class JobError(BaseSchema):
    code: str
    message: str

class Job(BaseSchema):
    id: str
    kind: JobKind
    status: JobStatus
    result: Optional[Any] = None
    error: Optional[JobError] = None

class JobIdResponse(BaseSchema):
    job_id: str

# --- Browser Computer Use Schemas ---
class BrowserSource(BaseSchema):
    id: str
    title: str
    url: str

class TraceStep(BaseSchema):
    action: str
    target: str
    status: TraceStepStatus

class BrowserResult(BaseSchema):
    source_id: str
    url: str
    page_title: str
    excerpt: str
    trace: List[TraceStep] = Field(default_factory=list)
    advice: Optional[str] = None

class BrowserRunRequest(BaseSchema):
    asset_id: str
    source_id: str
    question: str

# --- Impact Schema ---
class ImpactResponse(BaseSchema):
    confirmed_repairs: int
    estimated_retained_mass_kg: float
    assets_missing_mass: int
    methodology: str
