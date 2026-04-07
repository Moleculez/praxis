"""Triple-barrier labels and meta-labels per AFML chapters 3-4. Uses mlfinpy (NOT mlfinlab)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def triple_barrier_labels(
    prices: pl.DataFrame,
    upper: float,
    lower: float,
    max_holding: int,
) -> pl.DataFrame:
    """Compute triple-barrier labels per AFML Ch. 3."""
    raise NotImplementedError


def meta_labels(
    primary_predictions: pl.Series,
    prices: pl.DataFrame,
) -> pl.Series:
    """Compute meta-labels for secondary model per AFML Ch. 3."""
    raise NotImplementedError


def sequential_bootstrap(
    indicator_matrix: pl.DataFrame,
    num_samples: int | None = None,
) -> list[int]:
    """Sequential bootstrap for sample uniqueness per AFML Ch. 4."""
    raise NotImplementedError
