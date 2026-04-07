"""Deflated Sharpe Ratio probability."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def deflated_sharpe_ratio(
    returns: pl.Series,
    num_trials: int,
) -> float:
    """Compute the Deflated Sharpe Ratio."""
    raise NotImplementedError
