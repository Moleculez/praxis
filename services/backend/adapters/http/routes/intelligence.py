"""Intelligence / Cogito subsystem routes."""

from pathlib import Path

from fastapi import APIRouter

router = APIRouter()


@router.get("/briefs")
async def list_briefs() -> list[dict]:
    """List all intelligence briefs by directory."""
    briefs_dir = Path("intel/briefs")
    if not briefs_dir.exists():
        return []
    briefs: list[dict] = []
    for p in sorted(briefs_dir.iterdir(), reverse=True):
        if p.is_dir():
            briefs.append({"id": p.name, "path": str(p)})
    return briefs


@router.get("/sources")
async def get_crawler_sources() -> list[dict]:
    """Return status of each data crawler."""
    return [
        {"name": "FRED", "source": "fred", "status": "implemented", "description": "Macro time series"},
        {"name": "arXiv", "source": "arxiv", "status": "implemented", "description": "Research papers"},
        {"name": "EDGAR", "source": "edgar", "status": "implemented", "description": "SEC filings"},
        {"name": "News", "source": "news", "status": "implemented", "description": "GDELT + NewsAPI"},
        {"name": "Jin10", "source": "jin10", "status": "implemented", "description": "Chinese financial news"},
        {"name": "Crypto", "source": "crypto", "status": "implemented", "description": "Binance + CoinGecko"},
        {"name": "Market", "source": "market", "status": "implemented", "description": "Yahoo Finance OHLCV"},
        {"name": "Reddit", "source": "reddit", "status": "stub", "description": "Subreddit posts"},
        {"name": "Transcripts", "source": "transcripts", "status": "stub", "description": "Earnings calls"},
    ]
