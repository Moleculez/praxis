"""Model training: LightGBM baseline, sequence models, linear floor."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import polars as pl


def train_lightgbm(
    X: pl.DataFrame,
    y: pl.Series,
    params: dict[str, Any] | None = None,
) -> Path:
    """Train a LightGBM baseline model."""
    raise NotImplementedError


def train_sequence_model(
    X: pl.DataFrame,
    y: pl.Series,
    model_type: str = "momentum_transformer",
) -> Path:
    """Train a sequence model (Momentum Transformer, etc.)."""
    raise NotImplementedError


def train_linear_floor(
    X: pl.DataFrame,
    y: pl.Series,
) -> Path:
    """Train a linear floor model as a sanity check baseline."""
    raise NotImplementedError
