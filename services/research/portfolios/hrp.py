"""Hierarchical Risk Parity portfolio construction."""

from __future__ import annotations

import numpy as np
import polars as pl
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform


def allocate_hrp(returns: pl.DataFrame) -> dict[str, float]:
    """Hierarchical Risk Parity (de Prado, AFML Ch. 16 / MLFAM Ch. 7).

    Steps:
      1. Compute correlation and covariance matrices.
      2. Convert correlation to distance, run single-linkage clustering.
      3. Quasi-diagonalise (reorder assets by dendrogram leaves).
      4. Recursive bisection with inverse-variance allocation.

    Parameters
    ----------
    returns : pl.DataFrame
        Asset return columns.  Column names become the asset keys.

    Returns
    -------
    dict[str, float]
        Asset name -> portfolio weight (sums to 1.0).
    """
    asset_names = returns.columns
    R = returns.to_numpy().astype(np.float64)
    n_assets = R.shape[1]

    if n_assets == 1:
        return {asset_names[0]: 1.0}

    cov = np.cov(R, rowvar=False)
    corr = np.corrcoef(R, rowvar=False)

    # Distance matrix from correlation
    dist = np.sqrt(0.5 * (1 - corr))
    np.fill_diagonal(dist, 0.0)

    # Hierarchical clustering
    condensed = squareform(dist, checks=False)
    link = linkage(condensed, method="single")
    sorted_idx = list(leaves_list(link))

    # Recursive bisection
    weights = np.ones(n_assets)

    def _bisect(items: list[int]) -> None:
        if len(items) <= 1:
            return
        mid = len(items) // 2
        left = items[:mid]
        right = items[mid:]

        # Inverse-variance weight for each cluster
        left_var = _cluster_var(cov, left)
        right_var = _cluster_var(cov, right)

        alloc_left = 1 - left_var / (left_var + right_var)
        alloc_right = 1 - alloc_left

        for i in left:
            weights[i] *= alloc_left
        for i in right:
            weights[i] *= alloc_right

        _bisect(left)
        _bisect(right)

    _bisect(sorted_idx)

    # Normalise to sum to 1
    weights /= weights.sum()

    return {asset_names[i]: float(weights[i]) for i in range(n_assets)}


def _cluster_var(cov: np.ndarray, indices: list[int]) -> float:
    """Inverse-variance portfolio variance for a cluster of assets."""
    sub_cov = cov[np.ix_(indices, indices)]
    # Inverse-variance weights within the cluster
    ivp = 1.0 / np.diag(sub_cov)
    ivp /= ivp.sum()
    return float(ivp @ sub_cov @ ivp)
