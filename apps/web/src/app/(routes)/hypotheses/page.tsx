"use client";

import { useState } from "react";
import Link from "next/link";
import { useHypotheses, useCreateHypothesis } from "@/hooks/use-hypotheses";
import { formatDate } from "@/lib/utils";
import type { Hypothesis } from "@/types";

const statusColors: Record<Hypothesis["status"], string> = {
  proposed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  testing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function HypothesesPage() {
  const { data: hypotheses, isLoading, error } = useHypotheses();
  const createMutation = useCreateHypothesis();
  const [showForm, setShowForm] = useState(false);
  const [claim, setClaim] = useState("");
  const [mechanism, setMechanism] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim() || !mechanism.trim()) return;
    createMutation.mutate(
      { claim: claim.trim(), mechanism: mechanism.trim() },
      {
        onSuccess: () => {
          setClaim("");
          setMechanism("");
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hypotheses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every factor needs a causal story before promotion.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "New Hypothesis"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
          <div>
            <label htmlFor="claim" className="block text-sm font-medium mb-1">
              Claim
            </label>
            <input
              id="claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="e.g. 12-month momentum predicts 1-month forward returns"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label htmlFor="mechanism" className="block text-sm font-medium mb-1">
              Causal Mechanism
            </label>
            <textarea
              id="mechanism"
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value)}
              placeholder="e.g. Behavioral underreaction to gradual information diffusion causes prices to trend"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Hypothesis"}
          </button>
          {createMutation.isError && (
            <p className="text-sm text-red-500">Failed to create hypothesis.</p>
          )}
        </form>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load hypotheses.</p>
        </div>
      )}

      {hypotheses && hypotheses.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No hypotheses yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create one to start the research pipeline.
          </p>
        </div>
      )}

      {hypotheses && hypotheses.length > 0 && (
        <div className="space-y-3">
          {hypotheses.map((h) => (
            <Link
              key={h.id}
              href={`/hypotheses/${h.id}`}
              className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{h.claim}</p>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {h.mechanism}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDate(h.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[h.status]}`}
                >
                  {h.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
