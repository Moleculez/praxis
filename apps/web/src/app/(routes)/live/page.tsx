"use client";

import { useState } from "react";
import {
  usePositions,
  useOrders,
  useTradingSummary,
  useSubmitOrder,
} from "@/hooks/use-live";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function pnlColor(value: number): string {
  if (value > 0) return "text-green-500";
  if (value < 0) return "text-red-500";
  return "";
}

function sideColor(side: string): string {
  return side.toLowerCase() === "buy" ? "text-green-500" : "text-red-500";
}

const positionColumns = ["Ticker", "Qty", "Avg Price", "Current", "Unrealized P&L"];
const orderColumns = ["Time", "Ticker", "Side", "Qty", "Price", "Status"];

export default function LivePage() {
  const positions = usePositions();
  const orders = useOrders();
  const summary = useTradingSummary();
  const submitOrder = useSubmitOrder();

  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    submitOrder.mutate({
      ticker: ticker.toUpperCase(),
      side,
      quantity: Number(quantity),
      price: Number(price),
    });
    setTicker("");
    setQuantity("");
    setPrice("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Live</h1>

      {/* Status banner */}
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
        <span className="font-medium">Paper Trading Mode</span>
        {summary.data && (
          <span className="ml-auto text-sm text-muted-foreground">
            {summary.data.trades_today} trade{summary.data.trades_today !== 1 ? "s" : ""} today
          </span>
        )}
      </div>

      {/* Order form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="ticker" className="text-xs font-medium text-muted-foreground">
            Ticker
          </label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="AAPL"
            className="h-9 w-28 rounded-md border bg-background px-3 text-sm uppercase"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Side</label>
          <div className="flex h-9 overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`px-3 text-sm font-medium transition-colors ${
                side === "buy"
                  ? "bg-green-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`px-3 text-sm font-medium transition-colors ${
                side === "sell"
                  ? "bg-red-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Sell
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className="text-xs font-medium text-muted-foreground">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="100"
            className="h-9 w-24 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-xs font-medium text-muted-foreground">
            Price
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150.00"
            className="h-9 w-28 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitOrder.isPending || !ticker || !quantity || !price}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitOrder.isPending ? "Submitting..." : "Submit Order"}
        </button>
        {submitOrder.isError && (
          <p className="w-full text-sm text-red-500">
            Failed to submit order. Please try again.
          </p>
        )}
      </form>

      {/* Positions table */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        {positions.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading positions...</p>
        ) : positions.isError ? (
          <p className="py-8 text-center text-sm text-red-500">Failed to load positions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {positionColumns.map((col) => (
                  <th key={col} className="pb-2 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.data && positions.data.length > 0 ? (
                positions.data.map((pos) => {
                  const unrealized = (pos.current_price - pos.avg_price) * pos.quantity;
                  return (
                    <tr key={pos.ticker} className="border-b last:border-0">
                      <td className="py-2 font-medium">{pos.ticker}</td>
                      <td className="py-2">{pos.quantity}</td>
                      <td className="py-2">{formatCurrency(pos.avg_price)}</td>
                      <td className="py-2">{formatCurrency(pos.current_price)}</td>
                      <td className={`py-2 ${pnlColor(unrealized)}`}>
                        {formatCurrency(unrealized)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={positionColumns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No open positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent orders table */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>
        {orders.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading orders...</p>
        ) : orders.isError ? (
          <p className="py-8 text-center text-sm text-red-500">Failed to load orders.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {orderColumns.map((col) => (
                  <th key={col} className="pb-2 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.data && orders.data.length > 0 ? (
                orders.data.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2">
                      {new Date(order.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-medium">{order.ticker}</td>
                    <td className={`py-2 font-medium ${sideColor(order.side)}`}>
                      {order.side.toUpperCase()}
                    </td>
                    <td className="py-2">{order.quantity}</td>
                    <td className="py-2">{formatCurrency(order.price)}</td>
                    <td className="py-2">{order.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={orderColumns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Trades Today</p>
          <p className="text-2xl font-bold">
            {summary.data?.trades_today ?? "--"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold">
            {summary.data?.win_rate != null
              ? `${(summary.data.win_rate * 100).toFixed(1)}%`
              : "--"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Gross P&L</p>
          <p className={`text-2xl font-bold ${pnlColor(summary.data?.gross_pnl ?? 0)}`}>
            {summary.data ? formatCurrency(summary.data.gross_pnl) : "$0.00"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Net P&L</p>
          <p className={`text-2xl font-bold ${pnlColor(summary.data?.net_pnl ?? 0)}`}>
            {summary.data ? formatCurrency(summary.data.net_pnl) : "$0.00"}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Connect paper trading API keys in .env to start.
      </p>
    </div>
  );
}
