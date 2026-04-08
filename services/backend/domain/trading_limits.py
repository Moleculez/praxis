"""Trading limits and safety configuration."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TradingLimits:
    """Configurable trading safety limits."""

    max_position_pct: float = 0.02  # Max 2% per position
    max_daily_loss: float = 5000.0  # Max daily loss in dollars
    max_positions: int = 8  # Max concurrent positions
    auto_execute_threshold: float = 0.01  # Auto-execute below 1% of equity


@dataclass
class SignalRecord:
    """A trading signal with approval tracking."""

    id: str
    timestamp: str
    ticker: str
    direction: str  # buy, sell, hold
    confidence: float
    reason: str
    position_value: float = 0.0
    status: str = "pending"  # pending, approved, rejected, auto_executed, executed
    source: str = "council"
