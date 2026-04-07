"""Shared crawler data models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawItem:
    """A single item fetched by any crawler."""

    source: str
    url: str
    title: str
    content: str
    published_at: datetime | None = None
    metadata: dict[str, str | int | float | None] | None = None
