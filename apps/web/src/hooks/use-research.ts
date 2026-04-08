"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface PipelineStatus {
  data: string;
  features: string;
  labels: string;
  model: string;
  backtest: string;
  portfolio: string;
}

export function usePipelineStatus(experimentId?: string) {
  return useQuery({
    queryKey: queryKeys.research.pipeline(experimentId),
    queryFn: () =>
      experimentId
        ? apiFetch<PipelineStatus>(`/research/pipeline/${experimentId}`)
        : apiFetch<Record<string, PipelineStatus>>("/research/pipeline"),
    refetchInterval: 5000,
  });
}

export function useRunPipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      experimentId,
      stage,
    }: {
      experimentId: string;
      stage: string;
    }) =>
      apiFetch<{ stage: string; status: string; message?: string; error?: string }>(
        `/research/pipeline/${experimentId}/run/${stage}`,
        { method: "POST", timeout: 60_000 },
      ),
    onSuccess: (data) => {
      if (data.status === "failed") {
        toast.error(`${data.stage} stage failed: ${data.error ?? "unknown error"}`);
      } else {
        toast.success(`${data.stage} stage ${data.status}`);
      }
      qc.invalidateQueries({ queryKey: queryKeys.research.pipeline() });
    },
    onError: (_, { stage }) => toast.error(`${stage} stage failed`),
  });
}

export function useRunAllStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (experimentId: string) =>
      apiFetch<{ status: string; message?: string }>(
        `/research/pipeline/${experimentId}/run-all`,
        { method: "POST", timeout: 120_000 },
      ),
    onSuccess: () => {
      toast.success("Pipeline completed");
      qc.invalidateQueries({ queryKey: queryKeys.research.pipeline() });
    },
    onError: () => toast.error("Pipeline failed"),
  });
}

export function useIngestData() {
  return useMutation({
    mutationFn: ({ source, ticker }: { source: string; ticker?: string }) =>
      apiFetch<{ source: string; ticker: string; rows: number; status: string; message: string }>(
        `/research/ingest/${source}`,
        {
          method: "POST",
          body: JSON.stringify({ ticker: ticker || "SPY" }),
          timeout: 30_000,
        },
      ),
    onSuccess: (data) =>
      toast.success(data.message || `Ingested ${data.rows} rows from ${data.source}`),
    onError: () => toast.error("Data ingest failed"),
  });
}
