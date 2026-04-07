"""News API client for financial news ingestion.

Data sources: NewsAPI, Marketaux, or GDELT (configurable).
Rate limit: 1.0 req/sec default. Respects robots.txt.
Twitter/X data: only via licensed vendors — never scrape raw.
"""

from __future__ import annotations

from services.intelligence.crawlers.models import RawItem


class NewsClient:
    """Fetches financial news articles from configured news APIs."""

    def __init__(self, api_key: str, provider: str = "newsapi") -> None:
        self.api_key = api_key
        self.provider = provider

    def fetch(
        self, query: str, from_date: str | None = None, to_date: str | None = None,
    ) -> list[RawItem]:
        """Fetch news articles matching a query.

        Args:
            query: Search query string.
            from_date: ISO-format start date filter.
            to_date: ISO-format end date filter.

        Returns:
            List of RawItem with article metadata.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
