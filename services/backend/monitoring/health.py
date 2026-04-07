"""Health check probes for database and Redis."""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def check_db(session: AsyncSession) -> dict[str, Any]:
    """Ping the database and return status."""
    try:
        await session.execute(text("SELECT 1"))
        return {"db": "ok"}
    except Exception as exc:
        return {"db": "error", "detail": str(exc)}


async def check_redis(redis_url: str) -> dict[str, Any]:
    """Ping Redis and return status."""
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(redis_url)
        await client.ping()
        await client.aclose()
        return {"redis": "ok"}
    except Exception as exc:
        return {"redis": "error", "detail": str(exc)}
