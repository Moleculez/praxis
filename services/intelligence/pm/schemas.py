"""Discretionary PM schemas (PM_IDEA_V1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class PMIdea(BaseModel):
    """Structured trade idea from the discretionary PM."""

    schema_version: Literal["PM_IDEA_V1"] = "PM_IDEA_V1"
    ticker: str
    direction: Literal["long", "short"]
    thesis: str
    horizon: str
    entry_zone: tuple[float, float]
    stop_loss: float
    target: float
    expected_value_pct: float
    win_prob: float
    kelly_fraction: float  # already haircut by 0.5
    conviction: Literal["low", "medium", "high"]
    pre_mortem: str
    kill_criteria: list[str]  # mechanical, no override allowed
