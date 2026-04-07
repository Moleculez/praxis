"""Information-driven bars and stationary features in Polars."""

from __future__ import annotations

import numpy as np
import polars as pl


def compute_dollar_bars(trades: pl.DataFrame, threshold: float = 1_000_000.0) -> pl.DataFrame:
    """Aggregate tick data into dollar bars by cumulative dollar volume.

    Parameters
    ----------
    trades : pl.DataFrame
        Must contain columns: ``timestamp``, ``price``, ``volume``.
    threshold : float
        Dollar volume per bar.

    Returns
    -------
    pl.DataFrame
        OHLCV dollar bars with columns: ``timestamp``, ``open``, ``high``,
        ``low``, ``close``, ``volume``, ``dollar_volume``.
    """
    trades = trades.with_columns(
        (pl.col("price") * pl.col("volume")).alias("dollar_volume"),
    )
    trades = trades.with_columns(
        pl.col("dollar_volume").cum_sum().alias("cum_dollar"),
    )
    trades = trades.with_columns(
        (pl.col("cum_dollar") / threshold).floor().cast(pl.Int64).alias("bar_id"),
    )

    bars = trades.group_by("bar_id", maintain_order=True).agg(
        pl.col("timestamp").first().alias("timestamp"),
        pl.col("price").first().alias("open"),
        pl.col("price").max().alias("high"),
        pl.col("price").min().alias("low"),
        pl.col("price").last().alias("close"),
        pl.col("volume").sum().alias("volume"),
        pl.col("dollar_volume").sum().alias("dollar_volume"),
    )
    return bars.drop("bar_id")


def fractional_differentiation(
    series: pl.Series, d: float = 0.4, threshold: float = 1e-5
) -> pl.Series:
    """Fixed-width window fractional differentiation (AFML Ch. 5).

    Parameters
    ----------
    series : pl.Series
        Prices or log-prices.
    d : float
        Fractional order in (0, 1).
    threshold : float
        Minimum absolute weight to keep in the kernel.

    Returns
    -------
    pl.Series
        Fractionally differenced series (same length, leading NaNs where
        the kernel window exceeds available history).
    """
    vals = series.to_numpy().astype(np.float64)
    n = len(vals)

    # Build weights until they drop below threshold
    weights = [1.0]
    k = 1
    while True:
        w = -weights[-1] * (d - k + 1) / k
        if abs(w) < threshold:
            break
        weights.append(w)
        k += 1

    weights_arr = np.array(weights[::-1], dtype=np.float64)  # oldest first
    width = len(weights_arr)

    out = np.full(n, np.nan, dtype=np.float64)
    for i in range(width - 1, n):
        window = vals[i - width + 1 : i + 1]
        out[i] = np.dot(weights_arr, window)

    return pl.Series(name=series.name, values=out)


def compute_microstructural_features(bars: pl.DataFrame) -> pl.DataFrame:
    """Kyle lambda, Amihud illiquidity, and Roll spread on rolling 20-bar windows.

    Parameters
    ----------
    bars : pl.DataFrame
        Must contain: ``close``, ``volume``, ``dollar_volume``.

    Returns
    -------
    pl.DataFrame
        Original bars with appended columns: ``kyle_lambda``,
        ``amihud_illiquidity``, ``roll_spread``.
    """
    window = 20

    close = bars["close"].to_numpy().astype(np.float64)
    volume = bars["volume"].to_numpy().astype(np.float64)
    dollar_volume = bars["dollar_volume"].to_numpy().astype(np.float64)
    n = len(close)

    kyle_lambda = np.full(n, np.nan)
    amihud = np.full(n, np.nan)
    roll_spread = np.full(n, np.nan)

    returns = np.diff(close) / close[:-1]

    for i in range(window, n):
        ret_win = returns[i - window : i]
        vol_win = volume[i - window : i]
        dv_win = dollar_volume[i - window : i]

        # Kyle lambda: regression slope |return| ~ signed_volume
        signed_vol = np.sign(ret_win) * vol_win
        if np.std(signed_vol) > 0:
            cov = np.cov(np.abs(ret_win), signed_vol)
            kyle_lambda[i] = cov[0, 1] / (cov[1, 1] + 1e-15)
        else:
            kyle_lambda[i] = 0.0

        # Amihud illiquidity: mean(|return| / dollar_volume)
        safe_dv = np.where(dv_win > 0, dv_win, 1e-15)
        amihud[i] = np.mean(np.abs(ret_win) / safe_dv)

        # Roll spread: 2 * sqrt(-cov(delta_p_t, delta_p_{t-1})) if negative
        dp = np.diff(close[i - window : i + 1])
        if len(dp) >= 2:
            auto_cov = np.cov(dp[:-1], dp[1:])[0, 1]
            roll_spread[i] = 2.0 * np.sqrt(-auto_cov) if auto_cov < 0 else 0.0

    return bars.with_columns(
        pl.Series("kyle_lambda", kyle_lambda),
        pl.Series("amihud_illiquidity", amihud),
        pl.Series("roll_spread", roll_spread),
    )
