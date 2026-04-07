"""FRED API client for macroeconomic time series data.

Data source: https://api.stlouisfed.org/fred
Rate limit: 1.0 req/sec default.
Requires API key (env var FRED_API_KEY). Respects robots.txt.
"""

from __future__ import annotations

from services.intelligence.crawlers.models import RawItem


class FredClient:
    """Fetches macroeconomic series from the FRED API."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def fetch(
        self, series_id: str, start_date: str | None = None, end_date: str | None = None,
    ) -> list[RawItem]:
        """Fetch a FRED time series.

        Args:
            series_id: FRED series identifier (e.g. 'GDP', 'UNRATE').
            start_date: ISO-format start date filter.
            end_date: ISO-format end date filter.

        Returns:
            List of RawItem with observation data.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
