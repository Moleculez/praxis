"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { Hypothesis } from "@/types";

export function useHypotheses() {
  return useQuery({
    queryKey: queryKeys.hypotheses.all,
    queryFn: () => apiFetch<Hypothesis[]>("/hypotheses"),
  });
}

export function useHypothesis(id: string) {
  return useQuery({
    queryKey: queryKeys.hypotheses.detail(id),
    queryFn: () => apiFetch<Hypothesis>(`/hypotheses/${id}`),
    enabled: !!id,
  });
}
