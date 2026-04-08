"""Paper-trading live execution routes."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import httpx
from fastapi import APIRouter, HTTPException

from services.backend.domain.trading_limits import SignalRecord, TradingLimits
from services.research.execution.strategy import StrategyConfig, StrategyEngine

if TYPE_CHECKING:
    from services.research.execution.paper import PaperTrader

logger = logging.getLogger(__name__)

router = APIRouter()

# Module-level strategy engine for auto-trade endpoints.
_engine = StrategyEngine()

# Trading safety system state.
_trading_limits = TradingLimits()
_signal_records: list[SignalRecord] = []
_MAX_SIGNAL_RECORDS = 10_000

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


_TICKER_INFO: list[dict] = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "market_cap": "3.4T"},
    {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology", "market_cap": "3.1T"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "sector": "Technology", "market_cap": "2.1T"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "market_cap": "2.0T"},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology", "market_cap": "2.8T"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "market_cap": "1.5T"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Cyclical", "market_cap": "800B"},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway (B)", "sector": "Financials", "market_cap": "900B"},
    {"symbol": "UNH", "name": "UnitedHealth Group", "sector": "Healthcare", "market_cap": "500B"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "market_cap": "380B"},
    {"symbol": "LLY", "name": "Eli Lilly & Co.", "sector": "Healthcare", "market_cap": "750B"},
    {"symbol": "MRK", "name": "Merck & Co.", "sector": "Healthcare", "market_cap": "280B"},
    {"symbol": "ABBV", "name": "AbbVie Inc.", "sector": "Healthcare", "market_cap": "310B"},
    {"symbol": "AMGN", "name": "Amgen Inc.", "sector": "Healthcare", "market_cap": "150B"},
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financials", "market_cap": "550B"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financials", "market_cap": "600B"},
    {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financials", "market_cap": "430B"},
    {"symbol": "GS", "name": "Goldman Sachs Group", "sector": "Financials", "market_cap": "160B"},
    {"symbol": "XOM", "name": "Exxon Mobil Corp.", "sector": "Energy", "market_cap": "460B"},
    {"symbol": "CVX", "name": "Chevron Corp.", "sector": "Energy", "market_cap": "280B"},
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
    {"symbol": "BA", "name": "Boeing Co.", "sector": "Industrials", "market_cap": "130B"},
    {"symbol": "RTX", "name": "RTX Corp.", "sector": "Industrials", "market_cap": "150B"},
    {"symbol": "UNP", "name": "Union Pacific Corp.", "sector": "Industrials", "market_cap": "150B"},
    {"symbol": "TMO", "name": "Thermo Fisher Scientific", "sector": "Healthcare", "market_cap": "200B"},
    {"symbol": "ABT", "name": "Abbott Laboratories", "sector": "Healthcare", "market_cap": "190B"},
    {"symbol": "DHR", "name": "Danaher Corp.", "sector": "Healthcare", "market_cap": "180B"},
    {"symbol": "NEE", "name": "NextEra Energy", "sector": "Utilities", "market_cap": "150B"},
    {"symbol": "LIN", "name": "Linde PLC", "sector": "Materials", "market_cap": "210B"},
    {"symbol": "PM", "name": "Philip Morris Intl.", "sector": "Consumer Staples", "market_cap": "190B"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "sector": "ETF", "market_cap": "500B+"},
    {"symbol": "QQQ", "name": "Invesco QQQ (Nasdaq-100)", "sector": "ETF", "market_cap": "250B+"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "sector": "ETF", "market_cap": "60B"},
    {"symbol": "DIA", "name": "SPDR Dow Jones ETF", "sector": "ETF", "market_cap": "30B"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market", "sector": "ETF", "market_cap": "400B+"},
    {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "sector": "ETF", "market_cap": "450B+"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "sector": "ETF", "market_cap": "65B"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury", "sector": "ETF", "market_cap": "50B"},
    {"symbol": "XLK", "name": "Technology Select Sector", "sector": "ETF", "market_cap": "60B"},
    {"symbol": "XLF", "name": "Financial Select Sector", "sector": "ETF", "market_cap": "40B"},
    {"symbol": "XLE", "name": "Energy Select Sector", "sector": "ETF", "market_cap": "35B"},
    {"symbol": "ARKK", "name": "ARK Innovation ETF", "sector": "ETF", "market_cap": "6B"},
    {"symbol": "SOXX", "name": "iShares Semiconductor ETF", "sector": "ETF", "market_cap": "12B"},
    {"symbol": "BTC/USD", "name": "Bitcoin", "sector": "Crypto", "market_cap": "1.3T"},
    {"symbol": "ETH/USD", "name": "Ethereum", "sector": "Crypto", "market_cap": "400B"},
    {"symbol": "SOL/USD", "name": "Solana", "sector": "Crypto", "market_cap": "65B"},
]

_POPULAR_TICKERS = [t["symbol"] for t in _TICKER_INFO]


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
    """Search ticker symbols with enriched metadata and live quotes."""
    if not q:
        matches = _TICKER_INFO[:20]
    else:
        q_upper = q.upper()
        q_lower = q.lower()
        matches = [
            t for t in _TICKER_INFO
            if t["symbol"].startswith(q_upper) or q_lower in t["name"].lower()
        ][:15]

    # Fetch live quotes for matched symbols
    symbols = [m["symbol"] for m in matches if "/" not in m["symbol"]]
    quotes = await _fetch_quotes(symbols) if symbols else {}

    result = []
    for m in matches:
        entry = {**m}
        quote = quotes.get(m["symbol"])
        if quote:
            entry["price"] = quote.get("price")
            entry["change_pct"] = quote.get("change_pct")
        result.append(entry)
    return result


_quotes_cache: dict[str, dict] = {}
_quotes_cache_time: float = 0.0
_QUOTES_TTL = 30.0  # seconds


async def _fetch_quotes(symbols: list[str]) -> dict[str, dict]:
    """Fetch latest price + change % from Yahoo Finance with 30s TTL cache."""
    global _quotes_cache, _quotes_cache_time  # noqa: PLW0603

    if not symbols:
        return {}

    # Return cached results if fresh
    if time.monotonic() - _quotes_cache_time < _QUOTES_TTL and _quotes_cache:
        return _quotes_cache

    joined = ",".join(symbols)
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={joined}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; PraxisBot/1.0)"},
            )
            resp.raise_for_status()
        data = resp.json()
        results: dict[str, dict] = {}
        for q in data.get("quoteResponse", {}).get("result", []):
            sym = q.get("symbol", "")
            price = q.get("regularMarketPrice")
            change = q.get("regularMarketChangePercent")
            if sym and price is not None:
                results[sym] = {
                    "price": round(price, 2),
                    "change_pct": round(change, 2) if change is not None else None,
                }
        _quotes_cache = results
        _quotes_cache_time = time.monotonic()
        return results
    except Exception:  # noqa: BLE001
        return _quotes_cache  # return stale cache on error


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


@router.get("/settings")
async def get_trading_settings() -> dict:
    """Return current trading safety limits."""
    return {
        "max_position_pct": _trading_limits.max_position_pct,
        "max_daily_loss": _trading_limits.max_daily_loss,
        "max_positions": _trading_limits.max_positions,
        "auto_execute_threshold": _trading_limits.auto_execute_threshold,
    }


@router.post("/settings")
async def update_trading_settings(body: dict) -> dict:
    """Update trading safety limits."""
    global _trading_limits  # noqa: PLW0603
    _trading_limits = TradingLimits(
        max_position_pct=body.get(
            "max_position_pct", _trading_limits.max_position_pct
        ),
        max_daily_loss=body.get("max_daily_loss", _trading_limits.max_daily_loss),
        max_positions=body.get("max_positions", _trading_limits.max_positions),
        auto_execute_threshold=body.get(
            "auto_execute_threshold", _trading_limits.auto_execute_threshold
        ),
    )
    return asdict(_trading_limits)


@router.get("/signals")
async def get_signals(limit: int = 50) -> list[dict]:
    """Return recent signal records with approval status."""
    if _signal_records:
        records = _signal_records[-limit:]
        return [asdict(r) for r in reversed(records)]
    # Fallback to raw engine signals if no records yet
    signals = _engine.get_signals(limit)
    return [asdict(s) for s in signals]


@router.post("/signals/{signal_id}/approve")
async def approve_signal(signal_id: str) -> dict:
    """Approve a pending signal and execute the trade."""
    for sig in _signal_records:
        if sig.id == signal_id and sig.status == "pending":
            sig.status = "approved"
            trader = _get_trader()
            if trader and sig.direction != "hold":
                try:
                    price = 100.0  # would need real price
                    qty = max(1, int(sig.position_value / price))
                    trader.submit_order(sig.ticker, sig.direction, qty, price)
                    sig.status = "executed"
                except Exception:  # noqa: BLE001
                    logger.warning("Order execution failed after approval")
            return {"id": sig.id, "status": sig.status}
    raise HTTPException(status_code=404, detail="Signal not found or not pending")


@router.post("/signals/{signal_id}/reject")
async def reject_signal(signal_id: str) -> dict:
    """Reject a pending signal."""
    for sig in _signal_records:
        if sig.id == signal_id and sig.status == "pending":
            sig.status = "rejected"
            return {"id": sig.id, "status": sig.status}
    raise HTTPException(status_code=404, detail="Signal not found or not pending")


@router.post("/kill-switch")
async def kill_switch() -> dict:
    """Emergency stop -- cancel all pending signals, stop engine."""
    _engine.stop()

    cancelled = 0
    for sig in _signal_records:
        if sig.status == "pending":
            sig.status = "rejected"
            cancelled += 1

    return {
        "status": "killed",
        "signals_cancelled": cancelled,
        "engine_stopped": True,
    }


def _create_signal_record(
    *,
    ticker: str,
    direction: str,
    confidence: float,
    reason: str,
    position_value: float,
    status: str,
    source: str,
) -> SignalRecord:
    """Create a SignalRecord, append it, and trim the list if needed."""
    record = SignalRecord(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(UTC).isoformat(),
        ticker=ticker,
        direction=direction,
        confidence=confidence,
        reason=reason,
        position_value=position_value,
        status=status,
        source=source,
    )
    _signal_records.append(record)
    if len(_signal_records) > _MAX_SIGNAL_RECORDS:
        _signal_records[:] = _signal_records[-_MAX_SIGNAL_RECORDS:]
    return record


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

    # If engine is running and signal is actionable, apply safety system
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
            pct_of_equity = position_value / equity if equity > 0 else 1.0

            source = "council" if use_council else "manual"

            if pct_of_equity < _trading_limits.auto_execute_threshold:
                order_result = None
                if trader:
                    try:
                        order_result = trader.submit_order(
                            ticker, signal.direction, quantity, price
                        )
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("Alpaca order submission failed: %s", exc)

                record = _create_signal_record(
                    ticker=ticker,
                    direction=signal.direction,
                    confidence=signal.confidence,
                    reason=signal.reason,
                    position_value=position_value,
                    status="auto_executed",
                    source=source,
                )

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
                        "approval": "auto_executed",
                        "signal_record_id": record.id,
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
                    "approval": "auto_executed",
                    "signal_record_id": record.id,
                }

            record = _create_signal_record(
                ticker=ticker,
                direction=signal.direction,
                confidence=signal.confidence,
                reason=signal.reason,
                position_value=position_value,
                status="pending",
                source=source,
            )

            return {
                "signal": asdict(signal),
                "order": None,
                "approval": "pending",
                "signal_record_id": record.id,
                "message": (
                    f"Position is {pct_of_equity:.1%} of equity, "
                    f"above {_trading_limits.auto_execute_threshold:.1%} threshold. "
                    "Approval required."
                ),
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
