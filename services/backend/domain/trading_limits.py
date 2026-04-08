"""Trading limits and safety configuration."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TradingLimits:
    """Configurable trading safety limits."""

    max_position_pct: float = 0.05  # Max 5% per position (more aggressive)
    max_daily_loss: float = 10000.0  # Max daily loss in dollars
    max_positions: int = 15  # Max concurrent positions
    auto_execute_threshold: float = 0.10  # Auto-execute below 10% of equity (must be >= max_position_pct)
    min_confidence: float = 0.55  # Lower threshold = more trades (default was 0.6)
    scan_interval_sec: int = 60  # Seconds between ticker scans (default was 300)
    tickers: str = "SPY,QQQ,AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM"  # Comma-separated
    use_council: bool = True  # Use LLM council for signal generation
    aggressive_mode: bool = False  # Skip council, use momentum signals directly


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
