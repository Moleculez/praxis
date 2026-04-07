"use client";

import { useState } from "react";
import Link from "next/link";
import { useHypotheses } from "@/hooks/use-hypotheses";
import { useExperiments } from "@/hooks/use-experiments";
import {
  usePipelineStatus,
  useRunPipelineStage,
  useIngestData,
} from "@/hooks/use-research";

const pipelineStages = [
  { key: "data", name: "Data", description: "Ingest OHLCV, FRED, EDGAR" },
  { key: "features", name: "Features", description: "Dollar bars, fracdiff, microstructure" },
  { key: "labels", name: "Labels", description: "Triple-barrier + meta-labels" },
  { key: "model", name: "Model", description: "LightGBM, sequence, linear floor" },
  { key: "backtest", name: "Backtest", description: "CPCV, DSR, PBO validation" },
  { key: "portfolio", name: "Portfolio", description: "HRP/NCO allocation" },
] as const;

type StageKey = (typeof pipelineStages)[number]["key"];

const ingestSources = ["yahoo", "fred", "edgar", "polygon"] as const;

const hypothesisStatusColors: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  testing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const quickLinks = [
  { href: "/experiments", title: "Experiments", description: "Track backtest experiments and results" },
  { href: "/portfolios", title: "Portfolios", description: "View allocations and risk metrics" },
  { href: "/intelligence", title: "Intelligence", description: "Cogito briefs and council analysis" },
];

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
  if (!pipelineStatus) return stageKey === "data";
  const idx = pipelineStages.findIndex((s) => s.key === stageKey);
  if (idx === 0) return pipelineStatus["data"] !== "running";
  const prevKey = pipelineStages[idx - 1].key;
  return (
    pipelineStatus[prevKey] === "completed" &&
    pipelineStatus[stageKey] !== "running"
  );
}

export default function ResearchPage() {
  const { data: hypotheses, isLoading: hypoLoading, error: hypoError } = useHypotheses();
  const { data: experiments } = useExperiments();

  const [selectedExpId, setSelectedExpId] = useState<string>("");
  const { data: pipelineData } = usePipelineStatus(selectedExpId || undefined);
  const runStage = useRunPipelineStage();

  const [ticker, setTicker] = useState("SPY");
  const [source, setSource] = useState<string>(ingestSources[0]);
  const ingest = useIngestData();

  const pipelineStatus = selectedExpId
    ? (pipelineData as Record<string, string> | undefined)
    : undefined;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Research Pipeline</h1>

      {/* Ingest Data */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Ingest Data</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {ingestSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="rounded-md border bg-background px-3 py-1.5 text-sm w-24"
              placeholder="SPY"
            />
          </div>
          <button
            onClick={() => ingest.mutate({ source, ticker })}
            disabled={ingest.isPending}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {ingest.isPending ? "Ingesting..." : "Ingest"}
          </button>
        </div>
      </section>

      {/* Pipeline Status */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pipeline Status</h2>
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
        </div>

        {!selectedExpId ? (
          <p className="text-muted-foreground text-sm">
            Select an experiment above to view pipeline status.
          </p>
        ) : (
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
        )}
      </section>

      {/* Hypotheses */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Hypotheses</h2>
        {hypoLoading && (
          <p className="text-muted-foreground">Loading hypotheses...</p>
        )}
        {hypoError && (
          <p className="text-red-500">Failed to load hypotheses.</p>
        )}
        {hypotheses && hypotheses.length === 0 && (
          <p className="text-muted-foreground">
            No hypotheses yet. Create one to start the research pipeline.
          </p>
        )}
        {hypotheses && hypotheses.length > 0 && (
          <div className="space-y-3">
            {hypotheses.map((h) => (
              <div key={h.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{h.claim}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${hypothesisStatusColors[h.status] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {h.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{h.mechanism}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">{link.title}</p>
              <p className="text-sm text-muted-foreground">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
