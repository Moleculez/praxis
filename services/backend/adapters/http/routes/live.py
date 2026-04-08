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

# Popular US stock tickers for autocomplete
_POPULAR_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
    "UNH", "JNJ", "V", "XOM", "JPM", "PG", "MA", "HD", "CVX", "MRK", "ABBV",
    "LLY", "PEP", "KO", "COST", "AVGO", "WMT", "MCD", "CSCO", "TMO", "ACN",
    "ABT", "DHR", "NEE", "LIN", "TXN", "PM", "RTX", "UNP", "ORCL", "AMD",
    "CRM", "NFLX", "DIS", "INTC", "QCOM", "AMGN", "INTU", "LOW", "GS", "BA",
    # ETFs
    "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "VEA", "VWO", "BND", "TLT",
    "GLD", "SLV", "XLF", "XLK", "XLE", "XLV", "XLI", "XLY", "ARKK", "SOXX",
    # Crypto (Alpaca supports these)
    "BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "ADA/USD",
]

# In-memory state for paper trading (resets on restart).
_MAX_ORDERS = 10_000
_orders: list[dict] = []
_positions: dict[str, dict] = {}


@router.get("/symbols")
async def search_symbols(q: str = "") -> list[str]:
    """Search ticker symbols for autocomplete."""
    if not q:
        return _POPULAR_TICKERS[:20]
    q_upper = q.upper()
    matches = [t for t in _POPULAR_TICKERS if t.startswith(q_upper)]
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
