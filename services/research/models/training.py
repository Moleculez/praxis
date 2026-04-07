"""Model training: LightGBM baseline, sequence models, linear floor."""

from __future__ import annotations


def train_lightgbm() -> None:
    """Train a LightGBM baseline model."""
    raise NotImplementedError


def train_sequence_model() -> None:
    """Train a sequence model (Momentum Transformer, etc.)."""
    raise NotImplementedError


def train_linear_floor() -> None:
    """Train a linear floor model as a sanity check baseline."""
    raise NotImplementedError
