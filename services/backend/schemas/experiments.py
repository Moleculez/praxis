"""Experiment request and response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ExperimentCreate(BaseModel):
    name: str
    manifest: dict[str, Any] = {}


class ExperimentUpdate(BaseModel):
    name: str | None = None
    manifest: dict[str, Any] | None = None


class ExperimentResponse(BaseModel):
    id: str
    name: str
    status: str
    manifest: dict[str, Any] = {}
    created_at: datetime | None = None
