"""AI result schemas from 00_SRS.md; backend may re-export these."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Evidence(ContractModel):
    source_id: str
    title: str
    url: str | None = None


class Hypothesis(ContractModel):
    cause: str
    likelihood: Literal["low", "medium", "high"]
    evidence: list[str]


class Step(ContractModel):
    id: str
    instruction: str
    expected_result: str
    stop_condition: str | None = None
    status: Literal["pending", "completed", "failed", "skipped"] = "pending"


class Analysis(ContractModel):
    summary: str
    hypotheses: list[Hypothesis]
    uncertainties: list[str]
    steps: list[Step]
    recommendation: Literal["troubleshoot", "professional_repair", "replace", "insufficient_evidence"]
    evidence: list[Evidence]
    estimated_repair_cost_paise: int | None = Field(default=None, ge=0)
    cost_basis: str | None = None


class SuggestedAction(ContractModel):
    instruction: str
    visible_label: str | None = None


class ScreenshotAdvice(ContractModel):
    observations: list[str]
    suggested_actions: list[SuggestedAction]
    limitations: list[str]
