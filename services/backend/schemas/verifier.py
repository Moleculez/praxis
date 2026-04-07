"""VERIFIER_V1 frozen schema for multi-LLM verification panel."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel


class RiskLevel(str, Enum):
    low = "low"
    med = "med"
    high = "high"
    na = "n/a"


class RiskAssessment(BaseModel):
    level: RiskLevel
    reason: str


class BoolAssessment(BaseModel):
    value: bool
    reason: str


class VerifierVerdict(BaseModel):
    schema_version: Literal["VERIFIER_V1"] = "VERIFIER_V1"
    artifact_id: str
    artifact_type: Literal[
        "feature", "label", "backtest", "code", "causal_story", "council_brief", "pm_idea"
    ]
    leakage_risk: RiskAssessment
    lookahead_risk: RiskAssessment
    survivorship_risk: RiskAssessment
    causal_story_plausible: BoolAssessment
    metrics_consistent: BoolAssessment
    code_correctness: RiskAssessment
    decision: Literal["pass", "fail", "uncertain"]
    reasoning: str
