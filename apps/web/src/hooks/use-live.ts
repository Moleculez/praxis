"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useSubmitOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ticker: string;
      side: string;
      quantity: number;
      price: number;
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
