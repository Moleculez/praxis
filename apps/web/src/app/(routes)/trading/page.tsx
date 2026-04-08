"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import { cn } from "@/lib/utils";
import {
  usePositions,
  useOrders,
  useTradingSummary,
  useSubmitOrder,
  useUpdateOrderNotes,
  useAutoTradeStatus,
  useSignals,
  useStartAutoTrade,
  useStopAutoTrade,
  useGenerateSignal,
  useConnectionStatus,
} from "@/hooks/use-live";
import { usePortfolio } from "@/hooks/use-portfolios";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pnlColor(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "";
}

function sideColor(side: string): string {
  return side.toLowerCase() === "buy"
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  }
  if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `${hrs} hr${hrs !== 1 ? "s" : ""} ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function signalStatusBadge(signal: { direction: string; confidence: number }): {
  label: string;
  className: string;
} {
  // Heuristic: high-confidence signals are auto-executed, medium are pending
  if (signal.confidence >= 0.8) {
    return {
      label: "auto",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
  }
  if (signal.confidence >= 0.6) {
    return {
      label: "executed",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
  }
  return {
    label: "pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STRATEGIES = ["momentum", "mean-reversion", "stat-arb"] as const;

/* ------------------------------------------------------------------ */
/*  Top Bar — AI Trading Controls                                      */
/* ------------------------------------------------------------------ */

function AIControlBar() {
  const autoStatus = useAutoTradeStatus();
  const startAutoTrade = useStartAutoTrade();
  const stopAutoTrade = useStopAutoTrade();
  const connectionStatus = useConnectionStatus();

  const [strategy, setStrategy] = useState<string>(STRATEGIES[0]);
  const [minConfidence, setMinConfidence] = useState(0.65);

  const isRunning = autoStatus.data?.running ?? false;
  const connected = connectionStatus.data?.connected ?? false;
  const equity = connectionStatus.data?.equity;

  function handleStart() {
    startAutoTrade.mutate({ strategy, min_confidence: minConfidence });
  }

  function handleStop() {
    stopAutoTrade.mutate();
  }

  function handleKillSwitch() {
    stopAutoTrade.mutate(undefined, {
      onSuccess: () => toast.success("Kill switch activated — all trading stopped"),
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Strategy selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="trading-strategy"
            className="text-sm font-medium text-muted-foreground"
          >
            Strategy:
          </label>
          <select
            id="trading-strategy"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            disabled={isRunning}
            className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          >
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence slider */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="trading-confidence"
            className="text-sm font-medium text-muted-foreground"
          >
            Confidence: {minConfidence.toFixed(2)}
          </label>
          <input
            id="trading-confidence"
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            disabled={isRunning}
            className="w-32 disabled:opacity-50"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={startAutoTrade.isPending}
              className="h-8 rounded-md bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {startAutoTrade.isPending ? "Starting..." : "Start AI Trading"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStop}
                disabled={stopAutoTrade.isPending}
                className="h-8 rounded-md bg-gray-600 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                {stopAutoTrade.isPending ? "Stopping..." : "Stop"}
              </button>
              <button
                type="button"
                onClick={handleKillSwitch}
                disabled={stopAutoTrade.isPending}
                className="h-8 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                Kill Switch
              </button>
            </>
          )}
        </div>

        {/* Connection + equity info */}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                connected ? "bg-green-500" : "bg-yellow-500",
              )}
            />
            <span className="font-medium">
              {connected ? "Alpaca Paper" : "Mock Mode"}
            </span>
          </div>
          {equity != null && (
            <span className="text-muted-foreground">
              Equity: {formatCurrency(equity)}
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                AI Active
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Portfolio Summary (stat cards)                                     */
/* ------------------------------------------------------------------ */

function PortfolioSummary() {
  const portfolio = usePortfolio();
  const summary = useTradingSummary();

  const totalValue = portfolio.data?.total_value ?? 0;
  const cash = portfolio.data?.cash ?? 0;
  const dailyPnl = portfolio.data?.daily_pnl ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Total Value</p>
        <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Cash</p>
        <p className="text-2xl font-bold">{formatCurrency(cash)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Daily P&L</p>
        <p className={cn("text-2xl font-bold", pnlColor(dailyPnl))}>
          {formatCurrency(dailyPnl)}
        </p>
        {summary.data?.win_rate != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Win rate: {(summary.data.win_rate * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Positions Table                                                    */
/* ------------------------------------------------------------------ */

const positionColumns = [
  "Ticker",
  "Qty",
  "Avg Price",
  "Current",
  "Unrealized P&L",
  "Allocation %",
];

function PositionsTable() {
  const positions = usePositions();
  const portfolio = usePortfolio();

  const totalValue = portfolio.data?.total_value ?? 0;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Positions</h2>
      {positions.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading positions...
        </p>
      ) : positions.isError ? (
        <p className="py-8 text-center text-sm text-red-500">
          Failed to load positions.
        </p>
      ) : positions.data && positions.data.length > 0 ? (
        <div className="overflow-x-auto">
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
              {positions.data.map((pos) => {
                const unrealized =
                  (pos.current_price - pos.avg_price) * pos.quantity;
                const allocationPct =
                  totalValue > 0
                    ? ((pos.current_price * pos.quantity) / totalValue) * 100
                    : 0;
                return (
                  <tr key={pos.ticker} className="border-b last:border-0">
                    <td className="py-2 font-medium">{pos.ticker}</td>
                    <td className="py-2">{pos.quantity}</td>
                    <td className="py-2">{formatCurrency(pos.avg_price)}</td>
                    <td className="py-2">{formatCurrency(pos.current_price)}</td>
                    <td className={cn("py-2 font-medium", pnlColor(unrealized))}>
                      {formatCurrency(unrealized)}
                    </td>
                    <td className="py-2">{allocationPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-sm">No open positions</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Order History Table                                                */
/* ------------------------------------------------------------------ */

const orderColumns = ["Time", "Ticker", "Side", "Qty", "Price", "Status", ""];

function OrderHistory() {
  const orders = useOrders();
  const updateNotes = useUpdateOrderNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");

  function openEditor(orderId: string, existingNotes: string) {
    setEditingId(orderId);
    setDraftNotes(existingNotes);
  }

  function closeEditor() {
    setEditingId(null);
    setDraftNotes("");
  }

  function saveNotes(orderId: string) {
    updateNotes.mutate(
      { orderId, notes: draftNotes },
      { onSuccess: () => closeEditor() },
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Order History</h2>
      {orders.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading orders...
        </p>
      ) : orders.isError ? (
        <p className="py-8 text-center text-sm text-red-500">
          Failed to load orders.
        </p>
      ) : orders.data && orders.data.length > 0 ? (
        <div className="overflow-x-auto">
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
              {orders.data.map((order) => {
                const hasNotes = !!order.notes;
                const isEditing = editingId === order.id;
                return (
                  <tr key={order.id} className="border-b last:border-0 align-top">
                    <td
                      className="py-2 text-muted-foreground"
                      title={new Date(order.timestamp).toLocaleString()}
                    >
                      {formatRelativeTime(order.timestamp)}
                    </td>
                    <td className="py-2 font-medium">{order.ticker}</td>
                    <td className={cn("py-2 font-medium", sideColor(order.side))}>
                      {order.side.toUpperCase()}
                    </td>
                    <td className="py-2">{order.quantity}</td>
                    <td className="py-2">{formatCurrency(order.price)}</td>
                    <td className="py-2">{order.status}</td>
                    <td className="py-2">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                          <textarea
                            rows={2}
                            value={draftNotes}
                            onChange={(e) => setDraftNotes(e.target.value)}
                            placeholder="Add trade notes..."
                            className="w-full rounded-md border bg-background px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => saveNotes(order.id)}
                              disabled={updateNotes.isPending}
                              className="h-6 rounded bg-primary px-2 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              {updateNotes.isPending ? "..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={closeEditor}
                              className="h-6 rounded border px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1">
                          <button
                            type="button"
                            onClick={() => openEditor(order.id, order.notes ?? "")}
                            className={cn(
                              "shrink-0 rounded p-1 transition-colors hover:bg-muted",
                              hasNotes
                                ? "text-primary"
                                : "text-muted-foreground/50 hover:text-muted-foreground",
                            )}
                            title={hasNotes ? "Edit note" : "Add note"}
                          >
                            <Pencil size={14} />
                          </button>
                          {hasNotes && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {order.notes}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">No orders yet</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Signal Feed                                                     */
/* ------------------------------------------------------------------ */

function SignalFeed() {
  const signals = useSignals();

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">AI Signal Feed</h2>
      {signals.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading signals...
        </p>
      ) : signals.data && signals.data.length > 0 ? (
        <div className="space-y-3">
          {signals.data.map((sig, idx) => {
            const badge = signalStatusBadge(sig);
            return (
              <div
                key={sig.id ?? idx}
                className="rounded-md border p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sig.ticker}</span>
                    <span
                      className={cn("font-medium text-sm", sideColor(sig.direction))}
                    >
                      {sig.direction.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(sig.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Confidence: {(sig.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {sig.reason && (
                  <p className="text-xs text-muted-foreground">{sig.reason}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <p className="text-sm">No signals yet</p>
          <p className="text-xs">Start AI trading to generate signals</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Manual Order Form                                                  */
/* ------------------------------------------------------------------ */

function ManualOrderForm() {
  const submitOrder = useSubmitOrder();

  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [timeInForce, setTimeInForce] = useState<"day" | "gtc">("day");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker || !quantity) return;
    if (orderType === "limit" && !price) return;
    submitOrder.mutate(
      {
        ticker: ticker.toUpperCase(),
        side,
        quantity: Number(quantity),
        price: orderType === "limit" ? Number(price) : undefined,
        order_type: orderType,
        time_in_force: timeInForce,
      },
      {
        onSuccess: () => {
          toast.success(`${orderType === "market" ? "Market" : "Limit"} order submitted`);
          setTicker("");
          setQuantity("");
          setPrice("");
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to submit order");
        },
      },
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Place Order</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="order-ticker" className="text-xs font-medium text-muted-foreground">
            Ticker
          </label>
          <TickerAutocomplete
            id="order-ticker"
            value={ticker}
            onChange={setTicker}
            className="h-9 w-full"
          />
        </div>

        {/* Buy / Sell */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Side</label>
          <div className="flex h-9 overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                side === "buy"
                  ? "bg-green-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                side === "sell"
                  ? "bg-red-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Order Type: Market / Limit */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Order Type</label>
          <div className="flex h-9 overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setOrderType("market")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                orderType === "market"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setOrderType("limit")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                orderType === "limit"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity + Price (price only for limit) */}
        <div className={cn("grid gap-3", orderType === "limit" ? "grid-cols-2" : "grid-cols-1")}>
          <div className="flex flex-col gap-1">
            <label htmlFor="order-qty" className="text-xs font-medium text-muted-foreground">
              Shares
            </label>
            <input
              id="order-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          {orderType === "limit" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="order-price" className="text-xs font-medium text-muted-foreground">
                Limit Price
              </label>
              <input
                id="order-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </div>
          )}
        </div>

        {/* Time in Force */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Duration</label>
          <div className="flex h-9 overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setTimeInForce("day")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                timeInForce === "day"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setTimeInForce("gtc")}
              className={cn(
                "flex-1 px-3 text-sm font-medium transition-colors",
                timeInForce === "gtc"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              GTC
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {timeInForce === "day" ? "Cancels at market close" : "Good til cancelled"}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitOrder.isPending || !ticker || !quantity || (orderType === "limit" && !price)}
          className={cn(
            "h-10 w-full rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50",
            side === "buy"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700",
          )}
        >
          {submitOrder.isPending
            ? "Submitting..."
            : `${side === "buy" ? "Buy" : "Sell"} ${ticker || "..."} ${orderType === "market" ? "(Market)" : "(Limit)"}`}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Signal Form                                               */
/* ------------------------------------------------------------------ */

function GenerateSignalForm() {
  const generateSignal = useGenerateSignal();

  const [genTicker, setGenTicker] = useState("");
  const [genThesis, setGenThesis] = useState("");
  const [useCouncil, setUseCouncil] = useState(false);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genTicker) return;
    generateSignal.mutate(
      {
        ticker: genTicker.toUpperCase(),
        thesis: genThesis || undefined,
        use_council: useCouncil,
      },
      {
        onSuccess: () => {
          setGenTicker("");
          setGenThesis("");
        },
      },
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Generate Signal</h2>
      <form onSubmit={handleGenerate} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="gen-ticker"
            className="text-xs font-medium text-muted-foreground"
          >
            Ticker
          </label>
          <TickerAutocomplete
            id="gen-ticker"
            value={genTicker}
            onChange={setGenTicker}
            className="h-9 w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="gen-thesis"
            className="text-xs font-medium text-muted-foreground"
          >
            Thesis
          </label>
          <textarea
            id="gen-thesis"
            rows={3}
            value={genThesis}
            onChange={(e) => {
              const prev = genThesis.trim();
              setGenThesis(e.target.value);
              if (!prev && e.target.value.trim()) setUseCouncil(true);
            }}
            placeholder="Describe your investment thesis for AI council evaluation..."
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="gen-use-council"
            type="checkbox"
            checked={useCouncil}
            onChange={(e) => setUseCouncil(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="gen-use-council" className="text-sm font-medium">
            Use AI Council
          </label>
          {useCouncil && (
            <span className="text-xs text-muted-foreground">
              May take 30-60s
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={generateSignal.isPending || !genTicker}
          className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {generateSignal.isPending ? "Generating..." : "Generate"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Charts                                                             */
/* ------------------------------------------------------------------ */

function EquityCurveChart() {
  const orders = useOrders();
  const equityData = useMemo(() => {
    if (!orders.data?.length) return [];
    let cumulative = 0;
    return orders.data.map((o) => {
      const pnl = o.side === "sell" ? o.price * o.quantity : -(o.price * o.quantity);
      cumulative += pnl;
      return { time: new Date(o.timestamp).toLocaleDateString(), pnl: Math.round(cumulative) };
    });
  }, [orders.data]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">Equity Curve</h3>
      {equityData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={equityData}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No trades yet</p>
      )}
    </div>
  );
}

const ALLOC_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function AllocationChart() {
  const positions = usePositions();
  const data = useMemo(() => {
    if (!positions.data?.length) return [];
    return positions.data.map((p) => ({ name: p.ticker, value: Math.abs(p.quantity * p.current_price) }));
  }, [positions.data]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">Position Allocation</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name }) => name}>
              {data.map((_, i) => (<Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No positions yet</p>
      )}
    </div>
  );
}

function ConfidenceDistribution() {
  const signals = useSignals();
  const data = useMemo(() => {
    if (!signals.data?.length) return [];
    const buckets = [
      { range: "30-40%", count: 0 }, { range: "40-50%", count: 0 },
      { range: "50-60%", count: 0 }, { range: "60-70%", count: 0 },
      { range: "70-80%", count: 0 }, { range: "80%+", count: 0 },
    ];
    signals.data.forEach((s) => {
      const pct = s.confidence * 100;
      if (pct >= 80) buckets[5].count++;
      else if (pct >= 70) buckets[4].count++;
      else if (pct >= 60) buckets[3].count++;
      else if (pct >= 50) buckets[2].count++;
      else if (pct >= 40) buckets[1].count++;
      else buckets[0].count++;
    });
    return buckets;
  }, [signals.data]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">Signal Confidence</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No signals yet</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TradingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Trading</h1>

      <AIControlBar />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <PortfolioSummary />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EquityCurveChart />
            <AllocationChart />
          </div>
          <PositionsTable />
          <OrderHistory />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <SignalFeed />
          <ConfidenceDistribution />
          <ManualOrderForm />
          <GenerateSignalForm />
        </div>
      </div>
    </div>
  );
}
