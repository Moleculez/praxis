"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useExperiments } from "@/hooks/use-experiments";
import { useHypotheses } from "@/hooks/use-hypotheses";
import { apiFetch } from "@/lib/api";
import { cn, experimentStatusColors, formatDate } from "@/lib/utils";

interface HealthStatus {
  status: string;
  database: string;
}

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthStatus>("/health"),
    retry: 1,
    refetchInterval: 30_000,
  });
}

const hypothesisStatusColors: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  testing: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  ...experimentStatusColors,
  ...hypothesisStatusColors,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        statusColors[status] ?? "bg-gray-100 text-gray-800",
      )}
    >
      {status}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} aria-hidden />
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      )}
    </div>
  );
}

function ActionCard({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg border px-4 py-6 text-sm font-medium transition-colors hover:bg-muted/50"
    >
      {label}
    </Link>
  );
}

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        ok ? "bg-green-500" : "bg-yellow-500",
      )}
    />
  );
}

export default function HomePage() {
  const experiments = useExperiments();
  const hypotheses = useHypotheses();
  const health = useHealth();

  const recentExperiments = (experiments.data ?? []).slice(-5).reverse();
  const recentHypotheses = (hypotheses.data ?? []).slice(-5).reverse();

  const pipelineRunning = (experiments.data ?? []).some(
    (e) => e.status === "running",
  );

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <section>
        <h1 className="text-3xl font-bold">Praxis Dashboard</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Experiments"
            value={experiments.data?.length ?? 0}
            loading={experiments.isLoading}
          />
          <StatCard
            label="Total Hypotheses"
            value={hypotheses.data?.length ?? 0}
            loading={hypotheses.isLoading}
          />
          <StatCard
            label="Pipeline Status"
            value={pipelineRunning ? "Running" : "Idle"}
            loading={experiments.isLoading}
          />
          <StatCard label="Paper Trading" value="Off" loading={false} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Experiments</h2>
          <Link
            href="/experiments"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all &rarr;
          </Link>
        </div>

        {experiments.isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentExperiments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No experiments yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border">
            {recentExperiments.map((exp) => (
              <li
                key={exp.id}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="line-clamp-1 text-sm">{exp.name}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={exp.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(exp.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Hypotheses</h2>
          <Link
            href="/hypotheses"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all &rarr;
          </Link>
        </div>

        {hypotheses.isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentHypotheses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No hypotheses yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border">
            {recentHypotheses.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="line-clamp-1 text-sm">{h.claim}</span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ActionCard label="New Experiment" href="/experiments?new=true" />
          <ActionCard label="New Hypothesis" href="/hypotheses" />
          <ActionCard label="View Portfolio" href="/portfolios" />
          <ActionCard label="Paper Trading" href="/live" />
          <ActionCard label="Intelligence" href="/intelligence" />
          <ActionCard label="Audit Log" href="/audit" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">System Health</h2>
        <div className="mt-3 rounded-lg border p-4">
          {health.isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : health.isError ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              API unreachable
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HealthDot ok={health.data?.status === "ok"} />
                API: {health.data?.status ?? "unknown"}
              </div>
              <div className="flex items-center gap-2">
                <HealthDot ok={health.data?.database === "ok"} />
                DB: {health.data?.database ?? "unknown"}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
