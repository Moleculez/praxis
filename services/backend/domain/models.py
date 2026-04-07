"""Domain models — pure Python, no framework imports."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any


class ExperimentStatus(Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PROMOTED = "promoted"


class HypothesisStatus(Enum):
    PROPOSED = "proposed"
    TESTING = "testing"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


@dataclass
class Experiment:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    status: ExperimentStatus = ExperimentStatus.DRAFT
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    manifest: dict[str, Any] = field(default_factory=dict)


@dataclass
class Hypothesis:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claim: str = ""
    mechanism: str = ""
    status: HypothesisStatus = HypothesisStatus.PROPOSED
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class AuditDecision:
    ts: datetime = field(default_factory=lambda: datetime.now(UTC))
    request: str = ""
    lead: str = ""
    reason: str = ""
