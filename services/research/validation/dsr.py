"""Deflated Sharpe Ratio probability."""

from __future__ import annotations

import numpy as np
from scipy.stats import norm


def deflated_sharpe_ratio(
    sharpe: float,
    n_trials: int,
    var_sharpe: float,
    skew: float,
    kurtosis: float,
    n_obs: int,
) -> float:
    """Deflated Sharpe Ratio (de Prado, AFML Ch. 8 / Bailey & de Prado 2014).

    Returns the probability that the observed Sharpe ratio is above the
    expected maximum Sharpe under the null of ``n_trials`` independent
    strategies with zero true Sharpe.

    Parameters
    ----------
    sharpe : float
        Observed (annualised) Sharpe ratio of the candidate strategy.
    n_trials : int
        Number of independent strategy trials (selection bias adjustment).
    var_sharpe : float
        Variance of Sharpe ratios across trials.
    skew : float
        Skewness of the strategy's return series.
    kurtosis : float
        Excess kurtosis of the strategy's return series.
    n_obs : int
        Number of return observations.

    Returns
    -------
    float
        DSR probability in [0, 1].  Values >= 0.95 pass the gate.
    """
    # Expected max Sharpe under the null (Euler-Mascheroni approximation)
    euler_mascheroni = 0.5772156649
    expected_max_sharpe = np.sqrt(var_sharpe) * (
        (1 - euler_mascheroni) * norm.ppf(1 - 1.0 / n_trials)
        + euler_mascheroni * norm.ppf(1 - 1.0 / (n_trials * np.e))
    )

    # Standard error of the Sharpe ratio accounting for non-normality
    se_sharpe = np.sqrt(
        (1 - skew * sharpe + (kurtosis - 1) / 4.0 * sharpe**2) / (n_obs - 1)
    )

    if se_sharpe <= 0:
        return 1.0 if sharpe > expected_max_sharpe else 0.0

    # Test statistic: how far observed SR exceeds the expected max
    z = (sharpe - expected_max_sharpe) / se_sharpe
    return float(norm.cdf(z))
