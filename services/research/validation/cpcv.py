"""Combinatorial Purged Cross-Validation (CPCV) per de Prado."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import polars as pl


def run_cpcv(
    X: pl.DataFrame,
    y: pl.Series,
    n_splits: int = 5,
    embargo_pct: float = 0.01,
) -> dict[str, Any]:
    """Run Combinatorial Purged Cross-Validation."""
    raise NotImplementedError
