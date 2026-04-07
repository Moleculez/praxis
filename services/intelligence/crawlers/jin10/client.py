"""Jin10 client for Chinese financial flash news and economic calendar.

Data source: https://jin10.com
  - Flash news: flash-api.jin10.com
  - Economic calendar: jin10.com calendar API
Rate limit: 1.0 req/sec. Content is in Chinese (Simplified).
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from services.intelligence.crawlers.models import RawItem

logger = logging.getLogger(__name__)

_FLASH_BASE = "https://flash-api.jin10.com/get_flash_list"
_CALENDAR_BASE = "https://cdn-cache.jin10.com/web/calendar"
_RATE_LIMIT_SECONDS = 1.0


class Jin10Client:
    """Fetches Chinese financial flash news and economic calendar from Jin10."""

    def __init__(self) -> None:
        self._last_request_at: float = 0.0

    def fetch(self, category: str = "flash", limit: int = 50) -> list[RawItem]:
        """Fetch flash news or economic calendar data from Jin10.

        Args:
            category: Either ``"flash"`` for flash news or ``"calendar"``
                for economic calendar events.
            limit: Maximum number of items to return.

        Returns:
            List of RawItem with flash news or calendar event data.

        Raises:
            ValueError: If *category* is not ``"flash"`` or ``"calendar"``.
        """
        if category == "flash":
            return self._fetch_flash(limit)
        if category == "calendar":
            return self._fetch_calendar(limit)
        raise ValueError(f"Unknown Jin10 category: {category!r}. Use 'flash' or 'calendar'.")

    # ------------------------------------------------------------------
    # Flash news
    # ------------------------------------------------------------------

    def _fetch_flash(self, limit: int) -> list[RawItem]:
        """Fetch flash news items from Jin10."""
        params: dict[str, str | int] = {
            "max_time": "",
            "channel": "-8200",
            "vip": 0,
        }
        headers = {
            "Referer": "https://www.jin10.com",
            "User-Agent": "Mozilla/5.0 (compatible; Praxis/1.0)",
            "X-App-Id": "bVBF4FyRTn5NJF5n",
        }
        data = self._get(_FLASH_BASE, params=params, headers=headers)
        items_raw: list[dict[str, Any]] = data.get("data", [])
        items: list[RawItem] = []
        for entry in items_raw:
            if len(items) >= limit:
                break
            item = self._parse_flash_item(entry)
            if item is not None:
                items.append(item)
        return items

    @staticmethod
    def _parse_flash_item(entry: dict[str, Any]) -> RawItem | None:
        """Parse a single Jin10 flash news entry."""
        content = entry.get("data", {})
        if isinstance(content, dict):
            text = content.get("content", "") or content.get("pic", "")
        else:
            text = str(content)
        if not text:
            return None

        raw_time = entry.get("time", "")
        published_at = _parse_jin10_time(raw_time)

        return RawItem(
            source="jin10",
            url=f"https://www.jin10.com/flash_detail/{entry.get('id', '')}",
            title=text[:120],
            content=text,
            published_at=published_at,
            metadata={
                "category": "flash",
                "important": entry.get("important", 0),
                "channel": entry.get("channel", ""),
            },
        )

    # ------------------------------------------------------------------
    # Economic calendar
    # ------------------------------------------------------------------

    def _fetch_calendar(self, limit: int) -> list[RawItem]:
        """Fetch economic calendar events from Jin10."""
        today = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
        url = f"{_CALENDAR_BASE}/{today}.json"
        headers = {
            "Referer": "https://www.jin10.com",
            "User-Agent": "Mozilla/5.0 (compatible; Praxis/1.0)",
        }
        data = self._get(url, headers=headers)
        events: list[dict[str, Any]] = data if isinstance(data, list) else data.get("data", [])
        items: list[RawItem] = []
        for event in events:
            if len(items) >= limit:
                break
            items.append(self._parse_calendar_event(event))
        return items

    @staticmethod
    def _parse_calendar_event(event: dict[str, Any]) -> RawItem:
        """Parse a single economic calendar event."""
        name = event.get("name", "") or event.get("event_name", "")
        country = event.get("country", "")
        pub_time = event.get("pub_time", "") or event.get("time_period", "")
        published_at = _parse_jin10_time(pub_time)

        return RawItem(
            source="jin10",
            url="https://www.jin10.com/economy_calendar",
            title=f"[{country}] {name}" if country else name,
            content=name,
            published_at=published_at,
            metadata={
                "category": "calendar",
                "country": country,
                "actual": event.get("actual", ""),
                "consensus": event.get("consensus", ""),
                "previous": event.get("previous", ""),
                "star": event.get("star", 0),
            },
        )

    # ------------------------------------------------------------------
    # HTTP helper with rate limiting
    # ------------------------------------------------------------------

    def _get(
        self,
        url: str,
        *,
        params: dict[str, str | int] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        """Issue a rate-limited GET request."""
        self._rate_limit()
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()

    def _rate_limit(self) -> None:
        """Enforce 1 req/sec rate limit."""
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < _RATE_LIMIT_SECONDS:
            time.sleep(_RATE_LIMIT_SECONDS - elapsed)
        self._last_request_at = time.monotonic()


def _parse_jin10_time(raw: str) -> datetime | None:
    """Parse Jin10 datetime strings (various formats)."""
    if not raw:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.warning("Could not parse Jin10 datetime: %s", raw)
    return None
