"""Deduplication via semantic embedding (sentence-transformers/all-MiniLM-L6-v2, cosine > 0.92)."""

from __future__ import annotations

from typing import Any


def deduplicate_claims(
    claims: list[dict[str, Any]], threshold: float = 0.92,
) -> list[dict[str, Any]]:
    """Remove near-duplicate claims using cosine similarity on sentence embeddings.

    Uses sentence-transformers/all-MiniLM-L6-v2 for embedding and flags pairs
    with cosine similarity > threshold as duplicates.

    Args:
        claims: List of claim dicts, each containing at minimum a 'text' field.
        threshold: Cosine similarity threshold above which claims are duplicates.

    Returns:
        Deduplicated list of claim dicts.

    Raises:
        NotImplementedError: Stub — not yet implemented.
    """
    raise NotImplementedError
