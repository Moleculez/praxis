"""Crypto market data crawler.

Sources:
- Binance: https://api.binance.com (public, no auth)
- CoinGecko: https://api.coingecko.com/api/v3 (public, no auth for basic)
Rate limit: 1.0 req/sec
Auth: None required for public endpoints
"""
from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Literal

import httpx

from services.intelligence.crawlers.models import RawItem


class CryptoClient:
    """Fetches crypto market data from Binance and CoinGecko."""

    def __init__(self) -> None:
        self._last_request: float = 0.0

    def _rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        self._last_request = time.monotonic()

    def fetch(
        self,
        symbol: str = "BTCUSDT",
        interval: str = "1d",
        limit: int = 100,
        source: Literal["binance", "coingecko"] = "binance",
    ) -> list[RawItem]:
        """Fetch crypto market data.

        Args:
            symbol: Trading pair (e.g. "BTCUSDT") for Binance,
                or coin id (e.g. "bitcoin") for CoinGecko.
            interval: Kline interval for Binance (1m, 5m, 1h, 1d).
                Ignored for CoinGecko.
            limit: Max records.
            source: Data source ("binance" or "coingecko").

        Returns:
            List of RawItem with OHLCV or market data.
        """
        if source == "binance":
            return self._fetch_binance(symbol, interval, limit)
        return self._fetch_coingecko(symbol, limit)

    def _fetch_binance(self, symbol: str, interval: str, limit: int) -> list[RawItem]:
        """Fetch klines from Binance public API."""
        self._rate_limit()
        url = "https://api.binance.com/api/v3/klines"
        params = {"symbol": symbol, "interval": interval, "limit": limit}

        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            klines = resp.json()

        items: list[RawItem] = []
        for k in klines:
            # Binance kline format:
            # [open_time, open, high, low, close, volume, close_time, ...]
            open_time = datetime.fromtimestamp(k[0] / 1000, tz=UTC)
            items.append(RawItem(
                source="binance",
                url=f"https://www.binance.com/en/trade/{symbol}",
                title=f"{symbol} {interval} kline {open_time.strftime('%Y-%m-%d %H:%M')}",
                content=f"O:{k[1]} H:{k[2]} L:{k[3]} C:{k[4]} V:{k[5]}",
                published_at=open_time,
                metadata={
                    "symbol": symbol,
                    "interval": interval,
                    "open": float(k[1]),
                    "high": float(k[2]),
                    "low": float(k[3]),
                    "close": float(k[4]),
                    "volume": float(k[5]),
                },
            ))
        return items

    def _fetch_coingecko(self, coin_id: str, limit: int) -> list[RawItem]:
        """Fetch market data from CoinGecko."""
        self._rate_limit()
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
        params = {"vs_currency": "usd", "days": min(limit, 365)}

        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        prices = data.get("prices", [])
        volumes = data.get("total_volumes", [])

        items: list[RawItem] = []
        for i, (ts, price) in enumerate(prices[:limit]):
            dt = datetime.fromtimestamp(ts / 1000, tz=UTC)
            vol = volumes[i][1] if i < len(volumes) else 0
            items.append(RawItem(
                source="coingecko",
                url=f"https://www.coingecko.com/en/coins/{coin_id}",
                title=f"{coin_id} ${price:.2f} ({dt.strftime('%Y-%m-%d')})",
                content=f"Price: ${price:.2f}, Volume: ${vol:,.0f}",
                published_at=dt,
                metadata={
                    "coin_id": coin_id,
                    "price_usd": price,
                    "volume_usd": vol,
                },
            ))
        return items
