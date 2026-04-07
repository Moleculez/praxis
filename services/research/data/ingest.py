"""Market and alternative data ingestion into TimescaleDB and parquet."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import polars as pl


class DataIngestor:
    """Ingest market and alternative data.

    Exhaust free data tiers first: OSAP, SEC EDGAR, FRED, etc.
    """

    def ingest_ohlcv(self, symbols: list[str]) -> pl.DataFrame:
        """Ingest OHLCV price data."""
        raise NotImplementedError

    def ingest_fred(self, series_ids: list[str]) -> pl.DataFrame:
        """Ingest macroeconomic data from FRED."""
        raise NotImplementedError

    def ingest_edgar(self, cik: str) -> pl.DataFrame:
        """Ingest SEC EDGAR filings."""
        raise NotImplementedError
