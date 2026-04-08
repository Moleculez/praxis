"""FRED API client for macroeconomic time series data.

Data source: https://api.stlouisfed.org/fred
Rate limit: 1.0 req/sec default.
Requires API key (env var FRED_API_KEY). Respects robots.txt.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime

from services.backend.http_client import make_sync_client
from services.intelligence.crawlers.models import RawItem

_FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
_TIMEOUT = 15.0

logger = logging.getLogger(__name__)


class FredClient:
    """Fetches macroeconomic series from the FRED API."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self._last_request: float = 0.0
        self._http = make_sync_client(timeout=_TIMEOUT)

    def _rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        self._last_request = time.monotonic()

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
        """
        if not self.api_key:
            logger.warning("FRED_API_KEY not set — returning empty list for %s", series_id)
            return []

        self._rate_limit()

        params: dict[str, str] = {
            "series_id": series_id,
            "api_key": self.api_key,
            "file_type": "json",
        }
        if start_date:
            params["observation_start"] = start_date
        if end_date:
            params["observation_end"] = end_date

        resp = self._http.get(_FRED_BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

        observations = data.get("observations", [])
        items: list[RawItem] = []
        for obs in observations:
            date_str = obs.get("date", "")
            value_str = obs.get("value", ".")

            published = None
            if date_str:
                try:
                    published = datetime.fromisoformat(date_str)
                except ValueError:
                    pass

            items.append(
                RawItem(
                    source="fred",
                    url=f"https://fred.stlouisfed.org/series/{series_id}",
                    title=f"{series_id} {date_str}",
                    content=f"{series_id}={value_str} on {date_str}",
                    published_at=published,
                    metadata={
                        "series_id": series_id,
                        "date": date_str,
                        "value": value_str,
                    },
                )
            )
        return items
