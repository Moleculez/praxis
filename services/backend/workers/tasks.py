"""Background task definitions.

Uses Arq (Redis) when available, otherwise tasks run inline.
"""

from __future__ import annotations

from typing import Any

from services.backend.config import get_settings


async def run_experiment(ctx: dict[str, Any], experiment_id: str) -> str:
    """Execute an experiment pipeline in the background."""
    # TODO: implement experiment runner
    return f"experiment {experiment_id} completed"


async def run_backtest(ctx: dict[str, Any], experiment_id: str) -> str:
    """Run CPCV-validated backtest for an experiment."""
    # TODO: implement backtest runner
    return f"backtest for {experiment_id} completed"


def get_worker_settings() -> dict[str, Any] | None:
    """Return Arq WorkerSettings if Redis is configured, else None."""
    settings = get_settings()
    if not settings.has_redis:
        return None

    from arq.connections import RedisSettings

    class WorkerSettings:
        functions = [run_experiment, run_backtest]
        redis_settings = RedisSettings.from_dsn(settings.redis_url)

    return WorkerSettings  # type: ignore[return-value]
