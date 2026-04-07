"""Nested Clustered Optimization with Ledoit-Wolf shrinkage."""

from __future__ import annotations

import numpy as np
import polars as pl
from sklearn.cluster import KMeans
from sklearn.covariance import LedoitWolf


def allocate_nco(
    returns: pl.DataFrame,
    n_clusters: int | None = None,
) -> dict[str, float]:
    """Nested Clustered Optimization (de Prado, MLFAM Ch. 7).

    Steps:
      1. Estimate covariance via Ledoit-Wolf shrinkage.
      2. Cluster assets with KMeans.
      3. Within each cluster, run mean-variance optimisation (min variance).
      4. Across clusters, allocate by inverse-cluster-variance (risk parity).

    Parameters
    ----------
    returns : pl.DataFrame
        Asset return columns.  Column names become the asset keys.
    n_clusters : int | None
        Number of clusters.  Defaults to max(2, n_assets // 3).

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

    if n_clusters is None:
        n_clusters = max(2, n_assets // 3)
    n_clusters = min(n_clusters, n_assets)

    # Ledoit-Wolf shrunk covariance
    lw = LedoitWolf().fit(R)
    cov = lw.covariance_

    # Correlation-based features for clustering
    corr = np.corrcoef(R, rowvar=False)

    km = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = km.fit_predict(corr)

    # Within-cluster minimum variance weights
    cluster_weights: list[np.ndarray] = []  # per-cluster weight vectors (full dimension)
    cluster_vars: list[float] = []

    for c in range(n_clusters):
        idx = np.where(labels == c)[0]
        sub_cov = cov[np.ix_(idx, idx)]

        # Min-variance: w = inv(cov) @ 1 / (1' inv(cov) 1)
        try:
            inv_cov = np.linalg.inv(sub_cov)
        except np.linalg.LinAlgError:
            inv_cov = np.linalg.pinv(sub_cov)

        ones = np.ones(len(idx))
        w_raw = inv_cov @ ones
        w = w_raw / w_raw.sum()

        # Store full-dimension vector
        full_w = np.zeros(n_assets)
        for local_i, global_i in enumerate(idx):
            full_w[global_i] = w[local_i]
        cluster_weights.append(full_w)

        # Cluster portfolio variance
        c_var = float(w @ sub_cov @ w)
        cluster_vars.append(max(c_var, 1e-15))

    # Across clusters: inverse-variance (risk parity)
    inv_vars = np.array([1.0 / v for v in cluster_vars])
    cluster_alloc = inv_vars / inv_vars.sum()

    # Combine
    final_weights = np.zeros(n_assets)
    for c in range(n_clusters):
        final_weights += cluster_alloc[c] * cluster_weights[c]

    # Normalise
    total = np.abs(final_weights).sum()
    if total > 0:
        final_weights /= total

    return {asset_names[i]: float(final_weights[i]) for i in range(n_assets)}
