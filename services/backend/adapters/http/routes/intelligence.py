"""Intelligence / Cogito subsystem routes."""

import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.adapters.db.models import TradeIdeaRow
from services.backend.adapters.http.dependencies import get_session

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


# ------------------------------------------------------------------
# Trade idea review queue (persistent DB-backed)
# ------------------------------------------------------------------

_VALID_IDEA_STATUSES = frozenset({"new", "reviewing", "approved", "rejected", "expired"})


def _row_to_dict(row: TradeIdeaRow) -> dict:
    """Convert a TradeIdeaRow to a serializable dict."""
    return {
        "id": row.id,
        "ticker": row.ticker,
        "direction": row.direction,
        "thesis": row.thesis,
        "entry_zone": row.entry_zone,
        "stop_loss": row.stop_loss,
        "target": row.target,
        "conviction": row.conviction,
        "pre_mortem": row.pre_mortem,
        "kill_criteria": row.kill_criteria,
        "status": row.status,
        "notes": row.notes,
        "created_at": row.created_at,
        "reviewed_at": row.reviewed_at,
    }


class SaveTradeIdeaRequest(BaseModel):
    ticker: str
    direction: str
    thesis: str
    entry_zone: str = ""
    stop_loss: str = ""
    target: str = ""
    conviction: str = "medium"
    pre_mortem: str = ""
    kill_criteria: str = ""


class UpdateTradeIdeaRequest(BaseModel):
    status: str | None = None
    notes: str | None = None


@router.get("/ideas")
async def list_trade_ideas(
    status: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List all trade ideas, optionally filtered by status."""
    stmt = select(TradeIdeaRow).order_by(TradeIdeaRow.created_at.desc())
    if status:
        stmt = stmt.where(TradeIdeaRow.status == status)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [_row_to_dict(r) for r in rows]


@router.post("/ideas", status_code=201)
async def save_trade_idea(
    body: SaveTradeIdeaRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save a new trade idea to the review queue."""
    row = TradeIdeaRow(
        id=str(uuid.uuid4()),
        ticker=body.ticker,
        direction=body.direction,
        thesis=body.thesis,
        entry_zone=body.entry_zone,
        stop_loss=body.stop_loss,
        target=body.target,
        conviction=body.conviction,
        pre_mortem=body.pre_mortem,
        kill_criteria=body.kill_criteria,
        status="new",
        notes="",
        created_at=datetime.now(UTC).isoformat(),
        reviewed_at=None,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _row_to_dict(row)


@router.patch("/ideas/{idea_id}")
async def update_trade_idea(
    idea_id: str,
    body: UpdateTradeIdeaRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Update a trade idea's status and/or notes."""
    result = await session.execute(
        select(TradeIdeaRow).where(TradeIdeaRow.id == idea_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Trade idea not found")

    if body.status is not None:
        if body.status not in _VALID_IDEA_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(sorted(_VALID_IDEA_STATUSES))}",
            )
        row.status = body.status
        if body.status in {"approved", "rejected"}:
            row.reviewed_at = datetime.now(UTC).isoformat()
    if body.notes is not None:
        row.notes = body.notes

    await session.commit()
    await session.refresh(row)
    return _row_to_dict(row)


# ------------------------------------------------------------------
# Trade idea generation (LLM-powered, non-persistent)
# ------------------------------------------------------------------


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
