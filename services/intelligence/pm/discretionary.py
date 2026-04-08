"""Discretionary PM — structures trade ideas with mandatory pre-mortem and kill criteria.

NEVER auto-executes. All ideas require human approval before any capital is deployed.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from .schemas import PMIdea

if TYPE_CHECKING:
    from services.intelligence.council.providers.gateway import LLMGateway

logger = logging.getLogger(__name__)

# Conviction-based position size caps (% of portfolio)
_CONVICTION_CAP: dict[str, float] = {
    "low": 0.005,
    "medium": 0.01,
    "high": 0.02,
}

_SYSTEM_PROMPT = """\
You are a discretionary portfolio manager. Your job is to produce a structured \
trade idea as JSON matching the PM_IDEA_V1 schema exactly.

Return ONLY valid JSON with these fields (no markdown, no explanation outside JSON):
{
  "schema_version": "PM_IDEA_V1",
  "ticker": "<string>",
  "direction": "long" | "short",
  "thesis": "<string>",
  "horizon": "<string, e.g. '2w', '3m'>",
  "entry_zone": [<float>, <float>],
  "stop_loss": <float, non-zero>,
  "target": <float>,
  "expected_value_pct": <float>,
  "win_prob": <float between 0 and 1>,
  "kelly_fraction": <float, f* = 0.5 * (p*b - q) / b>,
  "conviction": "low" | "medium" | "high",
  "pre_mortem": "<string>",
  "kill_criteria": ["<string>", ...]
}

Rules:
- pre_mortem: Use the Klein pre-mortem technique. Imagine it is [horizon] from now \
and this trade has failed completely. Write the most likely story of why it failed. \
This must be substantive (at least 2 sentences).
- kill_criteria: Each criterion must be a specific observable condition — a price \
level, a date, or a measurable data point. No narrative conditions. At least one \
criterion is required.
- kelly_fraction: Calculate as f* = (p*b - q) / b where p = win_prob, q = 1-p, \
b = target/stop_loss ratio. Then apply a 0.5 haircut (multiply by 0.5). \
Cap by conviction: low=0.5%, medium=1.0%, high=2.0%.
- stop_loss must be non-zero.
- entry_zone must be a two-element array [low, high].
"""

_REVIEW_SYSTEM_PROMPT = """\
You are a discretionary portfolio manager reviewing an existing trade idea. \
Given the original thesis and fresh market context, reassess the trade.

