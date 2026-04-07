"""Portfolio state and risk metrics routes."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_portfolio() -> dict:
    """Return current portfolio state (mock for dev)."""
    return {
        "total_value": 100000.00,
        "cash": 100000.00,
        "daily_pnl": 0.00,
        "positions": [],
        "allocation": [{"name": "Cash", "value": 100, "color": "#94a3b8"}],
    }


@router.get("/risk")
async def get_risk_metrics() -> dict:
    """Return portfolio risk metrics (null until positions exist)."""
    return {
        "annualized_vol": None,
        "var_99": None,
        "expected_shortfall": None,
        "correlation_drift": None,
        "sharpe_ratio": None,
        "max_drawdown": None,
    }
