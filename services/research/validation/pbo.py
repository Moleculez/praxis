"""Probability of Backtest Overfitting (PBO)."""

from __future__ import annotations

from itertools import combinations
from typing import Any

import numpy as np


def probability_of_overfitting(
    performance_matrix: np.ndarray,
    n_partitions: int = 10,
) -> dict[str, Any]:
    """Probability of Backtest Overfitting (Bailey et al. 2015).

    Splits a performance matrix into in-sample / out-of-sample halves across
    all C(S, S/2) partition combos, checks whether the best IS strategy
    underperforms the OOS median, and returns the PBO estimate.

    Parameters
    ----------
    performance_matrix : np.ndarray
        Shape ``(n_partitions, n_strategies)``.  Each row is a time partition,
        each column is a strategy's return in that partition.
    n_partitions : int
        Ignored when ``performance_matrix`` is provided (kept for API compat).
        The number of rows in the matrix is used directly.

    Returns
    -------
    dict
        Keys: ``pbo``, ``n_combos``, ``logit_distribution``.
    """
    S = performance_matrix.shape[0]  # number of time partitions
    half = S // 2

    logits: list[float] = []

    for is_indices in combinations(range(S), half):
        oos_indices = tuple(i for i in range(S) if i not in is_indices)

        is_perf = performance_matrix[list(is_indices), :].mean(axis=0)  # per-strategy IS mean
        oos_perf = performance_matrix[list(oos_indices), :].mean(axis=0)

        best_is_idx = int(np.argmax(is_perf))
        oos_of_best = oos_perf[best_is_idx]

        # Rank of the best-IS strategy in OOS (lower = worse)
        n_strategies = len(oos_perf)
        rank = int(np.sum(oos_perf <= oos_of_best))  # 1-based rank from bottom
        # omega = rank / n_strategies  (proportion at or below)
        omega = rank / n_strategies

        # Logit: log(omega / (1 - omega)), clamped to avoid inf
        omega_clamped = np.clip(omega, 1e-10, 1 - 1e-10)
        logit = float(np.log(omega_clamped / (1 - omega_clamped)))
        logits.append(logit)

    logit_arr = np.array(logits)
    # PBO = fraction of combos where logit <= 0 (best IS is below OOS median)
    pbo = float(np.mean(logit_arr <= 0))

    return {
        "pbo": pbo,
        "n_combos": len(logits),
        "logit_distribution": logits,
    }
