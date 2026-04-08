"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type {
  IntelBrief,
  CrawlerSource,
  CouncilSynthesis,
  TradeIdea,
} from "@/types";

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

// --- Trade Idea Review Queue ---

export function useTradeIdeas(status?: string) {
  return useQuery({
    queryKey: queryKeys.intelligence.ideas(status),
    queryFn: () =>
      apiFetch<TradeIdea[]>(
        `/intelligence/ideas${status ? `?status=${status}` : ""}`,
      ),
    refetchInterval: 10_000,
  });
}

export function useSaveTradeIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ticker: string;
      direction: string;
      thesis: string;
      entry_zone?: string;
      stop_loss?: string;
      target?: string;
      conviction?: string;
      pre_mortem?: string;
      kill_criteria?: string;
    }) =>
      apiFetch<TradeIdea>("/intelligence/ideas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Trade idea saved to queue");
      qc.invalidateQueries({ queryKey: ["intelligence", "ideas"] });
    },
    onError: () => toast.error("Failed to save trade idea"),
  });
}

export function useUpdateTradeIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      status?: string;
      notes?: string;
    }) => {
      const { id, ...body } = data;
      return apiFetch<TradeIdea>(`/intelligence/ideas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success("Trade idea updated");
      qc.invalidateQueries({ queryKey: ["intelligence", "ideas"] });
    },
    onError: () => toast.error("Failed to update trade idea"),
  });
}
