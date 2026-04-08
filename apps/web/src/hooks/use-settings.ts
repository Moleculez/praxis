"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export interface AppSettings {
  broker: {
    active: string;
    alpaca_configured: boolean;
    ibkr_configured: boolean;
  };
  llm: {
    openrouter_configured: boolean;
    anthropic_configured: boolean;
    openai_configured: boolean;
    google_configured: boolean;
    xai_configured: boolean;
    ollama_configured: boolean;
    ollama_model: string;
  };
  database: string;
}

export interface TradingLimits {
  max_position_pct: number;
  max_daily_loss: number;
  max_positions: number;
  auto_execute_threshold: number;
  min_confidence: number;
  scan_interval_sec: number;
  tickers: string;
  use_council: boolean;
  aggressive_mode: boolean;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<AppSettings>("/settings"),
  });
}

export function useTradingLimits() {
  return useQuery({
    queryKey: ["live", "settings"],
    queryFn: () => apiFetch<TradingLimits>("/live/settings"),
  });
}

export function useUpdateTradingLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TradingLimits>) =>
      apiFetch("/live/settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Trading limits saved");
      qc.invalidateQueries({ queryKey: ["live", "settings"] });
    },
    onError: () => toast.error("Failed to save limits"),
  });
}

export function useTestLLM() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; response?: string; error?: string }>(
        "/settings/llm/test",
        { timeout: 30_000 },
      ),
    onSuccess: (data) => {
      if (data.status === "connected") toast.success("LLM connected!");
      else toast.error(`LLM error: ${data.error}`);
    },
    onError: () => toast.error("LLM test failed"),
  });
}

export function useTestBroker() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; broker?: string; error?: string }>(
        "/settings/broker/test",
      ),
    onSuccess: (data) => {
      if (data.status === "connected")
        toast.success(`${data.broker} connected!`);
      else toast.error(data.error || "Broker not configured");
    },
    onError: () => toast.error("Broker test failed"),
  });
}
