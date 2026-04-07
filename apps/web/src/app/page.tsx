"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Lightbulb,
  Activity,
  BarChart3,
  Plus,
  Eye,
  Radio,
  Brain,
  ClipboardList,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useExperiments } from "@/hooks/use-experiments";
import { useHypotheses } from "@/hooks/use-hypotheses";
import { apiFetch } from "@/lib/api";
import { cn, experimentStatusColors, formatDate } from "@/lib/utils";

interface HealthStatus {
  status: string;
  database: string;
  llm_keys?: boolean;
  alpaca_keys?: boolean;
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
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  icon: LucideIcon;
  iconColor: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-1 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      )}
    </div>
  );
}

function ActionCard({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-lg border px-4 py-6 text-sm font-medium transition-all hover:bg-muted/50 hover:scale-[1.02] hover:border-foreground/20"
    >
      <Icon size={16} className="text-muted-foreground" />
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

function QuickStartStep({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
        {step}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function ReadinessCheck({
  label,
  loading,
  ok,
  failColor = "text-yellow-500",
}: {
  label: string;
  loading: boolean;
  ok: boolean;
  failColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <Skeleton className="h-4 w-4 rounded-full" />
      ) : ok ? (
        <CheckCircle size={16} className="text-green-500" />
      ) : (
        <XCircle size={16} className={failColor} />
      )}
      <span>{label}</span>
    </div>
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
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <h1 className="text-3xl font-bold">Praxis Dashboard</h1>

      {/* Quick Start wizard — shown only when no experiments exist */}
      {!experiments.isLoading && (experiments.data ?? []).length === 0 && (
        <section className="rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickStartStep step={1} title="Set API Keys">
              Add OPENROUTER_API_KEY or ALPACA keys in .env
            </QuickStartStep>
            <QuickStartStep step={2} title="Create Hypothesis">
              <Link href="/hypotheses">Define a causal trading thesis</Link>
            </QuickStartStep>
            <QuickStartStep step={3} title="Run Pipeline">
              <Link href="/research">Ingest data &rarr; features &rarr; backtest</Link>
            </QuickStartStep>
          </div>
        </section>
      )}

      {/* System Readiness */}
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-3">System Readiness</h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <ReadinessCheck
            label="API Backend"
            loading={health.isLoading}
            ok={health.data?.status === "ok"}
            failColor="text-red-500"
          />
          <ReadinessCheck
            label="LLM Keys"
            loading={health.isLoading}
            ok={!!health.data?.llm_keys}
          />
          <ReadinessCheck
            label="Alpaca Paper Trading"
            loading={health.isLoading}
            ok={!!health.data?.alpaca_keys}
          />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Experiments"
            value={experiments.data?.length ?? 0}
            loading={experiments.isLoading}
            icon={FlaskConical}
            iconColor="text-blue-500"
          />
          <StatCard
            label="Total Hypotheses"
            value={hypotheses.data?.length ?? 0}
            loading={hypotheses.isLoading}
            icon={Lightbulb}
            iconColor="text-amber-500"
          />
          <StatCard
            label="Pipeline Status"
            value={pipelineRunning ? "Running" : "Idle"}
            loading={experiments.isLoading}
            icon={Activity}
            iconColor="text-green-500"
          />
          <StatCard
            label="Paper Trading"
            value="Off"
            loading={false}
            icon={BarChart3}
            iconColor="text-purple-500"
          />
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
                className="flex items-center justify-between border-l-2 border-l-transparent px-4 py-2 transition-colors hover:bg-muted/30 hover:border-l-foreground/20"
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
                className="flex items-center justify-between border-l-2 border-l-transparent px-4 py-2 transition-colors hover:bg-muted/30 hover:border-l-foreground/20"
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
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <ActionCard label="New Experiment" href="/experiments?new=true" icon={Plus} />
          <ActionCard label="New Hypothesis" href="/hypotheses" icon={Lightbulb} />
          <ActionCard label="View Portfolio" href="/portfolios" icon={Eye} />
          <ActionCard label="Paper Trading" href="/live" icon={Radio} />
          <ActionCard label="Intelligence" href="/intelligence" icon={Brain} />
          <ActionCard label="Audit Log" href="/audit" icon={ClipboardList} />
        </div>
      </section>

      {/* Health footer bar */}
      <footer className="flex items-center gap-6 rounded-lg border px-4 py-2 text-xs text-muted-foreground">
        {health.isLoading ? (
          <Skeleton className="h-4 w-48" />
        ) : health.isError ? (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            API unreachable
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <HealthDot ok={health.data?.status === "ok"} />
              API: {health.data?.status ?? "unknown"}
            </div>
            <div className="flex items-center gap-2">
              <HealthDot ok={health.data?.database === "ok"} />
              DB: {health.data?.database ?? "unknown"}
            </div>
          </>
        )}
      </footer>
    </main>
  );
}
