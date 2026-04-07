"use client";

import { use } from "react";
import Link from "next/link";
import { useHypothesis } from "@/hooks/use-hypotheses";
import { formatDate } from "@/lib/utils";
import type { Hypothesis } from "@/types";

const statusColors: Record<Hypothesis["status"], string> = {
  proposed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  testing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: hypothesis, isLoading, error } = useHypothesis(id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (error || !hypothesis) {
    return (
      <div className="space-y-4">
        <Link href="/hypotheses" className="text-sm text-muted-foreground hover:underline">
          ← Back to hypotheses
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Hypothesis not found or failed to load.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/hypotheses" className="text-sm text-muted-foreground hover:underline">
        ← Back to hypotheses
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{hypothesis.claim}</h1>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[hypothesis.status]}`}
        >
          {hypothesis.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Causal Mechanism</h2>
          <p className="text-sm leading-relaxed">{hypothesis.mechanism}</p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{hypothesis.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>{hypothesis.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(hypothesis.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Research Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          To test this hypothesis, create an{" "}
          <Link href="/experiments" className="underline hover:text-foreground">
            experiment
          </Link>{" "}
          and run it through the validation pipeline (CPCV → DSR → PBO).
        </p>
        <div className="mt-3 flex gap-2">
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            DSR ≥ 0.95 required
          </span>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            PBO ≤ 0.5 required
          </span>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            Multi-LLM approval required
          </span>
        </div>
      </div>
    </div>
  );
}
