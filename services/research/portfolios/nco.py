"""Nested Clustered Optimization with Ledoit-Wolf shrinkage."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def allocate_nco(
    covariance: pl.DataFrame,
    n_clusters: int | None = None,
) -> dict[str, float]:
    """Allocate portfolio weights using Nested Clustered Optimization."""
    raise NotImplementedError
