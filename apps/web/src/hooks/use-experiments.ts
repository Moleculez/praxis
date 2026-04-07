"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { Experiment } from "@/types";

export function useExperiments() {
  return useQuery({
    queryKey: queryKeys.experiments.all,
    queryFn: () => apiFetch<Experiment[]>("/experiments"),
  });
}

export function useExperiment(id: string) {
  return useQuery({
    queryKey: queryKeys.experiments.detail(id),
    queryFn: () => apiFetch<Experiment>(`/experiments/${id}`),
    enabled: !!id,
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; manifest?: Record<string, unknown> }) =>
      apiFetch<Experiment>("/experiments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
    },
  });
}

export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/experiments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
    },
  });
}
