"""Atomic claim extraction. Types: fact, opinion, forecast."""

from __future__ import annotations

from typing import Any, Literal


def extract_claims(
    text: str,
    claim_types: list[Literal["fact", "opinion", "forecast"]] | None = None,
) -> list[dict[str, Any]]:
    """Extract atomic claims from unstructured text.

    Each extracted claim is tagged with a type (fact, opinion, or forecast),
    a source reference, and a confidence score.

    Args:
        text: Raw text to extract claims from.
        claim_types: Optional filter for which claim types to extract.

    Returns:
        List of claim dicts with keys: text, type, confidence, source_span.

    Raises:
        NotImplementedError: Stub — not yet implemented.
    """
    raise NotImplementedError
