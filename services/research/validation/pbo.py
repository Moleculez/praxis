"""Probability of Backtest Overfitting (PBO)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def probability_of_overfitting(
    returns_matrix: pl.DataFrame,
    n_partitions: int = 10,
) -> float:
    """Compute the Probability of Backtest Overfitting."""
    raise NotImplementedError
