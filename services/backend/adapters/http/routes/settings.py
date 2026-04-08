"""Application settings routes."""

from __future__ import annotations

from fastapi import APIRouter

from services.backend.config import get_settings

router = APIRouter()


@router.get("/")
async def get_app_settings() -> dict:
    """Return current configuration status (no secrets exposed)."""
    settings = get_settings()
    return {
        "broker": {
            "alpaca_configured": bool(settings.alpaca_api_key),
        },
        "llm": {
            "openrouter_configured": bool(settings.openrouter_api_key),
            "anthropic_configured": bool(settings.anthropic_api_key),
            "openai_configured": bool(settings.openai_api_key),
            "google_configured": bool(settings.google_ai_api_key),
            "xai_configured": bool(settings.xai_api_key),
            "ollama_configured": settings.use_local_llm,
            "ollama_model": settings.ollama_model,
        },
        "database": (
            settings.database_url.split("///")[0]
            if "///" in settings.database_url
            else "postgres"
        ),
    }


@router.get("/llm/test")
async def test_llm_connection() -> dict:
    """Test the currently configured LLM provider."""
    settings = get_settings()

    from services.intelligence.council.providers.gateway import LLMGateway

    gateway = LLMGateway(
        api_key=settings.openrouter_api_key,
        use_local=settings.use_local_llm,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        anthropic_api_key=settings.anthropic_api_key,
        openai_api_key=settings.openai_api_key,
        google_api_key=settings.google_ai_api_key,
    )
    try:
        result = await gateway.complete_text(
            model="anthropic/claude-sonnet-4.6",
            messages=[{"role": "user", "content": "Say 'connected' in one word."}],
            max_tokens=10,
        )
        return {"status": "connected", "response": result[:100]}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


@router.get("/broker/test")
async def test_broker_connection() -> dict:
    """Test the currently configured broker."""
    settings = get_settings()
    if settings.alpaca_api_key:
        try:
            from services.research.execution.paper import PaperTrader

            trader = PaperTrader(
                settings.alpaca_api_key,
                settings.alpaca_secret_key,
                settings.alpaca_base_url,
            )
            acct = trader.get_account()
            return {
                "status": "connected",
                "broker": "alpaca",
                "account_id": acct.get("id", ""),
                "equity": acct.get("equity", "0"),
            }
        except Exception as exc:
            return {"status": "error", "broker": "alpaca", "error": str(exc)}
    return {"status": "not_configured", "broker": "none"}
