"""Health check route."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import text

from services.backend.config import get_settings

router = APIRouter()


@router.get("/health")
async def health_check(request: Request) -> dict[str, Any]:
    settings = get_settings()
    checks: dict[str, Any] = {"status": "ok", "database": "unknown"}
    try:
        engine = request.app.state.engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        checks["status"] = "degraded"

    checks["llm_keys"] = bool(
        settings.openrouter_api_key
        or settings.anthropic_api_key
        or settings.openai_api_key
        or settings.use_local_llm
    )
    checks["alpaca_keys"] = bool(settings.alpaca_api_key and settings.alpaca_secret_key)
    return checks
