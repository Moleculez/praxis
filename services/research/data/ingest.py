"""Market and alternative data ingestion into TimescaleDB and parquet."""

from __future__ import annotations

import os

import polars as pl

from services.intelligence.crawlers.edgar.client import EdgarClient
from services.intelligence.crawlers.fred.client import FredClient
from services.intelligence.crawlers.market.client import MarketClient


class DataIngestor:
    """Ingest market and alternative data.

    Exhaust free data tiers first: OSAP, SEC EDGAR, FRED, etc.
    Wires to existing crawler clients and returns Polars DataFrames.
    """

    def __init__(self) -> None:
        self._market = MarketClient()
        self._fred = FredClient(api_key=os.environ.get("FRED_API_KEY", ""))
        self._edgar = EdgarClient(user_agent="Praxis Research bot@praxis.dev")

    def ingest_ohlcv(
        self,
        ticker: str = "SPY",
        period: str = "1y",
        interval: str = "1d",
    ) -> pl.DataFrame:
        """Ingest OHLCV data from Yahoo Finance via MarketClient.

        Args:
            ticker: Stock symbol (e.g. "AAPL", "SPY").
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max).
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo).

        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume.
        """
        items = self._market.fetch_ohlcv(ticker, period=period, interval=interval)
        if not items:
            return pl.DataFrame()
        rows = []
        for item in items:
            m = item.metadata or {}
            rows.append({
                "timestamp": item.published_at,
                "open": m.get("open", 0.0),
                "high": m.get("high", 0.0),
                "low": m.get("low", 0.0),
                "close": m.get("close", 0.0),
                "volume": m.get("volume", 0.0),
            })
        return pl.DataFrame(rows)

    def ingest_fred(
        self,
        series_id: str = "GDP",
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> pl.DataFrame:
        """Ingest FRED macro data.

        Args:
            series_id: FRED series identifier (e.g. "GDP", "UNRATE").
            start_date: ISO-format start date filter.
            end_date: ISO-format end date filter.

        Returns:
            DataFrame with columns: date, value, series_id.
        """
        items = self._fred.fetch(series_id, start_date=start_date, end_date=end_date)
        if not items:
            return pl.DataFrame()
        rows = []
        for item in items:
            m = item.metadata or {}
            val = m.get("value", ".")
            rows.append({
                "date": m.get("date", ""),
                "value": float(val) if val != "." else None,
                "series_id": series_id,
            })
        return pl.DataFrame(rows)

    def ingest_edgar(
        self,
        cik: str = "0000320193",
        filing_type: str = "10-K",
        count: int = 10,
    ) -> pl.DataFrame:
        """Ingest SEC EDGAR filings metadata.

        Args:
            cik: Central Index Key for the entity.
            filing_type: SEC filing type to filter (10-K, 10-Q, 8-K, etc.).
            count: Maximum number of filings to return.

        Returns:
            DataFrame with columns: title, url, published_at, form, filing_date.
        """
        items = self._edgar.fetch(cik, filing_type=filing_type, count=count)
        if not items:
            return pl.DataFrame()
        rows = []
        for item in items:
            m = item.metadata or {}
            rows.append({
                "title": item.title,
                "url": item.url,
                "published_at": item.published_at,
                "form": m.get("form", ""),
                "filing_date": m.get("filing_date", ""),
            })
        return pl.DataFrame(rows)
