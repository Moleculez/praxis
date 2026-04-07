# HARD RULE: No live trading from inside Claude Code. Paper only.
"""Paper trading via Alpaca/IBKR. NEVER live trading."""

from __future__ import annotations


class PaperTrader:
    """Paper trading execution only.

    Live execution requires a human-signed CLI command outside Claude Code.
    """

    def submit_order(self) -> None:
        """Submit a paper trade order."""
        raise NotImplementedError

    def get_positions(self) -> None:
        """Get current paper trading positions."""
        raise NotImplementedError
