"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

export interface Position {
  ticker: string;
  quantity: number;
  avg_price: number;
  current_price: number;
}

export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

export interface PortfolioData {
  total_value: number;
  cash: number;
  daily_pnl: number;
  positions: Position[];
  allocation: AllocationSlice[];
}

export interface RiskMetrics {
  annualized_vol: number | null;
  var_99: number | null;
  expected_shortfall: number | null;
  correlation_drift: number | null;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
}

export function usePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolios.all,
    queryFn: () => apiFetch<PortfolioData>("/portfolios"),
  });
}

export function useRiskMetrics() {
  return useQuery({
    queryKey: [...queryKeys.portfolios.all, "risk"],
    queryFn: () => apiFetch<RiskMetrics>("/portfolios/risk"),
  });
}
