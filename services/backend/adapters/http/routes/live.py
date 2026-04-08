"""Paper-trading live execution routes."""

from __future__ import annotations

import logging
import uuid
from dataclasses import asdict
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from services.research.execution.strategy import StrategyConfig, StrategyEngine

logger = logging.getLogger(__name__)

router = APIRouter()

# Module-level strategy engine for auto-trade endpoints.
_engine = StrategyEngine()

# Popular US stock tickers with metadata for enriched autocomplete
_TICKER_INFO: list[dict] = [
    # Mega-cap tech
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "market_cap": "3.4T"},
    {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology", "market_cap": "3.1T"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "sector": "Technology", "market_cap": "2.1T"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "market_cap": "2.0T"},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology", "market_cap": "2.8T"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "market_cap": "1.5T"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Cyclical", "market_cap": "800B"},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway (B)", "sector": "Financials", "market_cap": "900B"},
    # Healthcare
    {"symbol": "UNH", "name": "UnitedHealth Group", "sector": "Healthcare", "market_cap": "500B"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "market_cap": "380B"},
    {"symbol": "LLY", "name": "Eli Lilly & Co.", "sector": "Healthcare", "market_cap": "750B"},
    {"symbol": "MRK", "name": "Merck & Co.", "sector": "Healthcare", "market_cap": "280B"},
    {"symbol": "ABBV", "name": "AbbVie Inc.", "sector": "Healthcare", "market_cap": "310B"},
    {"symbol": "AMGN", "name": "Amgen Inc.", "sector": "Healthcare", "market_cap": "150B"},
    # Financials
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financials", "market_cap": "550B"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financials", "market_cap": "600B"},
    {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financials", "market_cap": "430B"},
    {"symbol": "GS", "name": "Goldman Sachs Group", "sector": "Financials", "market_cap": "160B"},
    # Energy
    {"symbol": "XOM", "name": "Exxon Mobil Corp.", "sector": "Energy", "market_cap": "460B"},
    {"symbol": "CVX", "name": "Chevron Corp.", "sector": "Energy", "market_cap": "280B"},
    # Consumer
    {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Staples", "market_cap": "380B"},
    {"symbol": "KO", "name": "Coca-Cola Co.", "sector": "Consumer Staples", "market_cap": "270B"},
    {"symbol": "PEP", "name": "PepsiCo Inc.", "sector": "Consumer Staples", "market_cap": "230B"},
    {"symbol": "COST", "name": "Costco Wholesale", "sector": "Consumer Staples", "market_cap": "350B"},
    {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Staples", "market_cap": "500B"},
    {"symbol": "MCD", "name": "McDonald's Corp.", "sector": "Consumer Cyclical", "market_cap": "200B"},
    {"symbol": "HD", "name": "Home Depot Inc.", "sector": "Consumer Cyclical", "market_cap": "340B"},
    {"symbol": "LOW", "name": "Lowe's Companies", "sector": "Consumer Cyclical", "market_cap": "140B"},
    {"symbol": "DIS", "name": "Walt Disney Co.", "sector": "Communication", "market_cap": "170B"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "sector": "Communication", "market_cap": "280B"},
    # Tech continued
    {"symbol": "AVGO", "name": "Broadcom Inc.", "sector": "Technology", "market_cap": "650B"},
    {"symbol": "CSCO", "name": "Cisco Systems", "sector": "Technology", "market_cap": "230B"},
    {"symbol": "ACN", "name": "Accenture PLC", "sector": "Technology", "market_cap": "210B"},
    {"symbol": "TXN", "name": "Texas Instruments", "sector": "Technology", "market_cap": "170B"},
    {"symbol": "ORCL", "name": "Oracle Corp.", "sector": "Technology", "market_cap": "340B"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "sector": "Technology", "market_cap": "220B"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "sector": "Technology", "market_cap": "250B"},
    {"symbol": "INTC", "name": "Intel Corp.", "sector": "Technology", "market_cap": "100B"},
    {"symbol": "QCOM", "name": "Qualcomm Inc.", "sector": "Technology", "market_cap": "180B"},
    {"symbol": "INTU", "name": "Intuit Inc.", "sector": "Technology", "market_cap": "180B"},
    # Industrials
    {"symbol": "BA", "name": "Boeing Co.", "sector": "Industrials", "market_cap": "130B"},
    {"symbol": "RTX", "name": "RTX Corp.", "sector": "Industrials", "market_cap": "150B"},
    {"symbol": "UNP", "name": "Union Pacific Corp.", "sector": "Industrials", "market_cap": "150B"},
    {"symbol": "TMO", "name": "Thermo Fisher Scientific", "sector": "Healthcare", "market_cap": "200B"},
    {"symbol": "ABT", "name": "Abbott Laboratories", "sector": "Healthcare", "market_cap": "190B"},
    {"symbol": "DHR", "name": "Danaher Corp.", "sector": "Healthcare", "market_cap": "180B"},
    {"symbol": "NEE", "name": "NextEra Energy", "sector": "Utilities", "market_cap": "150B"},
    {"symbol": "LIN", "name": "Linde PLC", "sector": "Materials", "market_cap": "210B"},
    {"symbol": "PM", "name": "Philip Morris Intl.", "sector": "Consumer Staples", "market_cap": "190B"},
    # ETFs
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "sector": "ETF", "market_cap": "500B+"},
    {"symbol": "QQQ", "name": "Invesco QQQ (Nasdaq-100)", "sector": "ETF", "market_cap": "250B+"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "sector": "ETF", "market_cap": "60B"},
    {"symbol": "DIA", "name": "SPDR Dow Jones ETF", "sector": "ETF", "market_cap": "30B"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market", "sector": "ETF", "market_cap": "400B+"},
    {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "sector": "ETF", "market_cap": "450B+"},
    {"symbol": "VEA", "name": "Vanguard FTSE Developed", "sector": "ETF", "market_cap": "100B"},
    {"symbol": "VWO", "name": "Vanguard FTSE Emerging", "sector": "ETF", "market_cap": "70B"},
    {"symbol": "BND", "name": "Vanguard Total Bond ETF", "sector": "ETF", "market_cap": "100B"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury", "sector": "ETF", "market_cap": "50B"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "sector": "ETF", "market_cap": "65B"},
    {"symbol": "SLV", "name": "iShares Silver Trust", "sector": "ETF", "market_cap": "12B"},
    {"symbol": "XLF", "name": "Financial Select Sector", "sector": "ETF", "market_cap": "40B"},
    {"symbol": "XLK", "name": "Technology Select Sector", "sector": "ETF", "market_cap": "60B"},
    {"symbol": "XLE", "name": "Energy Select Sector", "sector": "ETF", "market_cap": "35B"},
    {"symbol": "XLV", "name": "Health Care Select Sector", "sector": "ETF", "market_cap": "40B"},
    {"symbol": "XLI", "name": "Industrial Select Sector", "sector": "ETF", "market_cap": "20B"},
    {"symbol": "XLY", "name": "Consumer Discretionary", "sector": "ETF", "market_cap": "20B"},
    {"symbol": "ARKK", "name": "ARK Innovation ETF", "sector": "ETF", "market_cap": "6B"},
    {"symbol": "SOXX", "name": "iShares Semiconductor ETF", "sector": "ETF", "market_cap": "12B"},
    # Crypto
    {"symbol": "BTC/USD", "name": "Bitcoin", "sector": "Crypto", "market_cap": "1.3T"},
    {"symbol": "ETH/USD", "name": "Ethereum", "sector": "Crypto", "market_cap": "400B"},
    {"symbol": "SOL/USD", "name": "Solana", "sector": "Crypto", "market_cap": "65B"},
    {"symbol": "DOGE/USD", "name": "Dogecoin", "sector": "Crypto", "market_cap": "20B"},
    {"symbol": "ADA/USD", "name": "Cardano", "sector": "Crypto", "market_cap": "15B"},
]

_POPULAR_TICKERS = [t["symbol"] for t in _TICKER_INFO]

# In-memory state for paper trading (resets on restart).
_MAX_ORDERS = 10_000
_orders: list[dict] = []
_positions: dict[str, dict] = {}


@router.get("/symbols")
async def search_symbols(q: str = "") -> list[str]:
    """Search ticker symbols for autocomplete (simple)."""
    if not q:
        return _POPULAR_TICKERS[:20]
    q_upper = q.upper()
    matches = [t for t in _POPULAR_TICKERS if t.startswith(q_upper)]
    return matches[:15]


@router.get("/symbols/search")
async def search_symbols_enriched(q: str = "") -> list[dict]:
    """Search ticker symbols with enriched metadata (name, sector, market cap)."""
    if not q:
        return _TICKER_INFO[:20]
    q_upper = q.upper()
    q_lower = q.lower()
    matches = [
        t for t in _TICKER_INFO
        if t["symbol"].startswith(q_upper) or q_lower in t["name"].lower()
    ]
    return matches[:15]


@router.get("/positions")
async def get_positions() -> list[dict]:
    """Return all open paper-trading positions."""
    return list(_positions.values())


@router.get("/orders")
async def get_orders() -> list[dict]:
    """Return all paper-trading orders."""
    return _orders


@router.post("/orders")
async def submit_order(body: dict) -> dict:
    """Submit a paper-trading order (instantly filled)."""
    order: dict = {
        "id": str(uuid.uuid4()),
        "ticker": body["ticker"],
        "side": body["side"],
        "quantity": body["quantity"],
        "price": body["price"],
        "status": "filled",
        "timestamp": datetime.now(UTC).isoformat(),
    }
    _orders.append(order)
    if len(_orders) > _MAX_ORDERS:
        _orders[:] = _orders[-_MAX_ORDERS:]

    ticker: str = body["ticker"]
    qty: float = body["quantity"] * (1 if body["side"] == "buy" else -1)
    if ticker in _positions:
        _positions[ticker]["quantity"] += qty
        if _positions[ticker]["quantity"] == 0:
            del _positions[ticker]
    else:
        _positions[ticker] = {
            "ticker": ticker,
            "quantity": qty,
            "avg_price": body["price"],
            "current_price": body["price"],
        }

    return order


@router.get("/summary")
async def get_summary() -> dict:
    """Return paper-trading session summary."""
    return {
        "trades_today": len(_orders),
        "gross_pnl": 0.0,
        "net_pnl": 0.0,
        "win_rate": None,
        "paper_trading": True,
    }


@router.post("/auto-trade/start")
async def start_auto_trade(body: dict = {}) -> dict:  # noqa: B006
    """Start the strategy engine with optional config overrides."""
    global _engine  # noqa: PLW0603
    config = StrategyConfig(
        strategy_type=body.get("strategy", "momentum"),
        min_confidence=body.get("min_confidence", 0.6),
        max_position_pct=body.get("max_position_pct", 0.02),
    )
    _engine = StrategyEngine(config)
    _engine.start()
    return {"status": "running", "config": asdict(config)}


@router.post("/auto-trade/stop")
async def stop_auto_trade() -> dict:
    """Stop the strategy engine."""
    _engine.stop()
    return {"status": "stopped"}


@router.get("/auto-trade/status")
async def auto_trade_status() -> dict:
    """Return current engine state."""
    return {
        "running": _engine.is_running,
        "signals_count": len(_engine._signals),
        "config": asdict(_engine.config),
    }


@router.get("/signals")
async def get_signals(limit: int = 50) -> list[dict]:
    """Return recent trading signals."""
    signals = _engine.get_signals(limit)
    return [asdict(s) for s in signals]


@router.post("/auto-trade/generate-signal")
async def generate_signal(body: dict) -> dict:
    """Generate a trading signal from council probability.

    When ``use_council`` is true and no ``probability`` is provided, the PhD
    council is invoked first to derive a consensus probability.
    """
    ticker: str = body.get("ticker", "SPY")
    thesis: str = body.get("thesis", "")
    probability: float | None = body.get("probability")
    use_council: bool = body.get("use_council", False)

    if probability is None and use_council and thesis:
        synthesis = await _run_council(thesis, ticker)
        probability = synthesis.get("probability", 0.5)
    elif probability is None:
        probability = 0.5

    signal = _engine.generate_signal(ticker, probability, thesis)

    # If engine is running and signal is actionable, build an order
    if _engine.is_running and signal.direction != "hold":
        equity = 100_000.0  # Default mock equity for paper trading
        try:
            from services.backend.config import get_settings

            settings = get_settings()
            if settings.alpaca_api_key:
                from services.research.execution.paper import PaperTrader

                trader = PaperTrader(
                    settings.alpaca_api_key,
                    settings.alpaca_secret_key,
                    settings.alpaca_base_url,
                )
                acct = trader.get_account()
                equity = float(acct.get("equity", 100_000))
        except Exception:  # noqa: BLE001
            pass

        position_value = _engine.size_position(signal, equity)
        if position_value > 0:
            price: float = body.get("price", 100.0)
            quantity = max(1, int(position_value / price))
            return {
                "signal": asdict(signal),
                "order": {
                    "ticker": ticker,
                    "side": signal.direction,
                    "quantity": quantity,
                    "position_value": position_value,
                    "status": "submitted",
                },
            }

    return {"signal": asdict(signal), "order": None}


# ------------------------------------------------------------------
# Council-integrated composite endpoint
# ------------------------------------------------------------------


async def _run_council(thesis: str, ticker: str = "", context: str = "") -> dict:
    """Instantiate gateway + runner and evaluate a thesis."""
    from services.backend.adapters.http.routes.intelligence import _create_gateway
    from services.intelligence.council.runner import CouncilRunner

    runner = CouncilRunner(_create_gateway())
    return await runner.evaluate_thesis(thesis, ticker, context)


@router.post("/auto-trade/evaluate")
async def evaluate_and_signal(body: dict) -> dict:
    """Evaluate thesis with council, generate signal, optionally create order.

    Body fields:
        thesis (str): Investment thesis text (required).
        ticker (str): Ticker symbol (default "SPY").
        price (float): Current price for position sizing (default 100.0).
    """
    thesis: str = body.get("thesis", "")
    ticker: str = body.get("ticker", "SPY")
    price: float = body.get("price", 100.0)

    if not thesis:
        raise HTTPException(status_code=400, detail="thesis is required")

    try:
        synthesis = await _run_council(thesis, ticker)
    except Exception as exc:
        logger.exception("Council evaluation failed")
        raise HTTPException(status_code=500, detail=f"Council evaluation failed: {exc}") from exc

    probability: float = synthesis.get("probability", 0.5)
    signal = _engine.generate_signal(ticker, probability, thesis)

    order: dict | None = None
    if _engine.is_running and signal.direction != "hold":
        equity = 100_000.0
        position_value = _engine.size_position(signal, equity)
        if position_value > 0:
            quantity = max(1, int(position_value / price))
            order = {
                "ticker": ticker,
                "side": signal.direction,
                "quantity": quantity,
                "position_value": position_value,
                "status": "submitted",
            }

    return {
        "council": synthesis,
        "signal": asdict(signal),
        "order": order,
    }
