"""Council synthesis — aggregates persona outputs, preserves disagreements."""

from __future__ import annotations

from .schemas import CouncilOutput


def synthesize_council_outputs(outputs: list[CouncilOutput]) -> dict[str, object]:
    """Aggregate council persona outputs into a unified synthesis.

    Preserves areas of disagreement and computes Brier-weighted consensus
    probability. Disputes are surfaced explicitly rather than averaged away.

    Args:
        outputs: List of CouncilOutput from each persona.

    Returns:
        Synthesis dict with consensus, disputes, and weighted probability.

    Raises:
        NotImplementedError: Stub — not yet implemented.
    """
    raise NotImplementedError
