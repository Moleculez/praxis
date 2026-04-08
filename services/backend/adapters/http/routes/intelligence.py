"""Intelligence / Cogito subsystem routes."""

from dataclasses import asdict
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory crawl cache
_crawl_cache: dict[str, list[dict]] = {}


class CrawlRequest(BaseModel):
    query: str = ""
    limit: int = 10


class AnalyzeRequest(BaseModel):
    text: str
    model: str = "anthropic/claude-sonnet-4.6"


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


@router.post("/crawl/{source}")
async def trigger_crawl(source: str, body: CrawlRequest) -> dict:
    """Trigger a crawl for a specific data source."""
    try:
        results = _run_crawler(source, body.query, body.limit)
        _crawl_cache[source] = results
        return {"source": source, "count": len(results), "items": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/crawl/{source}/latest")
async def get_latest_crawl(source: str) -> dict:
    """Get cached results from the last crawl."""
    if source not in _crawl_cache:
        return {"source": source, "count": 0, "items": []}
    return {"source": source, "count": len(_crawl_cache[source]), "items": _crawl_cache[source]}


def _create_gateway():  # noqa: ANN202
    """Build an LLMGateway from application settings."""
    from services.backend.config import get_settings
    from services.intelligence.council.providers.gateway import LLMGateway

    settings = get_settings()
    return LLMGateway(
        api_key=settings.openrouter_api_key,
        use_local=settings.use_local_llm,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
    )


@router.post("/analyze")
async def analyze_text(body: AnalyzeRequest) -> dict:
    """Send text to LLM gateway for analysis."""
    gateway = _create_gateway()
    try:
        result = await gateway.complete(
            model=body.model,
            messages=[{"role": "user", "content": body.text}],
        )
        return {"response": result["choices"][0]["message"]["content"], "model": body.model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {e}") from e


class EvaluateThesisRequest(BaseModel):
    thesis: str
    ticker: str = ""
    context: str = ""


@router.post("/evaluate-thesis")
async def evaluate_thesis(body: EvaluateThesisRequest) -> dict:
    """Run the PhD council on a thesis and return weighted synthesis."""
    from services.intelligence.council.runner import CouncilRunner

    runner = CouncilRunner(_create_gateway())
    try:
        return await runner.evaluate_thesis(body.thesis, body.ticker, body.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Council evaluation failed: {e}") from e


def _run_crawler(source: str, query: str, limit: int) -> list[dict]:
    """Run a crawler and return results as serializable dicts."""
    if source == "market":
        from services.intelligence.crawlers.market.client import MarketClient

        client = MarketClient()
        ticker = query or "SPY"
        items = client.fetch_ohlcv(ticker, period="1mo", interval="1d")
        return [asdict(item) for item in items[:limit]]

    if source == "fred":
        from services.intelligence.crawlers.fred.client import FredClient

        client = FredClient(api_key="")
        series = query or "GDP"
        items = client.fetch(series)
        return [asdict(item) for item in items[:limit]]

    if source == "edgar":
        from services.intelligence.crawlers.edgar.client import EdgarClient

        client = EdgarClient(user_agent="Praxis Research bot@praxis.dev")
        cik = query or "0000320193"  # Apple
        items = client.fetch(cik)
        return [asdict(item) for item in items[:limit]]

    if source == "crypto":
        from services.intelligence.crawlers.crypto.client import CryptoClient

        client = CryptoClient()
        symbol = query or "BTCUSDT"
        items = client.fetch(symbol=symbol, limit=limit)
        return [asdict(item) for item in items]

    if source == "jin10":
        from services.intelligence.crawlers.jin10.client import Jin10Client

        client = Jin10Client()
        items = client.fetch(limit=limit)
        return [asdict(item) for item in items]

    if source == "news":
        from services.intelligence.crawlers.news.client import NewsClient

        client = NewsClient(provider="gdelt")
        items = client.fetch(query=query or "finance", limit=limit)
        return [asdict(item) for item in items]

    raise ValueError(f"Unknown source: {source}. Available: market, fred, edgar, crypto, jin10, news")


class TradeIdeaRequest(BaseModel):
    thesis: str
    ticker: str
    council_synthesis: dict | None = None


@router.post("/trade-idea")
async def generate_trade_idea(body: TradeIdeaRequest) -> dict:
    """Generate a discretionary trade idea via LLM PM.

    NEVER auto-executes. Returns a structured idea for human review only.
    """
    from services.backend.config import get_settings
    from services.intelligence.council.providers.gateway import LLMGateway
    from services.intelligence.pm.discretionary import DiscretionaryPM

    settings = get_settings()
    gateway = LLMGateway(
        api_key=settings.openrouter_api_key,
        use_local=settings.use_local_llm,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
    )
    pm = DiscretionaryPM(gateway)

    try:
        idea = await pm.generate_idea(
            body.thesis,
            {"ticker": body.ticker, "council_synthesis": body.council_synthesis},
        )
        return idea.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trade idea generation failed: {e}") from e
