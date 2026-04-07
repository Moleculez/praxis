"""SEC EDGAR client for fetching company filings (10-K, 10-Q, 8-K, etc.).

Data source: https://data.sec.gov/submissions/
Rate limit: 0.1 req/sec (10s between requests) per SEC fair access policy.
Respects robots.txt. User-Agent must include company name and contact email per SEC guidelines.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from services.intelligence.crawlers.models import RawItem

logger = logging.getLogger(__name__)

_SUBMISSIONS_BASE = "https://data.sec.gov/submissions"
_FILING_BASE = "https://www.sec.gov/Archives/edgar/data"
_RATE_LIMIT_SECONDS = 10.0


class EdgarClient:
    """Fetches SEC EDGAR filings for a given company."""

    def __init__(self, user_agent: str) -> None:
        self.user_agent = user_agent
        self._last_request_at: float = 0.0

    def fetch(self, cik: str, filing_type: str = "10-K", count: int = 10) -> list[RawItem]:
        """Fetch filings from EDGAR.

        Uses the SEC EDGAR submissions API to retrieve recent filings for
        a given CIK, filtered by filing type.

        Args:
            cik: Central Index Key for the entity (with or without leading zeros).
            filing_type: SEC filing type to filter (10-K, 10-Q, 8-K, etc.).
            count: Maximum number of filings to return.

        Returns:
            List of RawItem with filing metadata.
        """
        padded_cik = cik.zfill(10)
        url = f"{_SUBMISSIONS_BASE}/CIK{padded_cik}.json"
        data = self._get(url)

        recent: dict[str, Any] = data.get("recentFilings", data.get("filings", {}).get("recent", {}))
        if not recent:
            logger.warning("No recent filings found for CIK %s", cik)
            return []

        forms: list[str] = recent.get("form", [])
        accession_numbers: list[str] = recent.get("accessionNumber", [])
        filing_dates: list[str] = recent.get("filingDate", [])
        primary_docs: list[str] = recent.get("primaryDocument", [])
        descriptions: list[str] = recent.get("primaryDocDescription", [])

        items: list[RawItem] = []
        for i, form in enumerate(forms):
            if form != filing_type:
                continue
            if len(items) >= count:
                break

            accession = accession_numbers[i].replace("-", "")
            doc = primary_docs[i] if i < len(primary_docs) else ""
            filing_url = f"{_FILING_BASE}/{padded_cik}/{accession}/{doc}"
            description = descriptions[i] if i < len(descriptions) else ""
            published_at = _parse_filing_date(filing_dates[i] if i < len(filing_dates) else "")

            items.append(
                RawItem(
                    source="edgar",
                    url=filing_url,
                    title=f"{form} — {data.get('name', cik)}",
                    content=description or f"{form} filing",
                    published_at=published_at,
                    metadata={
                        "cik": cik,
                        "form": form,
                        "accession_number": accession_numbers[i],
                        "filing_date": filing_dates[i] if i < len(filing_dates) else "",
                    },
                ),
            )

        return items

    # ------------------------------------------------------------------
    # HTTP helper with rate limiting
    # ------------------------------------------------------------------

    def _get(self, url: str) -> dict[str, Any]:
        """Issue a GET request respecting SEC fair access rate limits."""
        self._rate_limit()
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            result: dict[str, Any] = response.json()
        return result

    def _rate_limit(self) -> None:
        """Enforce SEC fair access policy (10s between requests)."""
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < _RATE_LIMIT_SECONDS:
            time.sleep(_RATE_LIMIT_SECONDS - elapsed)
        self._last_request_at = time.monotonic()


def _parse_filing_date(raw: str) -> datetime | None:
    """Parse an EDGAR filing date (YYYY-MM-DD)."""
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        logger.warning("Could not parse EDGAR date: %s", raw)
        return None
