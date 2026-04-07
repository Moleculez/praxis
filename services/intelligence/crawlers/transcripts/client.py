"""Earnings call transcript client.

Data source: Vendor API (Bigdata.com recommended).
Rate limit: 1.0 req/sec default. Respects robots.txt.
"""

from __future__ import annotations

from services.intelligence.crawlers.models import RawItem


class TranscriptClient:
    """Fetches earnings call transcripts from a vendor API."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def fetch(
        self, ticker: str, year: int | None = None, quarter: int | None = None,
    ) -> list[RawItem]:
        """Fetch earnings call transcripts for a ticker.

        Args:
            ticker: Stock ticker symbol.
            year: Filter by fiscal year.
            quarter: Filter by fiscal quarter (1-4).

        Returns:
            List of RawItem with transcript metadata.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
