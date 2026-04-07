"""Paper-trading live execution routes."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter()

# In-memory state for paper trading (resets on restart).
_MAX_ORDERS = 10_000
_orders: list[dict] = []
_positions: dict[str, dict] = {}


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
