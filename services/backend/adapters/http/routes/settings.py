"""Application settings routes."""

from __future__ import annotations

import platform
import sys

from fastapi import APIRouter

from services.backend.config import get_settings

router = APIRouter()


@router.get("/system")
async def get_system_info() -> dict:
    """Return basic system information for the info card."""
    settings = get_settings()
    return {
        "python_version": sys.version.split()[0],
        "platform": platform.system(),
        "database": "sqlite" if settings.is_sqlite else "postgres",
        "debug": settings.debug,
    }


@router.get("/")
async def get_app_settings() -> dict:
    """Return current configuration status (no secrets exposed)."""
    settings = get_settings()
    return {
        "broker": {
            "active": settings.broker,
            "alpaca_configured": bool(settings.alpaca_api_key),
            "ibkr_configured": bool(settings.ibkr_account_id),
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
        "proxy": {
            "http_proxy": bool(settings.http_proxy),
            "no_proxy": settings.no_proxy,
        },
    }


@router.get("/llm/test")
async def test_llm_connection() -> dict:
    """Test the currently configured LLM provider."""
    settings = get_settings()

    # Detect which provider and model to use
    if settings.use_local_llm:
        provider = "ollama"
        model = settings.ollama_model
    elif settings.openrouter_api_key:
        provider = "openrouter"
        model = "anthropic/claude-sonnet-4.6"
    elif settings.anthropic_api_key:
        provider = "anthropic"
        model = "claude-sonnet-4-6-20250514"
    elif settings.openai_api_key:
        provider = "openai"
        model = "gpt-4o-mini"
    else:
        return {
            "status": "not_configured",
            "error": "No LLM API key configured. Set OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, or USE_LOCAL_LLM=true in .env",
        }

    from services.intelligence.council.providers.gateway import LLMGateway

    gateway = LLMGateway(
        api_key=settings.openrouter_api_key,
        use_local=settings.use_local_llm,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        provider=provider,
        anthropic_api_key=settings.anthropic_api_key,
        openai_api_key=settings.openai_api_key,
        google_api_key=settings.google_ai_api_key,
    )
    try:
        result = await gateway.complete_text(
            model=model,
            messages=[{"role": "user", "content": "Say 'connected' in one word."}],
            max_tokens=10,
        )
        return {"status": "connected", "provider": provider, "model": model, "response": result[:100]}
    except ConnectionError as exc:
        return {"status": "error", "provider": provider, "error": str(exc)}
    except Exception as exc:
        error_msg = str(exc)
        if "connect" in error_msg.lower() or "disconnect" in error_msg.lower():
            if provider == "ollama":
                error_msg += f". Is Ollama running? Try: ollama serve && ollama pull {model}"
        return {"status": "error", "provider": provider, "error": error_msg}


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
