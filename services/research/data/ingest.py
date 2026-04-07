"""Market and alternative data ingestion into TimescaleDB and parquet."""

from __future__ import annotations

import io
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime, timedelta
from pathlib import Path

import polars as pl

from services.intelligence.crawlers.edgar.client import EdgarClient
from services.intelligence.crawlers.fred.client import FredClient
from services.intelligence.crawlers.market.client import MarketClient

_INTRADAY_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}


class IngestCache:
    """SQLite cache layer for ingested data to avoid redundant API calls."""

    def __init__(self, db_path: str = "data/cache.db") -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS ingest_cache "
            "(key TEXT PRIMARY KEY, data TEXT, created_at TEXT)"
        )
        self._conn.commit()

    def get(self, key: str, ttl_hours: float = 24.0) -> str | None:
        """Return cached JSON string if present and not expired, else None."""
        row = self._conn.execute(
            "SELECT data, created_at FROM ingest_cache WHERE key = ?", (key,)
        ).fetchone()
        if not row:
            return None
        created = datetime.fromisoformat(row[1])
        if datetime.now(UTC) - created > timedelta(hours=ttl_hours):
            self._conn.execute("DELETE FROM ingest_cache WHERE key = ?", (key,))
            self._conn.commit()
            return None
        return row[0]

    def set(self, key: str, data: str) -> None:
        """Insert or replace a cache entry with the current timestamp."""
        self._conn.execute(
            "INSERT OR REPLACE INTO ingest_cache (key, data, created_at) VALUES (?, ?, ?)",
            (key, data, datetime.now(UTC).isoformat()),
        )
        self._conn.commit()


class DataIngestor:
    """Ingest market and alternative data.

    Exhaust free data tiers first: OSAP, SEC EDGAR, FRED, etc.
    Wires to existing crawler clients and returns Polars DataFrames.
    Uses an SQLite cache to avoid redundant API calls.
    """

    def __init__(self) -> None:
        self._market = MarketClient()
        self._fred = FredClient(api_key=os.environ.get("FRED_API_KEY", ""))
        self._edgar = EdgarClient(user_agent="Praxis Research bot@praxis.dev")
        self._cache = IngestCache()

    def ingest_ohlcv(
        self,
        ticker: str = "SPY",
        period: str = "1y",
        interval: str = "1d",
    ) -> pl.DataFrame:
        """Ingest OHLCV data from Yahoo Finance via MarketClient.

        Checks the SQLite cache first. TTL is 1 hour for intraday intervals,
        24 hours for daily and coarser.

        Args:
            ticker: Stock symbol (e.g. "AAPL", "SPY").
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max).
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo).

        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume.
        """
        cache_key = f"ohlcv:{ticker}:{period}:{interval}"
        ttl = 1.0 if interval in _INTRADAY_INTERVALS else 24.0
        cached = self._cache.get(cache_key, ttl)
        if cached:
            return pl.read_json(io.StringIO(cached))

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
        df = pl.DataFrame(rows)
        self._cache.set(cache_key, df.write_json())
        return df

    def ingest_batch(
        self,
        tickers: list[str],
        period: str = "1y",
        interval: str = "1d",
        max_workers: int = 4,
    ) -> dict[str, pl.DataFrame]:
        """Fetch OHLCV data for multiple tickers in parallel.

        Args:
            tickers: List of stock symbols.
            period: Data period forwarded to ingest_ohlcv.
            interval: Data interval forwarded to ingest_ohlcv.
            max_workers: Thread pool size.

        Returns:
            Dict mapping ticker to its OHLCV DataFrame (empty on failure).
        """
        results: dict[str, pl.DataFrame] = {}
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(self.ingest_ohlcv, t, period, interval): t
                for t in tickers
            }
            for future in as_completed(futures):
                ticker = futures[future]
                try:
                    results[ticker] = future.result()
                except Exception:
                    results[ticker] = pl.DataFrame()
        return results

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
