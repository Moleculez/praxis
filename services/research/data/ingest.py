"""Market and alternative data ingestion into TimescaleDB and parquet."""

from __future__ import annotations


class DataIngestor:
    """Ingest market and alternative data.

    Exhaust free data tiers first: OSAP, SEC EDGAR, FRED, etc.
    """

    def ingest_ohlcv(self) -> None:
        """Ingest OHLCV price data."""
        raise NotImplementedError

    def ingest_fred(self) -> None:
        """Ingest macroeconomic data from FRED."""
        raise NotImplementedError

    def ingest_edgar(self) -> None:
        """Ingest SEC EDGAR filings."""
        raise NotImplementedError
