"""Council output schema (COUNCIL_OUTPUT_V1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class CouncilOutput(BaseModel):
    """Structured output from a single council persona evaluation."""

    schema_version: Literal["COUNCIL_OUTPUT_V1"] = "COUNCIL_OUTPUT_V1"
    persona_id: str
    thesis_assessment: str
    key_claims_used: list[str]
    key_claims_disputed: list[str]
    mechanism: str
    falsification_test: str
    probability_thesis_correct: float  # 0.0-1.0
    outcome_distribution: dict[str, float]
    horizon: str
    confidence: Literal["low", "medium", "high"]
