"""Hierarchical Risk Parity portfolio construction."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def allocate_hrp(covariance: pl.DataFrame) -> dict[str, float]:
    """Allocate portfolio weights using Hierarchical Risk Parity."""
    raise NotImplementedError
