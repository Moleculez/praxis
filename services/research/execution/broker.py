"""Broker abstraction layer for multi-broker support."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Broker(ABC):
    """Abstract broker interface.

    Implementations: Alpaca (PaperTrader), IBKR (IBKRTrader).
    """

    @abstractmethod
    def submit_order(
        self,
        ticker: str,
        side: str,
        quantity: float,
        price: float | None = None,
    ) -> dict[str, Any]: ...

    @abstractmethod
    def get_positions(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def get_account(self) -> dict[str, Any]: ...

    @abstractmethod
    def get_orders(
        self, status: str = "all", limit: int = 50
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def cancel_order(self, order_id: str) -> dict[str, Any]: ...

    @abstractmethod
    def cancel_all_orders(self) -> dict[str, Any]: ...
