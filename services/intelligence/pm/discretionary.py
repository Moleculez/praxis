"""Discretionary PM — structures trade ideas with mandatory pre-mortem and kill criteria.

NEVER auto-executes. All ideas require human approval before any capital is deployed.
"""

from __future__ import annotations

from typing import Any

from .schemas import PMIdea


class DiscretionaryPM:
    """Generates and reviews discretionary trade ideas.

    Enforces pre-mortem analysis (Klein technique) and mechanical kill criteria
    on every idea. Ideas are structured but never auto-executed.
    """

    # HARD RULE: Never auto-execute. Sleeve cap 20%, <=8 positions, <=2% per position.

    def generate_idea(self, thesis: str, context: dict[str, Any]) -> PMIdea:
        """Generate a structured trade idea with mandatory pre-mortem and kill criteria.

        Args:
            thesis: The investment thesis in plain text.
            context: Supporting data (council output, claim graph, market data).

        Returns:
            A fully structured PMIdea.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError

    def review_at_horizon(self, idea_id: str) -> dict[str, Any]:
        """Review a trade idea at its stated horizon for Brier scoring.

        Args:
            idea_id: Identifier of the trade idea to review.

        Returns:
            Review dict with outcome, score, and lessons.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
