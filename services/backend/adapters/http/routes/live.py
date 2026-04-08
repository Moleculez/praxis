"""Paper-trading live execution routes."""

from __future__ import annotations

import logging
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException

from services.research.execution.strategy import StrategyConfig, StrategyEngine

if TYPE_CHECKING:
    from services.research.execution.paper import PaperTrader

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

# Cached PaperTrader instance (created once, reuses httpx.Client connection).
_trader_cache: PaperTrader | None = None
_trader_checked: bool = False


def _get_trader() -> PaperTrader | None:
    """Return a cached PaperTrader if Alpaca keys are configured, else None."""
    global _trader_cache, _trader_checked  # noqa: PLW0603
    if _trader_checked:
        return _trader_cache

    from services.backend.config import get_settings

    settings = get_settings()
    if settings.alpaca_api_key and settings.alpaca_secret_key:
        from services.research.execution.paper import PaperTrader as _PaperTrader

        _trader_cache = _PaperTrader(
            settings.alpaca_api_key,
            settings.alpaca_secret_key,
            settings.alpaca_base_url,
        )
    _trader_checked = True
    return _trader_cache


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
    trader = _get_trader()
    if trader:
        try:
            alpaca_positions = trader.get_positions()
            return [
                {
                    "ticker": p["symbol"],
                    "quantity": float(p["qty"]),
                    "avg_price": float(p["avg_entry_price"]),
                    "current_price": float(p["current_price"]),
                }
                for p in alpaca_positions
            ]
        except Exception:  # noqa: BLE001
            logger.warning("Alpaca positions fetch failed, using in-memory")
    return list(_positions.values())


@router.get("/orders")
async def get_orders() -> list[dict]:
    """Return all paper-trading orders."""
    trader = _get_trader()
    if trader:
        try:
            alpaca_orders = trader.get_orders(status="all", limit=50)
            return [
                {
                    "id": o["id"],
                    "ticker": o["symbol"],
                    "side": o["side"],
                    "quantity": float(o["qty"]),
                    "price": float(
                        o.get("filled_avg_price") or o.get("limit_price") or 0
                    ),
                    "status": o["status"],
                    "timestamp": o["created_at"],
                }
                for o in alpaca_orders
            ]
        except Exception:  # noqa: BLE001
            logger.warning("Alpaca orders fetch failed, using in-memory")
    return _orders


@router.post("/orders")
async def submit_order(body: dict) -> dict:
    """Submit a paper-trading order (instantly filled in mock mode)."""
    trader = _get_trader()
    if trader:
        try:
            result = trader.submit_order(
                ticker=body["ticker"],
                side=body["side"],
                quantity=body["quantity"],
                price=body.get("price"),
            )
            return {
                "id": result["id"],
                "ticker": result["symbol"],
                "side": result["side"],
                "quantity": float(result["qty"]),
                "price": float(result.get("limit_price") or 0),
                "status": result["status"],
                "timestamp": result["created_at"],
                "source": "alpaca",
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("Alpaca order failed: %s, falling back to mock", exc)

    # Fall back to in-memory mock
    order: dict = {
        "id": str(uuid.uuid4()),
        "ticker": body["ticker"],
        "side": body["side"],
        "quantity": body["quantity"],
        "price": body["price"],
        "status": "filled",
        "timestamp": datetime.now(UTC).isoformat(),
        "source": "mock",
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
    trader = _get_trader()
    if trader:
        try:
            acct = trader.get_account()
            equity = float(acct.get("equity", 0))
            cash = float(acct.get("cash", 0))
            last_equity = float(acct.get("last_equity", equity))
            daily_pnl = equity - last_equity
            return {
                "trades_today": len(_orders),
                "gross_pnl": daily_pnl,
                "net_pnl": daily_pnl,
                "win_rate": None,
                "paper_trading": True,
                "source": "alpaca",
                "equity": equity,
                "cash": cash,
            }
        except Exception:  # noqa: BLE001
            logger.warning("Alpaca summary failed, using mock")

    # Mock fallback with basic P&L from in-memory positions
    gross_pnl = sum(
        (pos.get("current_price", 0) - pos.get("avg_price", 0))
        * pos.get("quantity", 0)
        for pos in _positions.values()
    )
    return {
        "trades_today": len(_orders),
        "gross_pnl": round(gross_pnl, 2),
        "net_pnl": round(gross_pnl, 2),
        "win_rate": None,
        "paper_trading": True,
        "source": "mock",
    }


@router.get("/connection-status")
async def connection_status() -> dict:
    """Check whether Alpaca paper-trading API is reachable."""
    trader = _get_trader()
    if trader:
        try:
            acct = trader.get_account()
            return {
                "connected": True,
                "source": "alpaca",
                "account_id": acct.get("id", ""),
                "equity": float(acct.get("equity", 0)),
            }
        except Exception as exc:  # noqa: BLE001
            return {"connected": False, "source": "alpaca", "error": str(exc)}
    return {
        "connected": False,
        "source": "mock",
        "error": "No Alpaca API keys configured",
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
        trader = _get_trader()
        equity = 100_000.0  # Default mock equity for paper trading
        if trader:
            try:
                acct = trader.get_account()
                equity = float(acct.get("equity", 100_000))
            except Exception:  # noqa: BLE001
                pass

        position_value = _engine.size_position(signal, equity)
        if position_value > 0:
            price: float = body.get("price", 100.0)
            quantity = max(1, int(position_value / price))
            order_result = None
            if trader:
                try:
                    order_result = trader.submit_order(
                        ticker, signal.direction, quantity, price
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Alpaca order submission failed: %s", exc)

            if order_result:
                return {
                    "signal": asdict(signal),
                    "order": {
                        "id": order_result["id"],
                        "ticker": order_result["symbol"],
                        "side": order_result["side"],
                        "quantity": float(order_result["qty"]),
                        "position_value": position_value,
                        "status": order_result["status"],
                        "source": "alpaca",
                    },
                }
            return {
                "signal": asdict(signal),
                "order": {
                    "ticker": ticker,
                    "side": signal.direction,
                    "quantity": quantity,
                    "position_value": position_value,
                    "status": "submitted",
                    "source": "mock",
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
        raise HTTPException(
            status_code=500, detail=f"Council evaluation failed: {exc}"
        ) from exc

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
