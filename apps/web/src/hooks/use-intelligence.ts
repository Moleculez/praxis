"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { IntelBrief, CrawlerSource, CouncilSynthesis } from "@/types";

export function useIntelBriefs() {
  return useQuery({
    queryKey: queryKeys.intelligence.briefs,
    queryFn: () => apiFetch<IntelBrief[]>("/intelligence/briefs"),
  });
}

export function useCrawlerSources() {
  return useQuery({
    queryKey: queryKeys.intelligence.sources,
    queryFn: () => apiFetch<CrawlerSource[]>("/intelligence/sources"),
  });
}

export function useEvaluateThesis() {
  return useMutation({
    mutationFn: (data: { thesis: string; ticker?: string; context?: string }) =>
      apiFetch<CouncilSynthesis>("/intelligence/evaluate-thesis", {
        method: "POST",
        body: JSON.stringify(data),
        timeout: 120_000,
      }),
    onSuccess: () => toast.success("Council evaluation complete"),
    onError: () => toast.error("Council evaluation failed"),
  });
}

export function useGenerateHypotheses() {
  return useMutation({
    mutationFn: (data: { context?: string; ticker?: string; count?: number }) =>
      apiFetch<{
        hypotheses: Array<{ claim: string; mechanism: string; ticker: string }>;
        market_context: string;
      }>("/intelligence/generate-hypotheses", {
        method: "POST",
        body: JSON.stringify(data),
        timeout: 60_000,
      }),
    onError: () => toast.error("AI hypothesis generation failed"),
  });
}

export function useGenerateTradeIdea() {
  return useMutation({
    mutationFn: (data: {
      thesis: string;
      ticker: string;
      council_synthesis?: CouncilSynthesis;
    }) =>
      apiFetch("/intelligence/trade-idea", {
        method: "POST",
        body: JSON.stringify(data),
        timeout: 60_000,
      }),
    onSuccess: () => toast.success("Trade idea generated"),
    onError: () => toast.error("Trade idea generation failed"),
  });
}
