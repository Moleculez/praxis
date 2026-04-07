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


class LLMGateway:
    """Unified gateway for routing LLM calls to any provider.

    Supports three modes:
    - OpenRouter (default): single API key for Claude, GPT, Gemini, Grok, DeepSeek
    - Cline API: alternative unified gateway
    - Ollama (local): free local inference for development
    """

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "https://openrouter.ai/api/v1",
        use_local: bool = False,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3.1",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.use_local = use_local
        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model

    @property
    def effective_base_url(self) -> str:
        """Return Ollama URL when in local mode, otherwise gateway URL."""
        if self.use_local:
            return f"{self.ollama_base_url}/v1"
        return self.base_url

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Send a chat completion request.

        When use_local=True, the model parameter is ignored and
        ollama_model is used instead. The request is sent to
        Ollama's OpenAI-compatible endpoint at /v1/chat/completions.

        Args:
            model: Model identifier (e.g. 'anthropic/claude-opus-4.6').
                   Ignored when use_local=True.
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in the response.

        Returns:
            Response dict from the gateway.

        Raises:
            httpx.HTTPStatusError: After 3 retries on 429/5xx.
        """
        effective_model = self.ollama_model if self.use_local else model
        url = f"{self.effective_base_url}/chat/completions"

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if not self.use_local:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: dict[str, Any] = {
            "model": effective_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    resp.raise_for_status()
                    return resp.json()  # type: ignore[no-any-return]
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 429 or status >= 500:
                    last_exc = exc
                    wait = 2**attempt
                    logger.warning(
                        "LLM gateway %s (attempt %d/3), retrying in %ds",
                        status,
                        attempt + 1,
                        wait,
                    )
                    await asyncio.sleep(wait)
                    continue
                raise
        # All retries exhausted — re-raise the last exception.
        raise last_exc  # type: ignore[misc]

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
