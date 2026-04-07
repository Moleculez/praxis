"""Hypothesis request and response schemas."""

from datetime import datetime

from pydantic import BaseModel


class HypothesisCreate(BaseModel):
    claim: str
    mechanism: str


class HypothesisResponse(BaseModel):
    id: str
    claim: str
    mechanism: str
    status: str
    created_at: datetime | None = None
