"""SEC EDGAR client for fetching company filings (10-K, 10-Q, 8-K, etc.).

Data source: https://www.sec.gov/cgi-bin/browse-edgar
Rate limit: 0.1 req/sec (10s between requests) per SEC fair access policy.
Respects robots.txt. User-Agent must include company name and contact email per SEC guidelines.
"""

from __future__ import annotations

from services.intelligence.crawlers.models import RawItem


class EdgarClient:
    """Fetches SEC EDGAR filings for a given company."""

    def __init__(self, user_agent: str) -> None:
        self.user_agent = user_agent

    def fetch(self, cik: str, filing_type: str = "10-K", count: int = 10) -> list[RawItem]:
        """Fetch filings from EDGAR.

        Args:
            cik: Central Index Key for the entity.
            filing_type: SEC filing type (10-K, 10-Q, 8-K, etc.).
            count: Maximum number of filings to return.

        Returns:
            List of RawItem with filing metadata.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
