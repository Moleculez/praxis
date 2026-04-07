"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useExperiments, useCreateExperiment } from "@/hooks/use-experiments";
import { formatDate } from "@/lib/utils";
import type { Experiment } from "@/types";

const statusColors: Record<Experiment["status"], string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  promoted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function ExperimentsPage() {
  const { data: experiments, isLoading, error } = useExperiments();
  const createMutation = useCreateExperiment();
  const searchParams = useSearchParams();
  const prefillHypothesis = searchParams.get("hypothesis_id") ?? "";

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [universe, setUniverse] = useState("SP500");
  const [hypothesisId, setHypothesisId] = useState("");

  useEffect(() => {
    if (prefillHypothesis) {
      setHypothesisId(prefillHypothesis);
      setShowForm(true);
    }
  }, [prefillHypothesis]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const manifest: Record<string, unknown> = {};
    if (strategy.trim()) manifest.strategy = strategy.trim();
    if (universe.trim()) manifest.universe = universe.trim();
    if (hypothesisId.trim()) manifest.hypothesis_id = hypothesisId.trim();

    createMutation.mutate(
      { name: trimmed, manifest },
      {
        onSuccess: () => {
          setName("");
          setStrategy("");
          setUniverse("SP500");
          setHypothesisId("");
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track backtest experiments through the validation pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "New Experiment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name *
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. momentum-12m-sp500"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="strategy" className="block text-sm font-medium mb-1">
                Strategy
              </label>
              <input
                id="strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. momentum, mean-reversion, stat-arb"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="universe" className="block text-sm font-medium mb-1">
                Universe
              </label>
              <select
                id="universe"
                value={universe}
                onChange={(e) => setUniverse(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="SP500">S&P 500</option>
                <option value="NASDAQ100">NASDAQ 100</option>
                <option value="RUSSELL2000">Russell 2000</option>
                <option value="CRYPTO">Crypto</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <label htmlFor="hypothesis" className="block text-sm font-medium mb-1">
                Hypothesis ID
              </label>
              <input
                id="hypothesis"
                value={hypothesisId}
                onChange={(e) => setHypothesisId(e.target.value)}
                placeholder="Link to hypothesis (optional)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Experiment"}
            </button>
            {createMutation.isError && (
              <p className="text-sm text-red-500 self-center">Failed to create.</p>
            )}
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load experiments.</p>
        </div>
      )}

      {experiments && experiments.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-muted-foreground/50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.47 4.41a2.25 2.25 0 0 1-2.133 1.59H8.603a2.25 2.25 0 0 1-2.134-1.59L5 14.5m14 0H5"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-muted-foreground">No experiments yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create your first experiment to start the validation pipeline.
          </p>
        </div>
      )}

      {experiments && experiments.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Strategy</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Universe</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    <Link href={`/experiments/${exp.id}`} className="hover:underline">
                      {exp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[exp.status]}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {(exp.manifest?.strategy as string) || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {(exp.manifest?.universe as string) || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(exp.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
