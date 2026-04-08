"""LLM gateway client supporting OpenRouter, Cline API, and local Ollama.

Routes calls through a single OpenAI-compatible endpoint. For dev without
API keys, set USE_LOCAL_LLM=true to route all calls through Ollama.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def _make_llm_client(base_url: str) -> httpx.AsyncClient:
    """Create an async client, bypassing proxy for localhost (Ollama)."""
    from services.backend.http_client import make_async_client

    return make_async_client(timeout=120.0, base_url="")



class LLMGateway:
    """Unified gateway for routing LLM calls to any provider.

    Supports multiple modes:
    - OpenRouter (default): single API key for Claude, GPT, Gemini, Grok, DeepSeek
    - Cline API: alternative unified gateway
    - Ollama (local): free local inference for development
    - Direct providers: Anthropic, OpenAI, Google with their own API keys
    """

    PROVIDER_URLS: dict[str, str] = {
        "anthropic": "https://api.anthropic.com/v1",
        "openai": "https://api.openai.com/v1",
        "google": "https://generativelanguage.googleapis.com/v1beta",
        "openrouter": "https://openrouter.ai/api/v1",
    }

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "https://openrouter.ai/api/v1",
        use_local: bool = False,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3.1",
        provider: str = "openrouter",
        anthropic_api_key: str = "",
        openai_api_key: str = "",
        google_api_key: str = "",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.use_local = use_local
        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model
        self.provider = provider
        self._provider_keys: dict[str, str] = {
            "anthropic": anthropic_api_key,
            "openai": openai_api_key,
            "google": google_api_key,
            "openrouter": api_key,
        }

        # If use_local is set, treat provider as ollama for backwards compat
        if self.use_local:
            self.provider = "ollama"

    @property
    def effective_base_url(self) -> str:
        """Return the base URL for the active provider."""
        if self.provider == "ollama":
            # Use 127.0.0.1 instead of localhost to avoid Windows proxy issues
            url = self.ollama_base_url.replace("localhost", "127.0.0.1")
            return f"{url}/v1"
        if self.provider in self.PROVIDER_URLS:
            return self.PROVIDER_URLS[self.provider]
        return self.base_url

    def _is_anthropic(self) -> bool:
        """Check whether to use the Anthropic Messages API format."""
        return self.provider == "anthropic" and bool(
            self._provider_keys.get("anthropic")
        )

    def _build_headers(self) -> dict[str, str]:
        """Build request headers based on the active provider."""
        headers: dict[str, str] = {"Content-Type": "application/json"}

        if self.provider == "ollama":
            return headers

        if self._is_anthropic():
            headers["x-api-key"] = self._provider_keys["anthropic"]
            headers["anthropic-version"] = "2023-06-01"
            return headers

        # OpenAI, Google, and OpenRouter all use Bearer auth
        key = self._provider_keys.get(self.provider, self.api_key)
        if key:
            headers["Authorization"] = f"Bearer {key}"

        return headers

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Send a chat completion request.

        Routes to the correct provider based on ``self.provider``.
        When provider is ``"ollama"``, the *model* parameter is
        ignored and ``ollama_model`` is used instead.

        Args:
            model: Model identifier (e.g. 'anthropic/claude-opus-4.6').
                   Ignored when provider is ``"ollama"``.
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in the response.

        Returns:
            Response dict from the gateway. For Anthropic direct calls
            the response is normalised into OpenAI-compatible shape.

        Raises:
            httpx.HTTPStatusError: After 3 retries on 429/5xx.
        """
        effective_model = self.ollama_model if self.provider == "ollama" else model
        headers = self._build_headers()

        # Anthropic Messages API uses a different endpoint and payload shape
        if self._is_anthropic():
            url = f"{self.effective_base_url}/messages"
            # Separate system message from the rest
            system_text = ""
            api_messages: list[dict[str, str]] = []
            for msg in messages:
                if msg["role"] == "system":
                    system_text = msg["content"]
                else:
                    api_messages.append(msg)

            payload: dict[str, Any] = {
                "model": effective_model,
                "messages": api_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if system_text:
                payload["system"] = system_text
        else:
            url = f"{self.effective_base_url}/chat/completions"
            payload = {
                "model": effective_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                async with _make_llm_client(self.effective_base_url) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    resp.raise_for_status()
                    data: dict[str, Any] = resp.json()

                    # Normalise Anthropic Messages response into
                    # OpenAI-compatible shape so callers stay uniform.
                    if self._is_anthropic() and "choices" not in data:
                        content_text = "".join(
                            block.get("text", "")
                            for block in data.get("content", [])
                            if block.get("type") == "text"
                        )
                        data = {
                            "choices": [
                                {"message": {"role": "assistant", "content": content_text}}
                            ],
                            "model": data.get("model", effective_model),
                            "usage": data.get("usage", {}),
                        }

                    return data
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 429 or status >= 500:
                    last_exc = exc
                    wait = 2**attempt
                    logger.warning(
                        "LLM gateway HTTP %s (attempt %d/3), retrying in %ds",
                        status,
                        attempt + 1,
                        wait,
                    )
                    await asyncio.sleep(wait)
                    continue
                raise
            except (httpx.ConnectError, httpx.RemoteProtocolError, httpx.ReadError) as exc:
                last_exc = exc
                wait = 2**attempt
                logger.warning(
                    "LLM gateway connection error: %s (attempt %d/3), retrying in %ds",
                    exc,
                    attempt + 1,
                    wait,
                )
                await asyncio.sleep(wait)
                continue

        # All retries exhausted — raise with a clear message.
        msg = f"LLM provider '{self.provider}' unreachable after 3 attempts"
        if self.provider == "ollama":
            msg += f". Is Ollama running at {self.ollama_base_url}? Try: ollama serve"
        raise ConnectionError(msg) from last_exc

    async def complete_text(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """Convenience wrapper that returns only the assistant text.

        Args:
            model: Model identifier.
            messages: Conversation messages.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens.

        Returns:
            The assistant's message content string.
        """
        data = await self.complete(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return data["choices"][0]["message"]["content"]  # type: ignore[no-any-return]
