"use client";

import { useIntelBriefs, useCrawlerSources } from "@/hooks/use-intelligence";
import { Markdown } from "@/components/markdown";

const PERSONAS = [
  {
    name: "Macro Economist",
    role: "Macro reasoning, yield-curve analysis, regime detection",
    provider: "Claude Opus",
    providerColor: "bg-orange-500",
    brierWeight: 0.82,
  },
  {
    name: "Microstructure Quant",
    role: "Order flow, LOB dynamics, intraday signals",
    provider: "Claude Sonnet",
    providerColor: "bg-orange-400",
    brierWeight: 0.78,
  },
  {
    name: "Fundamental Analyst",
    role: "Earnings quality, balance-sheet forensics, DCF sanity checks",
    provider: "GPT",
    providerColor: "bg-green-500",
    brierWeight: 0.75,
  },
  {
    name: "Behavioral Specialist",
    role: "Sentiment analysis, positioning data, X/social signals",
    provider: "Grok",
    providerColor: "bg-blue-500",
    brierWeight: 0.71,
  },
  {
    name: "Sector Specialist",
    role: "Industry deep-dives, filing analysis, supply-chain mapping",
    provider: "Gemini",
    providerColor: "bg-sky-500",
    brierWeight: 0.74,
  },
  {
    name: "Red Team",
    role: "Adversarial critique, forced disagreement, pre-mortem analysis",
    provider: "Dynamic",
    providerColor: "bg-red-500",
    brierWeight: 0.69,
  },
] as const;

const OVERVIEW_TEXT = `Cogito is Praxis's intelligence subsystem. It coordinates a multi-provider PhD council where each persona runs on a **different LLM provider** to ensure genuinely independent reasoning. The council evaluates claims extracted from crawled data sources, produces **Brier-scored briefs**, and surfaces trade ideas to a discretionary PM layer.

Discretionary positions are capped at **20% gross**, **8 positions max**, **2% per position**, and are **never auto-executed**.`;

function BrierBar({ weight }: { weight: number }) {
  const pct = Math.round(weight * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Brier</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">{weight.toFixed(2)}</span>
    </div>
  );
}

function StatusDot({ status }: { status: "implemented" | "stub" }) {
  const color =
    status === "implemented"
      ? "bg-green-500 dark:bg-green-400"
      : "bg-gray-400 dark:bg-gray-600";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function InfoCard({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: "muted" | "error";
}) {
  const styles =
    variant === "error"
      ? "border-destructive/50 text-destructive"
      : "text-muted-foreground";
  return (
    <div
      className={`rounded-lg border bg-card p-6 text-center text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

function formatLastUpdated(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function IntelligencePage() {
  const briefs = useIntelBriefs();
  const sources = useCrawlerSources();

  const implementedCount =
    sources.data?.filter((s) => s.status === "implemented").length ?? 0;
  const totalCount = sources.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intelligence</h1>
        <p className="mt-1 text-muted-foreground">
          Cogito subsystem — PhD council, discretionary PM, and data crawlers.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Cogito Overview</h2>
        <div className="mt-2">
          <Markdown content={OVERVIEW_TEXT} className="text-sm text-muted-foreground leading-relaxed" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Council Personas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{p.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${p.providerColor}`}
                >
                  {p.provider}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{p.role}</p>
              <BrierBar weight={p.brierWeight} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent Briefs</h2>
        <div className="mt-4">
          {briefs.isLoading && <InfoCard>Loading briefs...</InfoCard>}
          {briefs.isError && (
            <InfoCard variant="error">
              Failed to load briefs. Is the backend running?
            </InfoCard>
          )}
          {briefs.isSuccess && briefs.data.length === 0 && (
            <InfoCard>
              No briefs yet. Run the intelligence pipeline to generate council
              analysis.
            </InfoCard>
          )}
          {briefs.isSuccess && briefs.data.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {briefs.data.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border bg-card p-4 space-y-2"
                >
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.claim_count} claims — {b.status}
                  </p>
                  {b.summary && (
                    <Markdown
                      content={b.summary}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Data Sources</h2>
          {sources.isSuccess && (
            <span className="text-sm text-muted-foreground">
              {implementedCount} of {totalCount} crawlers implemented
            </span>
          )}
        </div>
        <div className="mt-4">
          {sources.isLoading && <InfoCard>Loading sources...</InfoCard>}
          {sources.isError && (
            <InfoCard variant="error">
              Failed to load data sources. Is the backend running?
            </InfoCard>
          )}
          {sources.isSuccess && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sources.data.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <StatusDot status={s.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                    {s.last_updated && (
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        Updated {formatLastUpdated(s.last_updated)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
