"""AI-powered strategy execution engine.

Connects council synthesis -> trading signals -> position sizing -> order submission.
HARD RULE: Paper trading only. Auto-trade requires human approval toggle.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal


@dataclass
class Signal:
    timestamp: datetime
    ticker: str
    direction: Literal["buy", "sell", "hold"]
    confidence: float  # 0.0-1.0
    reason: str
    source: str = "council"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class StrategyConfig:
    max_position_pct: float = 0.02  # 2% per position cap
    kelly_haircut: float = 0.5  # Half-Kelly
    min_confidence: float = 0.6  # Min council probability to act
    max_positions: int = 8  # Max concurrent positions
    strategy_type: str = "momentum"


class StrategyEngine:
    def __init__(self, config: StrategyConfig | None = None) -> None:
        self.config = config or StrategyConfig()
        self._signals: list[Signal] = []
        self._max_signals = 10_000
        self._running = False

    def generate_signal(
        self, ticker: str, council_probability: float, thesis: str = ""
    ) -> Signal:
        """Convert council synthesis probability into a trading signal."""
        if council_probability >= self.config.min_confidence:
            direction: Literal["buy", "sell", "hold"] = "buy"
        elif council_probability <= (1 - self.config.min_confidence):
            direction = "sell"
        else:
            direction = "hold"

        signal = Signal(
            timestamp=datetime.now(UTC),
            ticker=ticker,
            direction=direction,
            confidence=council_probability,
            reason=thesis or f"Council probability: {council_probability:.1%}",
        )
        self._signals.append(signal)
        if len(self._signals) > self._max_signals:
            self._signals = self._signals[-self._max_signals :]
        return signal

    def size_position(self, signal: Signal, account_equity: float) -> float:
        """Calculate position size using half-Kelly with caps."""
        if signal.direction == "hold":
            return 0.0
        # Kelly fraction: f* = (p*b - q) / b, simplified for equal payoff
        p = signal.confidence if signal.direction == "buy" else (1 - signal.confidence)
        kelly = max(0.0, 2 * p - 1) * self.config.kelly_haircut
        # Cap at max_position_pct of equity
        position_value = min(kelly, self.config.max_position_pct) * account_equity
        return round(position_value, 2)

    def get_signals(self, limit: int = 50) -> list[Signal]:
        return list(reversed(self._signals[-limit:]))

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> None:
        self._running = True

    def stop(self) -> None:
        self._running = False
