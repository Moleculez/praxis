"""Council runner — orchestrates multi-LLM thesis evaluation."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

import yaml

from services.intelligence.council.providers.gateway import LLMGateway
from services.intelligence.council.schemas import CouncilOutput
from services.intelligence.council.synthesis import synthesize_council_outputs

logger = logging.getLogger(__name__)

_PERSONAS_PATH = Path(__file__).parent / "personas.yaml"

# Module-level cache — personas.yaml is read once per process.
_personas_cache: list[dict[str, Any]] | None = None

# Default cross-provider model for the red_team persona.
_RED_TEAM_DEFAULT_MODEL = "openai/gpt-5.4"

_JSON_OUTPUT_INSTRUCTIONS = """
Respond ONLY with valid JSON matching this schema (no markdown fences, no preamble):
{
  "schema_version": "COUNCIL_OUTPUT_V1",
  "persona_id": "<your persona id>",
  "thesis_assessment": "<your assessment>",
  "key_claims_used": ["claim1", "claim2"],
  "key_claims_disputed": ["claim1"],
  "mechanism": "<causal mechanism>",
  "falsification_test": "<how to disprove>",
  "probability_thesis_correct": 0.65,
  "outcome_distribution": {"bull": 0.4, "base": 0.35, "bear": 0.25},
  "horizon": "<e.g. 3 months>",
  "confidence": "low|medium|high"
}
""".strip()


class CouncilRunner:
    """Orchestrates the multi-LLM PhD council evaluation."""

    def __init__(self, gateway: LLMGateway) -> None:
        self._gateway = gateway
        self._personas = self._load_personas()

    # ------------------------------------------------------------------
    # Persona loading
    # ------------------------------------------------------------------

    @staticmethod
    def _load_personas() -> list[dict[str, Any]]:
        """Load persona definitions from YAML (cached after first read)."""
        global _personas_cache  # noqa: PLW0603
        if _personas_cache is None:
            with open(_PERSONAS_PATH) as f:
                data = yaml.safe_load(f)
            _personas_cache = data["personas"]
        return _personas_cache  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def evaluate_thesis(
        self,
        thesis: str,
        ticker: str = "",
        context: str = "",
    ) -> dict[str, Any]:
        """Run the full PhD council on a thesis and return weighted synthesis.

        Args:
            thesis: The investment thesis text.
            ticker: Optional ticker symbol for context.
            context: Optional additional context.

        Returns:
            Synthesis dict from ``synthesize_council_outputs``.
        """
        tasks = [
            self._evaluate_persona(persona, thesis, ticker, context)
            for persona in self._personas
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        outputs: list[CouncilOutput] = []
        for persona, result in zip(self._personas, results):
            if isinstance(result, Exception):
                logger.warning(
                    "Persona %s failed: %s", persona["id"], result,
                )
                continue
            if result is not None:
                outputs.append(result)

        weights = {p["id"]: p.get("brier_weight", 1.0) for p in self._personas}
        return synthesize_council_outputs(outputs, weights)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _evaluate_persona(
        self,
        persona: dict[str, Any],
        thesis: str,
        ticker: str,
        context: str,
    ) -> CouncilOutput | None:
        """Run a single persona evaluation with one retry on parse failure."""
        model = persona["provider"]
        if model == "dynamic":
            model = _RED_TEAM_DEFAULT_MODEL

        system_message = (
            f"{persona['system_prompt']}\n\n"
            f"Your persona_id is \"{persona['id']}\".\n\n"
            f"{_JSON_OUTPUT_INSTRUCTIONS}"
        )

        user_message = f"Thesis: {thesis}"
        if ticker:
            user_message += f"\nTicker: {ticker}"
        if context:
            user_message += f"\nAdditional context: {context}"

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

        text = await self._gateway.complete_text(
            model=model, messages=messages, temperature=0.3,
        )

        output = self._try_parse(text, persona["id"])
        if output is not None:
            return output

        # Retry once with a corrective prompt.
        logger.info("Retrying persona %s after JSON parse failure.", persona["id"])
        messages.append({"role": "assistant", "content": text})
        messages.append({
            "role": "user",
            "content": (
                "Your previous response was not valid JSON. "
                "Please respond ONLY with valid JSON matching the schema above."
            ),
        })

        text = await self._gateway.complete_text(
            model=model, messages=messages, temperature=0.2,
        )

        output = self._try_parse(text, persona["id"])
        if output is None:
            logger.warning("Persona %s failed JSON parse after retry, skipping.", persona["id"])
        return output

    @staticmethod
    def _try_parse(text: str, persona_id: str) -> CouncilOutput | None:
        """Attempt to parse LLM text as CouncilOutput."""
        # Strip markdown code fences if present.
        cleaned = text.strip()
        if cleaned.startswith("```"):
            first_newline = cleaned.index("\n")
            cleaned = cleaned[first_newline + 1 :]
            if cleaned.endswith("```"):
                cleaned = cleaned[: -3]
            cleaned = cleaned.strip()

        try:
            return CouncilOutput.model_validate_json(cleaned)
        except Exception:
            # Try parsing as dict and injecting persona_id if missing.
            try:
                data = json.loads(cleaned)
                if isinstance(data, dict):
                    data.setdefault("persona_id", persona_id)
                    return CouncilOutput.model_validate(data)
            except Exception:
                pass
        return None
