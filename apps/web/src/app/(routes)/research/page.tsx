"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useHypotheses, useCreateHypothesis } from "@/hooks/use-hypotheses";
import { useExperiments, useCreateExperiment } from "@/hooks/use-experiments";
import {
  usePipelineStatus,
  useRunPipelineStage,
  useRunAllStages,
  useIngestData,
} from "@/hooks/use-research";
import { useStartAutoTrade } from "@/hooks/use-live";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import { cn } from "@/lib/utils";

const pipelineStages = [
  { key: "data", name: "Data", description: "Ingest OHLCV, FRED, EDGAR" },
  { key: "features", name: "Features", description: "Dollar bars, fracdiff, microstructure" },
  { key: "labels", name: "Labels", description: "Triple-barrier + meta-labels" },
  { key: "model", name: "Model", description: "LightGBM, sequence, linear floor" },
  { key: "backtest", name: "Backtest", description: "CPCV, DSR, PBO validation" },
  { key: "portfolio", name: "Portfolio", description: "HRP/NCO allocation" },
] as const;

type StageKey = (typeof pipelineStages)[number]["key"];

const ingestSources = [
  { key: "yahoo", label: "Yahoo Finance", available: true },
  { key: "fred", label: "FRED", available: false },
  { key: "edgar", label: "EDGAR", available: false },
  { key: "polygon", label: "Polygon", available: false },
] as const;

const hypothesisStatusColors: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  testing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function statusDot(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500 dark:bg-green-400";
    case "running":
      return "bg-blue-500 dark:bg-blue-400 animate-pulse";
    case "failed":
      return "bg-red-500 dark:bg-red-400";
    default:
      return "bg-gray-300 dark:bg-gray-600";
  }
}

function canRunStage(
  stageKey: StageKey,
  pipelineStatus: Record<string, string> | undefined,
): boolean {
  if (!pipelineStatus) return true;
  // Don't allow re-running a currently running stage
  if (pipelineStatus[stageKey] === "running") return false;
  // First stage can always run
  const idx = pipelineStages.findIndex((s) => s.key === stageKey);
  if (idx === 0) return true;
  // Later stages: allow if previous stage completed OR if this stage hasn't started
  const prevKey = pipelineStages[idx - 1].key;
  return pipelineStatus[prevKey] === "completed" || pipelineStatus[stageKey] === "not_started";
}

function StepBadge({ step, label, active }: { step: number; label: string; active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">
        {step}
      </span>
      {label}
    </div>
  );
}

