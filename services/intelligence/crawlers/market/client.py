"""Market data and financial news crawler.

Sources:
- Yahoo Finance chart API (public, no auth)
- Yahoo Finance RSS news feed (public)
Rate limit: 1.0 req/sec
Auth: None required
"""

from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import httpx

from services.intelligence.crawlers.models import RawItem

_YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
_YAHOO_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"
_USER_AGENT = "Mozilla/5.0 (compatible; PraxisBot/1.0)"
_TIMEOUT = 15.0


class MarketClient:
    """Fetches market OHLCV data and financial news headlines."""

    def __init__(self) -> None:
        self._last_request: float = 0.0
        self._http = httpx.Client(
            timeout=_TIMEOUT,
            headers={"User-Agent": _USER_AGENT},
        )

    def _rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        self._last_request = time.monotonic()

    def fetch_ohlcv(
        self,
        ticker: str,
        period: str = "1mo",
        interval: str = "1d",
    ) -> list[RawItem]:
        """Fetch OHLCV data for a ticker.

        Args:
            ticker: Stock symbol (e.g. "AAPL", "SPY", "^GSPC").
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max).
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo).

        Returns:
            List of RawItem with OHLCV data in metadata.
        """
        self._rate_limit()
        url = f"{_YAHOO_CHART_URL}/{ticker}"
        params = {"range": period, "interval": interval, "includePrePost": "false"}

        resp = self._http.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

        result = data.get("chart", {}).get("result", [{}])[0]
        timestamps = result.get("timestamp", [])
        quote = result.get("indicators", {}).get("quote", [{}])[0]

        opens = quote.get("open", [])
        highs = quote.get("high", [])
        lows = quote.get("low", [])
        closes = quote.get("close", [])
        volumes = quote.get("volume", [])

        items: list[RawItem] = []
        for i, ts in enumerate(timestamps):
            dt = datetime.fromtimestamp(ts, tz=UTC)
            o = opens[i] if i < len(opens) and opens[i] is not None else 0
            h = highs[i] if i < len(highs) and highs[i] is not None else 0
            low = lows[i] if i < len(lows) and lows[i] is not None else 0
            c = closes[i] if i < len(closes) and closes[i] is not None else 0
            v = volumes[i] if i < len(volumes) and volumes[i] is not None else 0

            items.append(
                RawItem(
                    source="yahoo",
                    url=f"https://finance.yahoo.com/quote/{ticker}",
                    title=f"{ticker} {interval} {dt.strftime('%Y-%m-%d')}",
                    content=f"O:{o:.2f} H:{h:.2f} L:{low:.2f} C:{c:.2f} V:{v}",
                    published_at=dt,
                    metadata={
                        "ticker": ticker,
                        "interval": interval,
                        "open": o,
                        "high": h,
                        "low": low,
                        "close": c,
                        "volume": v,
                    },
                )
            )
        return items

    def fetch_news(self, ticker: str, limit: int = 20) -> list[RawItem]:
        """Fetch news headlines for a ticker from Yahoo Finance RSS.

        Args:
            ticker: Stock symbol.
            limit: Max headlines to return.

        Returns:
            List of RawItem with news headlines (title + link only, no full text).
        """
        self._rate_limit()
        params = {"s": ticker, "region": "US", "lang": "en-US"}

        resp = self._http.get(_YAHOO_RSS_URL, params=params)
        resp.raise_for_status()
        xml_text = resp.text

        root = ET.fromstring(xml_text)  # noqa: S314

        items: list[RawItem] = []
        for item_elem in root.findall(".//item")[:limit]:
            title = item_elem.findtext("title", "")
            link = item_elem.findtext("link", "")
            description = item_elem.findtext("description", "")
            pub_date_str = item_elem.findtext("pubDate", "")

            published = None
            if pub_date_str:
                try:
                    published = parsedate_to_datetime(pub_date_str)
                except (ValueError, TypeError):
                    pass

            items.append(
                RawItem(
                    source="yahoo",
                    url=link,
                    title=title,
                    content=description[:500] if description else title,
                    published_at=published,
                    metadata={"ticker": ticker, "type": "news"},
                )
            )
        return items
