"""LLM gateway client supporting OpenRouter, Cline API, and local Ollama.

Routes calls through a single OpenAI-compatible endpoint. For dev without
API keys, set USE_LOCAL_LLM=true to route all calls through Ollama.
"""

from __future__ import annotations

from typing import Any


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

    def complete(
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
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
