"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import { cn } from "@/lib/utils";
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "@/hooks/use-live";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function priceColor(changePct: number | null): string {
  if (changePct == null) return "";
  if (changePct > 0) return "text-green-600 dark:text-green-400";
  if (changePct < 0) return "text-red-600 dark:text-red-400";
  return "";
}

function formatPrice(price: number | null): string {
  if (price == null) return "--";
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ------------------------------------------------------------------ */
/*  Add-to-watchlist form                                              */
/* ------------------------------------------------------------------ */

function AddForm() {
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const addMutation = useAddToWatchlist();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    addMutation.mutate(
      {
        ticker: ticker.trim(),
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        alert_type: alertType,
      },
      {
        onSuccess: () => {
          setTicker("");
          setTargetPrice("");
          setAlertType("above");
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label
          htmlFor="watchlist-ticker"
          className="text-xs font-medium text-muted-foreground"
        >
          Ticker
        </label>
        <TickerAutocomplete
          id="watchlist-ticker"
          value={ticker}
          onChange={setTicker}
          placeholder="AAPL"
          className="h-9 w-full"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[120px]">
        <label
          htmlFor="watchlist-target"
          className="text-xs font-medium text-muted-foreground"
        >
          Target Price
        </label>
        <input
          id="watchlist-target"
          type="number"
          step="0.01"
          min="0"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="optional"
          className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[100px]">
        <label
          htmlFor="watchlist-alert-type"
          className="text-xs font-medium text-muted-foreground"
        >
          Alert When
        </label>
        <select
          id="watchlist-alert-type"
          value={alertType}
          onChange={(e) => setAlertType(e.target.value as "above" | "below")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!ticker.trim() || addMutation.isPending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {addMutation.isPending ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Watchlist table                                                    */
/* ------------------------------------------------------------------ */

function WatchlistTable() {
  const { data: items, isLoading, error } = useWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  // Track which alerts have already been toasted to avoid duplicates
  const toastedRef = useRef<Set<string>>(new Set());

  // Fire toast when a price crosses its target for the first time
  useEffect(() => {
    if (!items) return;
    for (const item of items) {
      if (item.triggered && !toastedRef.current.has(item.id)) {
        toastedRef.current.add(item.id);
        toast.warning(
          `${item.ticker} hit target ${formatPrice(item.target_price)} (now ${formatPrice(item.current_price)})`,
          { duration: 8000 },
        );
      }
    }
  }, [items]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
        Loading watchlist...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-red-500 text-sm">
        Failed to load watchlist.
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
        Your watchlist is empty. Add a ticker above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium text-right">Price</th>
            <th className="px-4 py-3 font-medium text-right">Change</th>
            <th className="px-4 py-3 font-medium text-right">Target</th>
            <th className="px-4 py-3 font-medium text-right">Distance</th>
            <th className="px-4 py-3 font-medium text-center">Alert</th>
            <th className="px-4 py-3 font-medium text-center">Remove</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3 font-semibold">{item.ticker}</td>
              <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                {item.name}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular-nums font-medium",
                  priceColor(item.change_pct),
                )}
              >
                {formatPrice(item.current_price)}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular-nums",
                  priceColor(item.change_pct),
                )}
              >
                {item.change_pct != null
                  ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(2)}%`
                  : "--"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {item.target_price != null
                  ? formatPrice(item.target_price)
                  : "--"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {item.distance_pct != null
                  ? `${item.distance_pct >= 0 ? "+" : ""}${item.distance_pct.toFixed(1)}%`
                  : "--"}
              </td>
              <td className="px-4 py-3 text-center">
                {item.target_price != null ? (
                  item.triggered ? (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                      Triggered!
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.alert_type}
                    </span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={removeMutation.isPending}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  title="Remove from watchlist"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track tickers and set price alerts. Prices refresh every 15 seconds.
        </p>
      </div>

      <AddForm />
      <WatchlistTable />
    </div>
  );
}