Return ONLY valid JSON:
{
  "recommendation": "hold" | "exit",
  "reason": "<string>",
  "new_probability": <float between 0 and 1>,
  "kill_criteria_fired": ["<string>", ...]
}
"""


class DiscretionaryPM:
    """Generates and reviews discretionary trade ideas.

    Enforces pre-mortem analysis (Klein technique) and mechanical kill criteria
    on every idea. Ideas are structured but never auto-executed.
    """

    # HARD RULE: Never auto-execute. Sleeve cap 20%, <=8 positions, <=2% per position.

    def __init__(
        self,
        gateway: LLMGateway,
        model: str = "anthropic/claude-opus-4.6",
    ) -> None:
        self._gateway = gateway
        self._model = model

    async def generate_idea(self, thesis: str, context: dict[str, Any]) -> PMIdea:
        """Generate a structured trade idea with mandatory pre-mortem and kill criteria.

        Args:
            thesis: The investment thesis in plain text.
            context: Supporting data (council output, claim graph, market data).

        Returns:
            A fully structured and validated PMIdea.
        """
        user_content = self._build_user_message(thesis, context)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        text = await self._gateway.complete_text(
            model=self._model,
            messages=messages,
            temperature=0.2,
        )

        idea = self._parse_response(text)
        if idea is None:
            # One retry with corrective prompt
            logger.warning("First parse failed, retrying with corrective prompt")
            messages.append({"role": "assistant", "content": text})
            messages.append({
                "role": "user",
                "content": (
                    "Your response was not valid JSON matching PM_IDEA_V1. "
                    "Return ONLY the raw JSON object, no markdown fences, "
                    "no explanation. entry_zone must be a two-element array."
                ),
            })
            text = await self._gateway.complete_text(
                model=self._model,
                messages=messages,
                temperature=0.1,
            )
            idea = self._parse_response(text)
            if idea is None:
                msg = "Failed to parse PMIdea from LLM after retry"
                raise ValueError(msg)

        idea = self._post_validate(idea)
        return idea

    async def review_at_horizon(
        self,
        idea_id: str,
        original_thesis: str,
        new_context: dict[str, Any],
    ) -> dict[str, Any]:
        """Review a trade idea at its stated horizon.

        Args:
            idea_id: Identifier of the trade idea to review.
            original_thesis: The original investment thesis.
            new_context: Fresh market data and any kill criteria to check.

        Returns:
            Review dict with recommendation, reason, and new_probability.
        """
        user_content = (
            f"Trade idea ID: {idea_id}\n\n"
            f"Original thesis:\n{original_thesis}\n\n"
            f"Fresh context:\n{json.dumps(new_context, indent=2, default=str)}\n\n"
            "Reassess this trade. Check if any kill criteria have fired. "
            "If the new probability differs from the original by more than "
            "0.20 absolute, recommend exit."
        )

        messages = [
            {"role": "system", "content": _REVIEW_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        text = await self._gateway.complete_text(
            model=self._model,
            messages=messages,
            temperature=0.2,
        )

        review = self._parse_json(text)
        if review is None:
            msg = "Failed to parse review response from LLM"
            raise ValueError(msg)

        # Enforce exit recommendation if probability delta exceeds threshold
        original_prob = new_context.get("original_win_prob", 0.5)
        new_prob = float(review.get("new_probability", original_prob))
        delta = abs(new_prob - original_prob)
        if delta > 0.20:
            review["recommendation"] = "exit"
            if "probability delta" not in review.get("reason", ""):
                review["reason"] = (
                    f"Probability delta {delta:.2f} exceeds 0.20 threshold. "
                    + review.get("reason", "")
                )

        return review

    @staticmethod
    def _build_user_message(thesis: str, context: dict[str, Any]) -> str:
        """Build the user message from thesis and context."""
        parts = [f"Thesis:\n{thesis}"]

        ticker = context.get("ticker")
        if ticker:
            parts.append(f"Ticker: {ticker}")

        synthesis = context.get("council_synthesis")
        if synthesis:
            parts.append(
                f"Council synthesis:\n{json.dumps(synthesis, indent=2, default=str)}"
            )

        # Include any additional context keys
        for key, value in context.items():
            if key in ("ticker", "council_synthesis"):
                continue
            parts.append(f"{key}:\n{json.dumps(value, indent=2, default=str)}")

        return "\n\n".join(parts)

    @staticmethod
    def _strip_fences(text: str) -> str:
        """Strip markdown code fences from LLM output."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)
        return cleaned

    @classmethod
    def _parse_json(cls, text: str) -> dict[str, Any] | None:
        """Extract JSON dict from LLM text."""
        cleaned = cls._strip_fences(text)
        try:
            return json.loads(cleaned)  # type: ignore[no-any-return]
        except json.JSONDecodeError:
            logger.warning("JSON parse failed for text: %.200s", cleaned)
            return None

    @classmethod
    def _parse_response(cls, text: str) -> PMIdea | None:
        """Parse LLM response text into a PMIdea."""
        cleaned = cls._strip_fences(text)
        try:
            return PMIdea.model_validate_json(cleaned)
        except Exception:
            logger.warning("PMIdea parse failed for text: %.200s", cleaned)
            return None

    @staticmethod
    def _post_validate(idea: PMIdea) -> PMIdea:
        """Enforce hard constraints in code, not just LLM prose."""
        if idea.stop_loss == 0:
            msg = "stop_loss must be non-zero"
            raise ValueError(msg)

        if not idea.pre_mortem or not idea.pre_mortem.strip():
            msg = "pre_mortem is mandatory"
            raise ValueError(msg)

        if not idea.kill_criteria:
            msg = "kill_criteria must contain at least one criterion"
            raise ValueError(msg)

        # Clamp kelly_fraction to conviction cap
        cap = _CONVICTION_CAP[idea.conviction]
        if idea.kelly_fraction > cap:
            logger.info(
                "Clamping kelly_fraction from %.4f to %.4f (conviction=%s)",
                idea.kelly_fraction,
                cap,
                idea.conviction,
            )
            idea = idea.model_copy(update={"kelly_fraction": cap})

        return idea
