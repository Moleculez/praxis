"""Model training: LightGBM baseline, sequence models, linear floor."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import polars as pl
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import RidgeClassifier, Ridge
from sklearn.model_selection import cross_val_score


def train_lightgbm(
    X: pl.DataFrame,
    y: pl.Series,
    params: dict[str, Any] | None = None,
    n_splits: int = 5,
) -> Path:
    """Train a GradientBoostingClassifier as LightGBM proxy (AFML Ch. 6).

    Parameters
    ----------
    X : pl.DataFrame
        Feature matrix.
    y : pl.Series
        Binary or multiclass labels.
    params : dict | None
        Scikit-learn GradientBoostingClassifier kwargs.
    n_splits : int
        Cross-validation folds for reporting.

    Returns
    -------
    Path
        Path to the saved model artifact (JSON metadata + pickled model).
    """
    X_np = X.to_numpy()
    y_np = y.to_numpy()

    default_params: dict[str, Any] = {
        "n_estimators": 200,
        "max_depth": 4,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "random_state": 42,
    }
    if params:
        default_params.update(params)

    model = GradientBoostingClassifier(**default_params)

    cv_scores = cross_val_score(model, X_np, y_np, cv=n_splits, scoring="accuracy")

    # Fit on full data
    model.fit(X_np, y_np)

    # Save artifact
    import pickle

    out_dir = Path(tempfile.mkdtemp(prefix="praxis_lgbm_"))
    model_path = out_dir / "model.pkl"
    meta_path = out_dir / "meta.json"

    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    meta = {
        "model_type": "gradient_boosting_classifier",
        "params": default_params,
        "cv_mean_accuracy": float(np.mean(cv_scores)),
        "cv_std_accuracy": float(np.std(cv_scores)),
        "n_features": X_np.shape[1],
        "n_samples": X_np.shape[0],
    }
    meta_path.write_text(json.dumps(meta, indent=2))

    return out_dir


def train_sequence_model(
    X: pl.DataFrame,
    y: pl.Series,
    model_type: str = "momentum_transformer",
    params: dict[str, Any] | None = None,
) -> Path:
    """Train a sequence model placeholder (ridge regression proxy).

    A full Momentum Transformer implementation requires PyTorch and
    sequence-length windowing.  This placeholder uses RidgeClassifier
    so the pipeline is end-to-end testable.

    Parameters
    ----------
    X : pl.DataFrame
        Feature matrix.
    y : pl.Series
        Labels.
    model_type : str
        Placeholder label stored in metadata.
    params : dict | None
        Passed as kwargs to RidgeClassifier.

    Returns
    -------
    Path
        Artifact directory.
    """
    import pickle

    X_np = X.to_numpy()
    y_np = y.to_numpy()

    model_params: dict[str, Any] = {"alpha": 1.0}
    if params:
        model_params.update(params)

    model = RidgeClassifier(**model_params)
    model.fit(X_np, y_np)

    out_dir = Path(tempfile.mkdtemp(prefix="praxis_seq_"))
    with open(out_dir / "model.pkl", "wb") as f:
        pickle.dump(model, f)

    meta = {
        "model_type": model_type,
        "proxy": "ridge_classifier",
        "params": model_params,
        "n_features": X_np.shape[1],
        "n_samples": X_np.shape[0],
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))

    return out_dir


def train_linear_floor(
    X: pl.DataFrame,
    y: pl.Series,
    alpha: float = 1.0,
) -> Path:
    """Ridge regression baseline (linear floor sanity check).

    Parameters
    ----------
    X : pl.DataFrame
        Feature matrix.
    y : pl.Series
        Continuous or binary labels.
    alpha : float
        Regularisation strength.

    Returns
    -------
    Path
        Artifact directory.
    """
    import pickle

    X_np = X.to_numpy()
    y_np = y.to_numpy().astype(np.float64)

    model = Ridge(alpha=alpha)
    model.fit(X_np, y_np)

    out_dir = Path(tempfile.mkdtemp(prefix="praxis_floor_"))
    with open(out_dir / "model.pkl", "wb") as f:
        pickle.dump(model, f)

    meta = {
        "model_type": "linear_floor",
        "proxy": "ridge_regression",
        "alpha": alpha,
        "n_features": X_np.shape[1],
        "n_samples": X_np.shape[0],
        "coef_norm": float(np.linalg.norm(model.coef_)),
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))

    return out_dir
