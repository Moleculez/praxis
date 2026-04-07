"""OpenRouter / Cline API gateway client. Single endpoint for all LLM providers."""

from __future__ import annotations

from typing import Any


class LLMGateway:
    """Unified gateway for routing LLM calls to any provider via OpenRouter or Cline API."""

    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1") -> None:
        self.api_key = api_key
        self.base_url = base_url

    def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Send a chat completion request through the gateway.

        Args:
            model: Model identifier (e.g. 'anthropic/claude-opus-4.6').
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in the response.

        Returns:
            Response dict from the gateway.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
