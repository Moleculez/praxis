"""Council synthesis — aggregates persona outputs, preserves disagreements."""

from __future__ import annotations

from .schemas import CouncilOutput


def synthesize_council_outputs(
    outputs: list[CouncilOutput],
    weights: dict[str, float] | None = None,
) -> dict[str, object]:
    """Aggregate council persona outputs into a unified synthesis.

    Preserves areas of disagreement and computes Brier-weighted consensus
    probability. Disputes are surfaced explicitly rather than averaged away.

    Args:
        outputs: List of CouncilOutput from each persona.
        weights: Optional mapping of persona_id -> brier_weight.
                 Defaults to 1.0 for every persona.

    Returns:
        Synthesis dict with consensus, disputes, and weighted probability.
    """
    if not outputs:
        return {
            "consensus": "n/a",
            "probability": 0.0,
            "probability_range": (0.0, 0.0),
            "spread": 0.0,
            "n_personas": 0,
            "disagreements": [],
            "assessments": [],
            "summary": "No council outputs provided.",
        }

    weights = weights or {}

    # -- weighted probability -------------------------------------------------
    total_weight = 0.0
    weighted_sum = 0.0
    probabilities: list[float] = []

    for out in outputs:
        w = weights.get(out.persona_id, 1.0)
        weighted_sum += out.probability_thesis_correct * w
        total_weight += w
        probabilities.append(out.probability_thesis_correct)

    weighted_probability = weighted_sum / total_weight if total_weight else 0.0

    # -- spread & consensus ---------------------------------------------------
    prob_min = min(probabilities)
    prob_max = max(probabilities)
    spread = prob_max - prob_min

    if spread < 0.15:
        consensus = "strong"
    elif spread < 0.30:
        consensus = "moderate"
    else:
        consensus = "divided"

    # -- disputed claims & assessments ----------------------------------------
    all_disputed: list[str] = []
    assessments: list[dict[str, object]] = []

    for out in outputs:
        all_disputed.extend(out.key_claims_disputed)
        assessments.append(
            {
                "persona_id": out.persona_id,
                "probability": out.probability_thesis_correct,
                "confidence": out.confidence,
                "assessment": out.thesis_assessment,
                "mechanism": out.mechanism,
                "falsification_test": out.falsification_test,
            }
        )

    # Deduplicate disputed claims while preserving order.
    seen: set[str] = set()
    unique_disputed: list[str] = []
    for claim in all_disputed:
        if claim not in seen:
            seen.add(claim)
            unique_disputed.append(claim)

    # -- summary string -------------------------------------------------------
    summary = (
        f"Council ({len(outputs)} personas): "
        f"consensus={consensus}, "
        f"P(thesis)={weighted_probability:.2f} "
        f"[{prob_min:.2f}–{prob_max:.2f}], "
        f"spread={spread:.2f}."
    )
    if unique_disputed:
        summary += f" {len(unique_disputed)} disputed claim(s)."

    return {
        "consensus": consensus,
        "probability": round(weighted_probability, 4),
        "probability_range": (round(prob_min, 4), round(prob_max, 4)),
        "spread": round(spread, 4),
        "n_personas": len(outputs),
        "disagreements": unique_disputed,
        "assessments": assessments,
        "summary": summary,
    }