export default function ResearchPage() {
  const router = useRouter();
  const { data: hypotheses, isLoading: hypoLoading, error: hypoError } = useHypotheses();
  const { data: experiments, isError: expError } = useExperiments();

  const [selectedExpId, setSelectedExpId] = useState<string>("");
  const { data: pipelineData } = usePipelineStatus(selectedExpId || undefined);
  const runStage = useRunPipelineStage();
  const runAll = useRunAllStages();

  const [ticker, setTicker] = useState("SPY");
  const [source, setSource] = useState<string>(ingestSources[0].key);
  const ingest = useIngestData();

  const [newClaim, setNewClaim] = useState("");
  const [newMechanism, setNewMechanism] = useState("");
  const createHypothesis = useCreateHypothesis();
  const createExperiment = useCreateExperiment();
  const startAutoTrade = useStartAutoTrade();

  const selectedSourceAvailable =
    ingestSources.find((s) => s.key === source)?.available ?? false;

  const pipelineStatus = selectedExpId
    ? (pipelineData as Record<string, string> | undefined)
    : undefined;

  const allCompleted =
    !!pipelineStatus &&
    pipelineStages.every((s) => pipelineStatus[s.key] === "completed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Research Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a hypothesis, run the pipeline, promote winners to live trading.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        <StepBadge step={1} label="Hypothesis" active={!selectedExpId} />
        <span className="text-muted-foreground">→</span>
        <StepBadge step={2} label="Pipeline" active={!!selectedExpId && !allCompleted} />
        <span className="text-muted-foreground">→</span>
        <StepBadge step={3} label="Promote" active={allCompleted} />
      </div>

      {expError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load experiments. Check that the API server is running.</p>
        </div>
      )}

      {/* Step 1: Hypothesis */}
      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Step 1: Define Hypothesis</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newClaim.trim() || !newMechanism.trim()) return;
            createHypothesis.mutate(
              { claim: newClaim.trim(), mechanism: newMechanism.trim() },
              {
                onSuccess: () => {
                  setNewClaim("");
                  setNewMechanism("");
                },
              },
            );
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Claim
            </label>
            <input
              type="text"
              value={newClaim}
              onChange={(e) => setNewClaim(e.target.value)}
              placeholder="e.g. Momentum factor decays faster in high-vol regimes"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Causal Mechanism
            </label>
            <textarea
              value={newMechanism}
              onChange={(e) => setNewMechanism(e.target.value)}
              rows={3}
              placeholder="Describe the causal mechanism behind this claim..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={createHypothesis.isPending || !newClaim.trim() || !newMechanism.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createHypothesis.isPending ? "Creating..." : "Create Hypothesis"}
          </button>
        </form>

        {/* Hypotheses list */}
        <div className="mt-6">
          {hypoLoading && (
            <p className="text-muted-foreground text-sm">Loading hypotheses...</p>
          )}
          {hypoError && (
            <p className="text-red-500 text-sm">Failed to load hypotheses.</p>
          )}
          {hypotheses && hypotheses.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No hypotheses yet. Create one to start the research pipeline.
            </p>
          )}
          {hypotheses && hypotheses.length > 0 && (
            <div className="space-y-3">
              {hypotheses.map((h) => (
                <div key={h.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{h.claim}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${hypothesisStatusColors[h.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {h.status}
                      </span>
                      <button
                        onClick={() => {
                          createExperiment.mutate(
                            {
                              name: `test-${h.claim.slice(0, 30)}`,
                              manifest: { hypothesis_id: h.id },
                            },
                            {
                              onSuccess: (exp) => setSelectedExpId(exp.id),
                            },
                          );
                        }}
                        disabled={createExperiment.isPending}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {createExperiment.isPending ? "Creating..." : "Test This →"}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{h.mechanism}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Pipeline */}
      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Step 2: Run Pipeline</h2>

        {/* Experiment selector */}
        <div className="flex items-center justify-between mb-4">
          <select
            value={selectedExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Select experiment</option>
            {experiments?.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
          {selectedExpId && (
            <button
              onClick={() => runAll.mutate(selectedExpId)}
              disabled={runAll.isPending}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {runAll.isPending ? "Running..." : "Run All"}
            </button>
          )}
        </div>

        {!selectedExpId ? (
          <p className="text-muted-foreground text-sm">
            Select an experiment above or click &quot;Test This&quot; on a hypothesis.
          </p>
        ) : (
          <>
            {/* Ingest Data */}
            <div className="mb-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Ingest Data</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  >
                    {ingestSources.map((s) => (
                      <option key={s.key} value={s.key} disabled={!s.available}>
                        {s.label} {!s.available ? "(coming soon)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ticker</label>
                  <TickerAutocomplete
                    value={ticker}
                    onChange={setTicker}
                    placeholder="SPY"
                    className="py-1.5 w-32"
                  />
                </div>
                <button
                  onClick={() => ingest.mutate({ source, ticker })}
                  disabled={ingest.isPending || !selectedSourceAvailable}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {ingest.isPending ? "Ingesting..." : "Ingest"}
                </button>
              </div>
              {!selectedSourceAvailable && (
                <p className="mt-2 text-sm text-muted-foreground">
                  This data source is not yet implemented.
                </p>
              )}
            </div>

            {/* Pipeline stages */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {pipelineStages.map((stage, i) => {
                const stageStatus = pipelineStatus?.[stage.key] ?? "not_started";
                const enabled = canRunStage(stage.key, pipelineStatus);
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className="rounded-lg border p-3 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${statusDot(stageStatus)}`}
                        />
                        <span className="font-medium text-sm">{stage.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {stage.description}
                      </p>
                      <button
                        onClick={() =>
                          runStage.mutate({
                            experimentId: selectedExpId,
                            stage: stage.key,
                          })
                        }
                        disabled={!enabled || runStage.isPending}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Run
                      </button>
                    </div>
                    {i < pipelineStages.length - 1 && (
                      <span className="text-muted-foreground text-lg">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Step 3: Promote */}
      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Step 3: Promote to Trading</h2>
        {!allCompleted ? (
          <p className="text-muted-foreground text-sm">
            Complete all pipeline stages to promote this strategy to trading.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              All pipeline stages completed. This strategy is ready for live AI trading.
            </p>
            <button
              onClick={() => {
                startAutoTrade.mutate(
                  { strategy: "momentum", min_confidence: 0.6 },
                  {
                    onSuccess: () => {
                      toast.success("Strategy promoted! AI Trading started.");
                      router.push("/trading");
                    },
                  },
                );
              }}
              disabled={startAutoTrade.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {startAutoTrade.isPending ? "Promoting..." : "Promote to Trading"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
