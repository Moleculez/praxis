"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHypothesis, useUpdateHypothesis, useDeleteHypothesis } from "@/hooks/use-hypotheses";
import { useExperiments } from "@/hooks/use-experiments";
import { Markdown } from "@/components/markdown";
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
  const { data: experiments } = useExperiments();
  const updateMutation = useUpdateHypothesis();
  const deleteMutation = useDeleteHypothesis();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [editClaim, setEditClaim] = useState("");
  const [editMechanism, setEditMechanism] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkedExperiments = useMemo(
    () => (experiments ?? []).filter((e) => e.manifest?.hypothesis_id === id),
    [experiments, id],
  );

  function startEditing() {
    if (!hypothesis) return;
    setEditClaim(hypothesis.claim);
    setEditMechanism(hypothesis.mechanism);
    setEditing(true);
    setShowDeleteConfirm(false);
  }

  function handleSave() {
    updateMutation.mutate(
      { id, data: { claim: editClaim, mechanism: editMechanism } },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(id, { onSuccess: () => router.push("/hypotheses") });
  }

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
        <Link href="/hypotheses" className="text-sm text-muted-foreground hover:underline">← Back to hypotheses</Link>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Hypothesis not found or failed to load.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/hypotheses" className="text-sm text-muted-foreground hover:underline">← Back to hypotheses</Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {editing ? (
            <input
              value={editClaim}
              onChange={(e) => setEditClaim(e.target.value)}
              className="w-full text-2xl font-bold tracking-tight rounded-md border bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{hypothesis.claim}</h1>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[hypothesis.status]}`}>
              {hypothesis.status}
            </span>
            <span className="text-sm text-muted-foreground">Created {formatDate(hypothesis.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md border text-sm text-muted-foreground hover:bg-muted">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={startEditing} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">Edit</button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">Delete?</span>
                  <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Yes</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 rounded text-xs border hover:bg-muted">No</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">Delete</button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Causal Mechanism</h2>
          {editing ? (
            <textarea
              value={editMechanism}
              onChange={(e) => setEditMechanism(e.target.value)}
              rows={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          ) : (
            <Markdown content={hypothesis.mechanism} />
          )}
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs">{hypothesis.id}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd>{hypothesis.status}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd>{formatDate(hypothesis.created_at)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Research Pipeline</h2>
        <p className="text-sm text-muted-foreground">To test this hypothesis, create an experiment and run it through the validation pipeline (CPCV → DSR → PBO).</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={`/experiments?hypothesis_id=${id}&claim=${encodeURIComponent(hypothesis.claim)}`} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">Create Experiment</Link>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">DSR ≥ 0.95</span>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">PBO ≤ 0.5</span>
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">Multi-LLM approval</span>
        </div>
      </div>

      {linkedExperiments.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Linked Experiments</h2>
          <ul className="space-y-2">
            {linkedExperiments.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <Link href={`/experiments/${e.id}`} className="hover:underline font-medium">{e.name}</Link>
                <span className="text-xs text-muted-foreground">{e.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
