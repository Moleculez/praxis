# HARD RULE: No live trading from inside Claude Code. Paper only.
"""Paper trading via Alpaca. NEVER live trading."""

from __future__ import annotations

from typing import Any

from services.backend.http_client import make_sync_client
from services.research.execution.broker import Broker


class PaperTrader(Broker):
    """Paper trading execution only.

    Live execution requires a human-signed CLI command outside Claude Code.
    """

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://paper-api.alpaca.markets",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "APCA-API-KEY-ID": api_key,
            "APCA-API-SECRET-KEY": secret_key,
            "Content-Type": "application/json",
        }
        self._client = make_sync_client(
            base_url=self.base_url,
            headers=self.headers,
            timeout=15.0,
        )

    # -- orders ---------------------------------------------------------------

    def submit_order(
        self,
        ticker: str,
        side: str,
        quantity: float,
        price: float | None = None,
    ) -> dict[str, Any]:
        """Submit a paper trade order.

        Args:
            ticker: Symbol to trade (e.g. "AAPL").
            side: "buy" or "sell".
            quantity: Number of shares.
            price: Limit price. If None a market order is placed.

        Returns:
            Order dict from Alpaca.
        """
        order_type = "limit" if price is not None else "market"
        payload: dict[str, Any] = {
            "symbol": ticker,
            "qty": str(quantity),
            "side": side,
            "type": order_type,
            "time_in_force": "day",
        }
        if price is not None:
            payload["limit_price"] = str(price)

        resp = self._client.post("/v2/orders", json=payload)
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    # -- positions ------------------------------------------------------------

    def get_positions(self) -> list[dict[str, Any]]:
        """Get current paper trading positions."""
        resp = self._client.get("/v2/positions")
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    # -- account --------------------------------------------------------------

    def get_account(self) -> dict[str, Any]:
        """Get paper trading account details."""
        resp = self._client.get("/v2/account")
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    # -- orders list ----------------------------------------------------------

    def get_orders(
        self,
        status: str = "all",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Get paper trading orders.

        Args:
            status: Filter by order status ("open", "closed", "all").
            limit: Maximum number of orders to return.

        Returns:
            List of order dicts.
        """
        resp = self._client.get(
            "/v2/orders",
            params={"status": status, "limit": limit},
        )
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    # -- cancel ---------------------------------------------------------------

    def cancel_order(self, order_id: str) -> dict[str, Any]:
        """Cancel a single order by ID."""
        resp = self._client.delete(f"/v2/orders/{order_id}")
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    def cancel_all_orders(self) -> dict[str, Any]:
        """Cancel all open orders."""
        resp = self._client.delete("/v2/orders")
        resp.raise_for_status()
        return {"status": "cancelled"}
