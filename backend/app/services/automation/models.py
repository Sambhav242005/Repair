"""Database-independent native desktop contract."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

class Window(Record):
    handle: int = Field(gt=0)
    process_id: int = Field(gt=0)
    application: Literal["Calculator", "TaskManager", "Settings"]

class Control(Record):
    id: str
    automation_id: str
    name: str
    kind: str
    enabled: bool
    operations: list[Literal["invoke", "select", "text", "scroll"]]

class Observation(Record):
    snapshot_id: str
    captured_monotonic: float
    window: Window
    controls: list[Control]

class Acceptance(Record):
    """User supplied; never generated or modified by a model."""
    automation_id: str = Field(min_length=1, max_length=200)
    name_equals: str = Field(min_length=1, max_length=200)

class Candidate(Record):
    id: str
    snapshot_id: str
    operation: Literal["invoke", "select", "text", "key", "scroll", "wait", "ask_user", "stop"]
    control_id: str | None = None
    argument: str | None = None
    expected_effect: str
    stop_condition: str = "Stop on missing target, changed window or failed verification."

class Plan(Record):
    subgoal: str = Field(min_length=1, max_length=500)
    preferred_control_id: str | None
    done: bool

class Selection(Record):
    action_id: str
    probabilities: dict[str, float]
    confidence: float = Field(ge=0, le=1)

class Trace(Record):
    before_snapshot: str
    after_snapshot: str | None
    action: Candidate
    effect_verified: bool
    status: Literal["verified", "no_effect", "failed", "interrupted"]

class SessionResult(Record):
    status: Literal["succeeded", "stopped", "needs_user", "failed"]
    message: str
    trace: list[Trace]
    error_code: str | None = None
