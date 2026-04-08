"""Portfolio state and risk metrics routes."""

from __future__ import annotations

import logging
import math

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

_BASE_EQUITY = 100_000.0

_SECTOR_COLORS = {
    "Technology": "#3b82f6",
    "Healthcare": "#22c55e",
    "Financials": "#f59e0b",
    "Energy": "#ef4444",
    "Consumer Staples": "#8b5cf6",
    "Consumer Cyclical": "#ec4899",
    "Industrials": "#6366f1",
    "Communication": "#14b8a6",
    "Utilities": "#84cc16",
    "Materials": "#f97316",
    "ETF": "#64748b",
    "Crypto": "#a855f7",
    "Cash": "#94a3b8",
}

_NULL_RISK: dict = {
    "annualized_vol": None,
    "var_99": None,
    "expected_shortfall": None,
    "correlation_drift": None,
    "sharpe_ratio": None,
    "max_drawdown": None,
}

_DEFAULT_PORTFOLIO: dict = {
    "total_value": _BASE_EQUITY,
    "cash": _BASE_EQUITY,
    "daily_pnl": 0.00,
    "positions": [],
    "allocation": [{"name": "Cash", "value": 100, "color": _SECTOR_COLORS["Cash"]}],
    "source": "mock",
}


@router.get("/")
async def get_portfolio() -> dict:
    """Return portfolio state from Alpaca or in-memory live state."""
    try:
        from services.backend.config import get_settings

        settings = get_settings()
        if settings.alpaca_api_key and settings.alpaca_secret_key:
            from services.research.execution.paper import PaperTrader

            trader = PaperTrader(
                settings.alpaca_api_key,
                settings.alpaca_secret_key,
                settings.alpaca_base_url,
            )
            acct = trader.get_account()
            positions_raw = trader.get_positions()

            equity = float(acct.get("equity", _BASE_EQUITY))
            cash = float(acct.get("cash", _BASE_EQUITY))
            last_equity = float(acct.get("last_equity", equity))
            daily_pnl = round(equity - last_equity, 2)

            positions = []
            allocation = []
            for p in positions_raw:
                market_value = float(p.get("market_value", 0))
                positions.append(
                    {
                        "ticker": p["symbol"],
                        "quantity": float(p["qty"]),
                        "avg_price": float(p["avg_entry_price"]),
                        "current_price": float(p["current_price"]),
                        "market_value": market_value,
                        "unrealized_pnl": float(p.get("unrealized_pl", 0)),
                    }
                )
                pct = round(market_value / equity * 100, 1) if equity > 0 else 0
                allocation.append(
                    {
                        "name": p["symbol"],
                        "value": pct,
                        "color": _SECTOR_COLORS.get("ETF", "#64748b"),
                    }
                )

            cash_pct = round(cash / equity * 100, 1) if equity > 0 else 100
            allocation.append(
                {"name": "Cash", "value": cash_pct, "color": _SECTOR_COLORS["Cash"]}
            )

            return {
                "total_value": equity,
                "cash": cash,
                "daily_pnl": daily_pnl,
                "positions": positions,
                "allocation": allocation,
                "source": "alpaca",
            }
    except Exception as exc:
        logger.warning("Alpaca portfolio fetch failed: %s", exc)

    # Fall back to in-memory live state
    try:
        from services.backend.adapters.http.routes.live import _positions

        positions = list(_positions.values())
        total_position_value = sum(
            p.get("current_price", 0) * abs(p.get("quantity", 0)) for p in positions
        )
        daily_pnl = round(
            sum(
                (p.get("current_price", 0) - p.get("avg_price", 0))
                * p.get("quantity", 0)
                for p in positions
            ),
            2,
        )
        total_value = _BASE_EQUITY + daily_pnl
        cash = total_value - total_position_value

        allocation = []
        for p in positions:
            mv = abs(p.get("quantity", 0)) * p.get("current_price", 0)
            pct = round(mv / total_value * 100, 1) if total_value > 0 else 0
            allocation.append(
                {"name": p["ticker"], "value": pct, "color": "#3b82f6"}
            )
        cash_pct = round(cash / total_value * 100, 1) if total_value > 0 else 100
        allocation.append(
            {"name": "Cash", "value": cash_pct, "color": _SECTOR_COLORS["Cash"]}
        )

        return {
            "total_value": round(total_value, 2),
            "cash": round(cash, 2),
            "daily_pnl": daily_pnl,
            "positions": positions,
            "allocation": allocation,
            "source": "mock",
        }
    except Exception:
        return {**_DEFAULT_PORTFOLIO}


@router.get("/risk")
async def get_risk_metrics() -> dict:
    """Compute basic risk metrics from positions and order history."""
    try:
        from services.backend.adapters.http.routes.live import _orders, _positions

        if not _positions and not _orders:
            return {**_NULL_RISK}

        positions = list(_positions.values())
        n_positions = len(positions)

        pnl_values = [
            (p.get("current_price", 0) - p.get("avg_price", 0))
            * p.get("quantity", 0)
            for p in positions
        ]
        total_pnl = sum(pnl_values)

        daily_vol = 0.0
        if n_positions > 1:
            mean_pnl = total_pnl / n_positions
            variance = sum((pnl - mean_pnl) ** 2 for pnl in pnl_values) / n_positions
            daily_vol = math.sqrt(variance) if variance > 0 else 0.0
            annualized_vol: float | None = round(
                daily_vol * math.sqrt(252) / _BASE_EQUITY * 100, 2
            )
        else:
            annualized_vol = None

        # 2.33 sigma for 99% confidence
        var_99: float | None = (
            round(2.33 * daily_vol, 2) if n_positions > 1 else None
        )

        max_dd: float | None = None
        if _orders:
            cumulative = 0.0
            peak = 0.0
            max_drawdown = 0.0
            for order in _orders:
                price = order.get("price", 0)
                qty = order.get("quantity", 0)
                side = order.get("side", "buy")
                if side == "sell":
                    cumulative += price * qty
                else:
                    cumulative -= price * qty
                peak = max(peak, cumulative)
                max_drawdown = max(max_drawdown, peak - cumulative)
            max_dd = round(max_drawdown, 2) if max_drawdown > 0 else None

        sharpe: float | None = None
        if annualized_vol and annualized_vol > 0:
            annualized_return = total_pnl / _BASE_EQUITY * 252
            sharpe = round(annualized_return / (annualized_vol / 100), 2)

        return {
            "annualized_vol": annualized_vol,
            "var_99": var_99,
            "expected_shortfall": round(var_99 * 1.2, 2) if var_99 else None,
            "correlation_drift": None,
            "sharpe_ratio": sharpe,
            "max_drawdown": max_dd,
        }
    except Exception as exc:
        logger.warning("Risk metrics computation failed: %s", exc)
        return {**_NULL_RISK}
