"""Claim validation — deduplication, extraction, and multi-source corroboration."""

from services.intelligence.validation.claim_extraction import extract_claims
from services.intelligence.validation.corroboration import corroborate_claims
from services.intelligence.validation.dedup import deduplicate_claims

__all__ = [
    "corroborate_claims",
    "deduplicate_claims",
    "extract_claims",
]
