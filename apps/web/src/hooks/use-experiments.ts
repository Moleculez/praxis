"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
      toast.success("Experiment created");
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
    },
    onError: () => toast.error("Failed to create experiment"),
  });
}

export function useDeleteExperiment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/experiments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Experiment deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
    },
    onError: () => toast.error("Failed to delete experiment"),
  });
}

export function useUpdateExperimentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Experiment["status"] }) =>
      apiFetch<Experiment>(`/experiments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { id }) => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.detail(id) });
    },
    onError: () => toast.error("Failed to update status"),
  });
}

export function useUpdateExperiment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; manifest?: Record<string, unknown> } }) =>
      apiFetch<Experiment>(`/experiments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      toast.success("Experiment updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.experiments.detail(id) });
    },
    onError: () => toast.error("Failed to update experiment"),
  });
}
