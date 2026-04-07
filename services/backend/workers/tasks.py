"""Arq background task definitions."""

from __future__ import annotations

from typing import Any


async def run_experiment(ctx: dict[str, Any], experiment_id: str) -> str:
    """Execute an experiment pipeline in the background."""
    # TODO: implement experiment runner
    return f"experiment {experiment_id} completed"


async def run_backtest(ctx: dict[str, Any], experiment_id: str) -> str:
    """Run CPCV-validated backtest for an experiment."""
    # TODO: implement backtest runner
    return f"backtest for {experiment_id} completed"


class WorkerSettings:
    """Arq worker configuration."""

    functions = [run_experiment, run_backtest]
    redis_settings = None  # configured at startup from Settings.redis_url
