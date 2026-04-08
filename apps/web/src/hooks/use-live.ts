"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export interface Position {
  ticker: string;
  quantity: number;
  avg_price: number;
  current_price: number;
}

export interface Order {
  id: string;
  ticker: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
  timestamp: string;
}

export interface TradingSummary {
  trades_today: number;
  gross_pnl: number;
  net_pnl: number;
  win_rate: number | null;
  paper_trading: boolean;
}

export function usePositions() {
  return useQuery({
    queryKey: ["live", "positions"],
    queryFn: () => apiFetch<Position[]>("/live/positions"),
    refetchInterval: 5000,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["live", "orders"],
    queryFn: () => apiFetch<Order[]>("/live/orders"),
    refetchInterval: 5000,
  });
}

export function useTradingSummary() {
  return useQuery({
    queryKey: ["live", "summary"],
    queryFn: () => apiFetch<TradingSummary>("/live/summary"),
    refetchInterval: 5000,
  });
}

export function useSymbolSearch(query: string) {
  return useQuery({
    queryKey: ["live", "symbols", query],
    queryFn: () => apiFetch<string[]>(`/live/symbols?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  sector: string;
  market_cap: string;
  price?: number;
  change_pct?: number;
}

export function useSymbolSearchEnriched(query: string) {
  return useQuery({
    queryKey: ["live", "symbols", "enriched", query],
    queryFn: () => apiFetch<SymbolInfo[]>(`/live/symbols/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    staleTime: 30_000,
  });
}

export function useSubmitOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ticker: string;
      side: string;
      quantity: number;
      price?: number;
      order_type?: string;
      time_in_force?: string;
    }) =>
      apiFetch<Order>("/live/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live"] });
    },
  });
}

export interface PromotedExperiment {
  experiment_id: string | null;
  experiment_name: string | null;
  promoted_at: string | null;
}

export interface AutoTradeStatus {
  running: boolean;
  signals_count: number;
  config: Record<string, unknown>;
  promoted?: PromotedExperiment | null;
}

export interface Signal {
  id: string;
  timestamp: string;
  ticker: string;
  direction: "buy" | "sell";
  confidence: number;
  reason: string;
}

export function useAutoTradeStatus() {
  return useQuery({
    queryKey: ["live", "auto-trade", "status"],
    queryFn: () => apiFetch<AutoTradeStatus>("/live/auto-trade/status"),
    refetchInterval: 3000,
  });
}

export function useSignals() {
  return useQuery({
    queryKey: ["live", "signals"],
    queryFn: () => apiFetch<Signal[]>("/live/signals"),
    refetchInterval: 5000,
  });
}

export function useStartAutoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: {
      strategy?: string;
      min_confidence?: number;
      experiment_id?: string;
      experiment_name?: string;
    }) =>
      apiFetch("/live/auto-trade/start", {
        method: "POST",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      toast.success("Auto-trade started");
      qc.invalidateQueries({ queryKey: ["live"] });
    },
    onError: () => toast.error("Failed to start auto-trade"),
  });
}

export function useStopAutoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/live/auto-trade/stop", { method: "POST" }),
    onSuccess: () => {
      toast.success("Auto-trade stopped");
      qc.invalidateQueries({ queryKey: ["live"] });
    },
    onError: () => toast.error("Failed to stop"),
  });
}

export function useGenerateSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ticker: string;
      probability?: number;
      thesis?: string;
      use_council?: boolean;
      price?: number;
    }) =>
      apiFetch("/live/auto-trade/generate-signal", {
        method: "POST",
        body: JSON.stringify(data),
        timeout: data.use_council ? 120_000 : 10_000,
      }),
    onSuccess: () => {
      toast.success("Signal generated");
      qc.invalidateQueries({ queryKey: ["live", "signals"] });
    },
    onError: () => toast.error("Signal generation failed"),
  });
}

export function useConnectionStatus() {
  return useQuery({
    queryKey: ["live", "connection-status"],
    queryFn: () =>
      apiFetch<{
        connected: boolean;
        source: string;
        error?: string;
        equity?: number;
      }>("/live/connection-status"),
    refetchInterval: 30_000,
    retry: 1,
  });
}
