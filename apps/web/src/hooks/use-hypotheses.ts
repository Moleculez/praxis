"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

export function useCreateHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { claim: string; mechanism: string }) =>
      apiFetch<Hypothesis>("/hypotheses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Hypothesis created");
      qc.invalidateQueries({ queryKey: queryKeys.hypotheses.all });
    },
    onError: () => toast.error("Failed to create hypothesis"),
  });
}

export function useUpdateHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { claim?: string; mechanism?: string } }) =>
      apiFetch<Hypothesis>(`/hypotheses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      toast.success("Hypothesis updated");
      qc.invalidateQueries({ queryKey: queryKeys.hypotheses.all });
      qc.invalidateQueries({ queryKey: queryKeys.hypotheses.detail(id) });
    },
    onError: () => toast.error("Failed to update hypothesis"),
  });
}

export function useDeleteHypothesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/hypotheses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Hypothesis deleted");
      qc.invalidateQueries({ queryKey: queryKeys.hypotheses.all });
    },
    onError: () => toast.error("Failed to delete hypothesis"),
  });
}
