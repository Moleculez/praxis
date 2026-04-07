"use client";

import { use } from "react";
import Link from "next/link";
import { useExperiment, useDeleteExperiment, useUpdateExperimentStatus } from "@/hooks/use-experiments";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Experiment } from "@/types";

const statusColors: Record<Experiment["status"], string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  promoted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: experiment, isLoading, error } = useExperiment(id);
  const deleteMutation = useDeleteExperiment();
  const statusMutation = useUpdateExperimentStatus();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-40 rounded bg-muted" />
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="space-y-4">
        <Link href="/experiments" className="text-sm text-muted-foreground hover:underline">
          ← Back to experiments
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Experiment not found or failed to load.</p>
        </div>
      </div>
    );
  }

  const manifest = experiment.manifest ?? {};
  const hasManifest = Object.keys(manifest).length > 0;

  function handleDelete() {
    if (!confirm("Delete this experiment?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => router.push("/experiments"),
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/experiments" className="text-sm text-muted-foreground hover:underline">
        ← Back to experiments
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{experiment.name}</h1>
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[experiment.status]}`}>
              {experiment.status}
            </span>
            <span className="text-sm text-muted-foreground">
              Created {formatDate(experiment.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {experiment.status === "draft" && (
              <button
                onClick={() => statusMutation.mutate({ id, status: "running" })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {statusMutation.isPending ? "Updating..." : "Start Running"}
              </button>
            )}
            {experiment.status === "running" && (
              <>
                <button
                  onClick={() => statusMutation.mutate({ id, status: "completed" })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {statusMutation.isPending ? "Updating..." : "Mark Completed"}
                </button>
                <button
                  onClick={() => statusMutation.mutate({ id, status: "failed" })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
                >
                  {statusMutation.isPending ? "Updating..." : "Mark Failed"}
                </button>
              </>
            )}
            {experiment.status === "completed" && (
              <button
                onClick={() => statusMutation.mutate({ id, status: "promoted" })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {statusMutation.isPending ? "Updating..." : "Promote"}
              </button>
            )}
            {experiment.status === "failed" && (
              <button
                onClick={() => statusMutation.mutate({ id, status: "draft" })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 disabled:opacity-50"
              >
                {statusMutation.isPending ? "Updating..." : "Retry"}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Configuration</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Strategy</dt>
              <dd>{(manifest.strategy as string) || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Universe</dt>
              <dd>{(manifest.universe as string) || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Hypothesis</dt>
              <dd>
                {manifest.hypothesis_id ? (
                  <Link href={`/hypotheses/${manifest.hypothesis_id}`} className="hover:underline">
                    {(manifest.hypothesis_id as string).slice(0, 8)}...
                  </Link>
                ) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{experiment.id}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Validation Pipeline</h2>
          <div className="space-y-2">
            {[
              { label: "CPCV", desc: "Combinatorial Purged Cross-Validation", done: false },
              { label: "DSR ≥ 0.95", desc: "Deflated Sharpe Ratio", done: false },
              { label: "PBO ≤ 0.5", desc: "Probability of Backtest Overfitting", done: false },
              { label: "LLM Panel", desc: "Multi-LLM verification (≥2 providers)", done: false },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${step.done ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <div>
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasManifest && (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Full Manifest</h2>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm font-mono">
            <code>{JSON.stringify(manifest, null, 2)}</code>
          </pre>
        </div>
      )}

      {!hasManifest && (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">No manifest configured. Edit this experiment to add strategy parameters.</p>
        </div>
      )}
    </div>
  );
}
