"""Information-driven bars and stationary features in Polars."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


def compute_dollar_bars(trades: pl.DataFrame) -> pl.DataFrame:
    """Compute dollar bars from tick data."""
    raise NotImplementedError


def fractional_differentiation(series: pl.Series, d: float) -> pl.Series:
    """Apply fractional differentiation to preserve memory while achieving stationarity."""
    raise NotImplementedError


def compute_microstructural_features(bars: pl.DataFrame) -> pl.DataFrame:
    """Compute microstructural features (VPIN, Kyle lambda, etc.)."""
    raise NotImplementedError
