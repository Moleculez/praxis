# HARD RULE: No live trading from inside Claude Code. Paper only.
"""Interactive Brokers Client Portal API integration.

Uses the IBKR Client Portal Gateway REST API (simpler than TWS).
Gateway must be running at the configured URL (default localhost:5000).
See: https://interactivebrokers.github.io/cpwebapi/
"""

from __future__ import annotations

from typing import Any

import httpx

from services.research.execution.broker import Broker


class IBKRTrader(Broker):
    """IBKR paper trading via Client Portal Gateway.

    Live execution requires a human-signed CLI command outside Claude Code.
    """

    def __init__(
        self,
        account_id: str,
        gateway_url: str = "https://localhost:5000",
    ) -> None:
        self.account_id = account_id
        self.gateway_url = gateway_url.rstrip("/")
        self._client = httpx.Client(
            base_url=f"{self.gateway_url}/v1/api",
            timeout=15.0,
            verify=False,  # IBKR gateway uses self-signed certs
        )

    # -- orders ---------------------------------------------------------------

    def submit_order(
        self,
        ticker: str,
        side: str,
        quantity: float,
        price: float | None = None,
    ) -> dict[str, Any]:
        """Submit a paper trade order via IBKR Client Portal.

        Args:
            ticker: Symbol to trade (e.g. "AAPL").
            side: "buy" or "sell".
            quantity: Number of shares.
            price: Limit price. If None a market order is placed.

        Returns:
            Normalized order dict.
        """
        order_type = "LMT" if price is not None else "MKT"
        order: dict[str, Any] = {
            "conid": 0,  # Requires contract lookup in production
            "orderType": order_type,
            "side": side.upper(),
            "quantity": quantity,
            "tif": "DAY",
            "ticker": ticker,
        }
        if price is not None:
            order["price"] = price

        resp = self._client.post(
            f"/iserver/account/{self.account_id}/orders",
            json={"orders": [order]},
        )
        resp.raise_for_status()
        result = resp.json()

        order_id = ""
        if isinstance(result, list) and result:
            order_id = result[0].get("order_id", "")

        return {
            "id": order_id,
            "symbol": ticker,
            "side": side,
            "qty": str(quantity),
            "status": "submitted",
            "created_at": "",
        }

    # -- positions ------------------------------------------------------------

    def get_positions(self) -> list[dict[str, Any]]:
        """Get current positions from IBKR."""
        resp = self._client.get(
            f"/portfolio/{self.account_id}/positions/0",
        )
        resp.raise_for_status()
        positions: list[dict[str, Any]] = resp.json()
        return [
            {
                "symbol": p.get("ticker", p.get("contractDesc", "")),
                "qty": str(p.get("position", 0)),
                "avg_entry_price": str(p.get("avgCost", 0)),
                "current_price": str(p.get("mktPrice", 0)),
                "market_value": str(p.get("mktValue", 0)),
                "unrealized_pl": str(p.get("unrealizedPnl", 0)),
            }
            for p in positions
        ]

    # -- account --------------------------------------------------------------

    def get_account(self) -> dict[str, Any]:
        """Get IBKR account details."""
        resp = self._client.get("/portfolio/accounts")
        resp.raise_for_status()
        accounts: list[dict[str, Any]] = resp.json()
        if not accounts:
            return {"equity": "0", "cash": "0"}

        acct = accounts[0]
        try:
            summary_resp = self._client.get(
                f"/portfolio/{self.account_id}/summary",
            )
            summary_resp.raise_for_status()
            data: dict[str, Any] = summary_resp.json()
            equity = str(
                data.get("netliquidation", {}).get("amount", 0)
            )
            cash = str(
                data.get("totalcashvalue", {}).get("amount", 0)
            )
            return {
                "id": acct.get("accountId", ""),
                "equity": equity,
                "cash": cash,
                "last_equity": equity,
            }
        except Exception:  # noqa: BLE001
            return {
                "id": acct.get("accountId", ""),
                "equity": "0",
                "cash": "0",
            }

    # -- orders list ----------------------------------------------------------

    def get_orders(
        self, status: str = "all", limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get orders from IBKR.

        Args:
            status: Unused — IBKR returns all recent orders.
            limit: Maximum number of orders to return.

        Returns:
            Normalized list of order dicts.
        """
        resp = self._client.get("/iserver/account/orders")
        resp.raise_for_status()
        orders: list[dict[str, Any]] = resp.json().get("orders", [])
        return [
            {
                "id": o.get("orderId", ""),
                "symbol": o.get("ticker", ""),
                "side": o.get("side", "").lower(),
                "qty": str(o.get("totalSize", 0)),
                "filled_avg_price": str(o.get("avgPrice", 0)),
                "status": o.get("status", "").lower(),
                "created_at": o.get("lastExecutionTime_r", ""),
            }
            for o in orders[:limit]
        ]

    # -- cancel ---------------------------------------------------------------

    def cancel_order(self, order_id: str) -> dict[str, Any]:
        """Cancel a single order."""
        resp = self._client.delete(
            f"/iserver/account/{self.account_id}/order/{order_id}",
        )
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    def cancel_all_orders(self) -> dict[str, Any]:
        """Cancel all open orders (IBKR has no bulk-cancel endpoint)."""
        orders = self.get_orders(status="open")
        for o in orders:
            try:
                self.cancel_order(o["id"])
            except Exception:  # noqa: BLE001
                pass
        return {"status": "cancelled", "count": len(orders)}
