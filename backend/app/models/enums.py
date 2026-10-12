from enum import Enum

class AssetCategory(str, Enum):
    COMPUTER = "computer"
    FACTORY_MACHINE = "factory_machine"
    APPLIANCE = "appliance"

class AssetStatus(str, Enum):
    OPERATIONAL = "operational"
    MAINTENANCE = "maintenance"
    FAULTY = "faulty"
    RETIRED = "retired"

class CaseStatus(str, Enum):
    OPEN = "open"
    ANALYSING = "analysing"
    READY = "ready"
    CLOSED = "closed"

class StepStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class HypothesisLikelihood(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Recommendation(str, Enum):
    TROUBLESHOOT = "troubleshoot"
    PROFESSIONAL_REPAIR = "professional_repair"
    REPLACE = "replace"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"

class CaseOutcome(str, Enum):
    REPAIRED = "repaired"
    UNRESOLVED = "unresolved"
    REPLACED = "replaced"

class EntityType(str, Enum):
    MAINTENANCE = "maintenance"
    LESSON = "lesson"
    PRODUCTION = "production"

class AlertKind(str, Enum):
    DUE_SOON = "due_soon"
    DUE = "due"
    OVERDUE = "overdue"
    EQUIPMENT_UNAVAILABLE = "equipment_unavailable"

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class JobKind(str, Enum):
    CASE_ANALYSIS = "case_analysis"
    SCREENSHOT_ANALYSIS = "screenshot_analysis"
    BROWSER_RUN = "browser_run"

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"

class OperationalStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TraceStepStatus(str, Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
