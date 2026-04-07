"""Combinatorial Purged Cross-Validation (CPCV) per de Prado."""

from __future__ import annotations

from itertools import combinations
from typing import Any

import numpy as np
import polars as pl


def run_cpcv(
    X: pl.DataFrame,
    y: pl.Series,
    n_splits: int = 5,
    n_test_groups: int = 2,
    embargo_pct: float = 0.01,
) -> dict[str, Any]:
    """Combinatorial Purged Cross-Validation (AFML Ch. 12).

    Generates all C(n_splits, n_test_groups) train/test combos, applies an
    embargo buffer after each test segment, and collects per-fold Sharpe
    ratios to return summary statistics.

    Parameters
    ----------
    X : pl.DataFrame
        Feature matrix.
    y : pl.Series
        Target labels.
    n_splits : int
        Number of contiguous groups to split data into.
    n_test_groups : int
        Number of groups held out per fold.
    embargo_pct : float
        Fraction of total samples to embargo after each test segment.

    Returns
    -------
    dict
        Keys: ``mean_sharpe``, ``std_sharpe``, ``n_folds``, ``fold_sharpes``.
    """
    n_samples = len(y)
    embargo_size = int(n_samples * embargo_pct)

    # Create group indices
    group_indices: list[np.ndarray] = []
    boundaries = np.linspace(0, n_samples, n_splits + 1, dtype=int)
    for i in range(n_splits):
        group_indices.append(np.arange(boundaries[i], boundaries[i + 1]))

    X_np = X.to_numpy()
    y_np = y.to_numpy().astype(np.float64)

    fold_sharpes: list[float] = []

    for test_combo in combinations(range(n_splits), n_test_groups):
        test_set = set(test_combo)
        test_idx = np.concatenate([group_indices[g] for g in test_combo])

        # Build embargo zones: embargo_size samples after the end of each test group
        embargo_idx_set: set[int] = set()
        for g in test_combo:
            end = int(group_indices[g][-1]) + 1
            for j in range(end, min(end + embargo_size, n_samples)):
                embargo_idx_set.add(j)

        # Train = everything not in test and not in embargo
        all_test = set(test_idx.tolist())
        train_idx = np.array(
            [i for i in range(n_samples) if i not in all_test and i not in embargo_idx_set]
        )

        if len(train_idx) == 0 or len(test_idx) == 0:
            continue

        # Simple linear model for fold evaluation
        X_train, y_train = X_np[train_idx], y_np[train_idx]
        X_test, y_test = X_np[test_idx], y_np[test_idx]

        # Ridge regression prediction
        lam = 1.0
        n_feat = X_train.shape[1]
        w = np.linalg.solve(
            X_train.T @ X_train + lam * np.eye(n_feat),
            X_train.T @ y_train,
        )
        preds = X_test @ w

        # Fold "returns" = sign(pred) * actual
        fold_returns = np.sign(preds) * y_test
        if np.std(fold_returns) > 0:
            sharpe = float(np.mean(fold_returns) / np.std(fold_returns))
        else:
            sharpe = 0.0
        fold_sharpes.append(sharpe)

    sharpe_arr = np.array(fold_sharpes)
    return {
        "mean_sharpe": float(np.mean(sharpe_arr)) if len(sharpe_arr) > 0 else 0.0,
        "std_sharpe": float(np.std(sharpe_arr)) if len(sharpe_arr) > 0 else 0.0,
        "n_folds": len(fold_sharpes),
        "fold_sharpes": fold_sharpes,
    }
