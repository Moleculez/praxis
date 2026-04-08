"use client";

import { useState } from "react";
import {
  useIntelBriefs,
  useCrawlerSources,
  useEvaluateThesis,
  useGenerateTradeIdea,
} from "@/hooks/use-intelligence";
import { Markdown } from "@/components/markdown";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import type { CouncilSynthesis } from "@/types";

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

function StatusBadge({ status }: { status: "implemented" | "stub" }) {
  if (status === "implemented") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 text-xs font-medium">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 dark:bg-yellow-400" />
      Planned
    </span>
  );
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

function probabilityColor(p: number): string {
  if (p > 0.6) return "text-green-600 dark:text-green-400";
  if (p >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function consensusBadge(consensus: string): { label: string; className: string } {
  switch (consensus) {
    case "strong":
      return {
        label: "Strong",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      };
    case "divided":
      return {
        label: "Divided",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      };
    default:
      return {
        label: "Moderate",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      };
  }
}

function ThesisEvaluator() {
  const [ticker, setTicker] = useState("");
  const [thesis, setThesis] = useState("");
  const evaluate = useEvaluateThesis();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!thesis.trim()) return;
    evaluate.mutate({
      thesis: thesis.trim(),
      ticker: ticker.trim() || undefined,
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Evaluate Thesis</h2>
      <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Ticker (optional)
          </label>
          <TickerAutocomplete
            value={ticker}
            onChange={setTicker}
            className="py-2 w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Thesis
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={4}
            placeholder="Describe your investment thesis..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={evaluate.isPending || !thesis.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {evaluate.isPending ? "Evaluating..." : "Evaluate with Council"}
        </button>
      </form>

      {evaluate.isPending && (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 align-middle" />
          Council evaluating... this may take 30-60 seconds
        </div>
      )}

      {evaluate.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to evaluate thesis. Check that the API server is running.</p>
        </div>
      )}

      {evaluate.isSuccess && evaluate.data && (
        <CouncilResults
          synthesis={evaluate.data}
          thesis={thesis}
          ticker={ticker}
        />
      )}
    </section>
  );
}

function CouncilResults({
  synthesis,
  thesis,
  ticker,
}: {
  synthesis: CouncilSynthesis;
  thesis: string;
  ticker: string;
}) {
  const badge = consensusBadge(synthesis.consensus);
  const tradeIdea = useGenerateTradeIdea();

  return (
    <div className="rounded-lg border p-4 space-y-6">
      {/* Header: probability + consensus */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className={`text-4xl font-bold tabular-nums ${probabilityColor(synthesis.probability)}`}>
            {Math.round(synthesis.probability * 100)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Range: {Math.round(synthesis.probability_range[0] * 100)}%-{Math.round(synthesis.probability_range[1] * 100)}%
          </p>
        </div>
        <div className="space-y-2">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label} consensus
          </span>
          <p className="text-sm text-muted-foreground">
            {synthesis.n_personas} personas evaluated (spread: {(synthesis.spread * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Summary */}
      <div>
        <h3 className="text-sm font-medium mb-1">Summary</h3>
        <p className="text-sm text-muted-foreground">{synthesis.summary}</p>
      </div>

      {/* Per-persona assessments */}
      <div>
        <h3 className="text-sm font-medium mb-3">Persona Assessments</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {synthesis.assessments.map((a) => (
            <div key={a.persona_id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{a.persona_id}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {a.confidence}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${a.probability > 0.6 ? "bg-green-500" : a.probability >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.round(a.probability * 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(a.probability * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {a.assessment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disagreements */}
      {synthesis.disagreements.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Disagreements</h3>
          <ul className="space-y-1">
            {synthesis.disagreements.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generate Trade Idea */}
      {ticker && (
        <button
          onClick={() =>
            tradeIdea.mutate({
              thesis,
              ticker,
              council_synthesis: synthesis,
            })
          }
          disabled={tradeIdea.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {tradeIdea.isPending ? "Generating..." : "Generate Trade Idea"}
        </button>
      )}
    </div>
  );
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

      <ThesisEvaluator />

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
                  className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{s.name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                    {s.status === "stub" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Coming soon — not yet available
                      </p>
                    )}
                    {s.last_updated && (
                      <p className="text-xs text-muted-foreground/70">
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
