# HARD RULE: No live trading from inside Claude Code. Paper only.
"""Paper trading via Alpaca/IBKR. NEVER live trading."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import polars as pl


class PaperTrader:
    """Paper trading execution only.

    Live execution requires a human-signed CLI command outside Claude Code.
    """

    def submit_order(
        self,
        symbol: str,
        quantity: float,
        side: str,
    ) -> dict[str, Any]:
        """Submit a paper trade order."""
        raise NotImplementedError

    def get_positions(self) -> pl.DataFrame:
        """Get current paper trading positions."""
        raise NotImplementedError
