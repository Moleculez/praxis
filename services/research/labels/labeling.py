"""Triple-barrier labels and meta-labels per AFML chapters 3-4. Uses mlfinpy (NOT mlfinlab)."""

from __future__ import annotations

import numpy as np
import polars as pl


def triple_barrier_labels(
    prices: pl.DataFrame,
    upper: float = 0.02,
    lower: float = 0.02,
    max_holding: int = 20,
) -> pl.DataFrame:
    """Triple-barrier labeling (AFML Ch. 3).

    For each bar, three barriers are set:
      - Upper: price rises by ``upper`` fraction  -> label +1
      - Lower: price falls by ``lower`` fraction  -> label -1
      - Vertical: ``max_holding`` bars elapse      -> label 0

    Parameters
    ----------
    prices : pl.DataFrame
        Must contain ``timestamp`` and ``close`` columns.
    upper : float
        Profit-taking threshold as a fraction of entry price.
    lower : float
        Stop-loss threshold as a fraction of entry price.
    max_holding : int
        Maximum bars to hold before vertical barrier.

    Returns
    -------
    pl.DataFrame
        Columns: ``timestamp``, ``entry_price``, ``exit_price``,
        ``holding_period``, ``label``.
    """
    timestamps = prices["timestamp"].to_list()
    close = prices["close"].to_numpy().astype(np.float64)
    n = len(close)

    out_ts: list[object] = []
    out_entry: list[float] = []
    out_exit: list[float] = []
    out_hold: list[int] = []
    out_label: list[int] = []

    for i in range(n):
        entry = close[i]
        upper_barrier = entry * (1 + upper)
        lower_barrier = entry * (1 - lower)
        label = 0
        exit_price = entry
        holding = max_holding

        end = min(i + max_holding, n)
        for j in range(i + 1, end):
            if close[j] >= upper_barrier:
                label = 1
                exit_price = close[j]
                holding = j - i
                break
            if close[j] <= lower_barrier:
                label = -1
                exit_price = close[j]
                holding = j - i
                break
        else:
            # Vertical barrier hit (or end of data)
            last = end - 1 if end > i + 1 else i
            exit_price = close[last]
            holding = last - i

        out_ts.append(timestamps[i])
        out_entry.append(float(entry))
        out_exit.append(float(exit_price))
        out_hold.append(holding)
        out_label.append(label)

    return pl.DataFrame({
        "timestamp": out_ts,
        "entry_price": out_entry,
        "exit_price": out_exit,
        "holding_period": out_hold,
        "label": out_label,
    })


def meta_labels(
    primary_labels: pl.Series,
    secondary_probs: pl.Series,
) -> pl.Series:
    """Binary meta-labels: was the primary model's prediction correct? (AFML Ch. 3).

    Parameters
    ----------
    primary_labels : pl.Series
        Predicted direction from the primary model (+1 / -1).
    secondary_probs : pl.Series
        Actual realised returns or labels to evaluate against.

    Returns
    -------
    pl.Series
        1 where primary direction matched actual direction, 0 otherwise.
    """
    primary = primary_labels.to_numpy().astype(np.float64)
    actual = secondary_probs.to_numpy().astype(np.float64)

    correct = (np.sign(primary) == np.sign(actual)).astype(np.int64)
    return pl.Series(name="meta_label", values=correct)


def sequential_bootstrap(
    indicator_matrix: pl.DataFrame,
    n_samples: int | None = None,
) -> list[int]:
    """Uniqueness-weighted sequential bootstrap (AFML Ch. 4).

    Parameters
    ----------
    indicator_matrix : pl.DataFrame
        Binary matrix (n_observations x n_labels) where 1 means the
        observation is used to determine that label.
    n_samples : int | None
        Number of samples to draw.  Defaults to number of columns (labels).

    Returns
    -------
    list[int]
        Indices of selected samples (column indices into indicator_matrix).
    """
    ind = indicator_matrix.to_numpy().astype(np.float64)
    n_obs, n_labels = ind.shape

    if n_samples is None:
        n_samples = n_labels

    selected: list[int] = []
    # Track how many selected samples use each observation
    usage_count = np.zeros(n_obs, dtype=np.float64)

    for _ in range(n_samples):
        avg_uniqueness = np.zeros(n_labels, dtype=np.float64)

        for j in range(n_labels):
            mask = ind[:, j] > 0
            if not np.any(mask):
                avg_uniqueness[j] = 0.0
                continue
            # Concurrent labels at each observation used by label j
            concurrent = usage_count[mask] + 1  # +1 for this candidate
            uniqueness = 1.0 / concurrent
            avg_uniqueness[j] = float(np.mean(uniqueness))

        # Probability proportional to average uniqueness
        total = avg_uniqueness.sum()
        if total <= 0:
            # Fallback: uniform
            probs = np.ones(n_labels) / n_labels
        else:
            probs = avg_uniqueness / total

        chosen = int(np.random.choice(n_labels, p=probs))
        selected.append(chosen)
        # Update usage count
        usage_count += ind[:, chosen]

    return selected
