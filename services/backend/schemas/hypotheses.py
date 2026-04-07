"""Hypothesis request and response schemas."""

from datetime import datetime

from pydantic import BaseModel


class HypothesisCreate(BaseModel):
    claim: str
    mechanism: str


class HypothesisUpdate(BaseModel):
    claim: str | None = None
    mechanism: str | None = None


class HypothesisResponse(BaseModel):
    id: str
    claim: str
    mechanism: str
    status: str
    created_at: datetime | None = None
