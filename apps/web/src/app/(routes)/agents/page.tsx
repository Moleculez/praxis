"use client";

import { useState } from "react";

type AgentStatus = "ready" | "partial";

type Agent = {
  name: string;
  description: string;
  model: "opus" | "sonnet";
  status: AgentStatus;
};

type Team = {
  name: string;
  lead: string | null;
  agents: Agent[];
};

const teams: Team[] = [
  {
    name: "Research",
    lead: "research-lead",
    agents: [
      { name: "research-data-ingest", description: "Market data ingestion", model: "sonnet", status: "ready" },
      { name: "research-features", description: "Feature engineering (Polars)", model: "sonnet", status: "ready" },
      { name: "research-causal", description: "Causal story validation", model: "opus", status: "ready" },
      { name: "research-labeling", description: "Triple-barrier labels", model: "sonnet", status: "ready" },
      { name: "research-model", description: "Model training (LightGBM, transformers)", model: "opus", status: "ready" },
      { name: "research-backtest", description: "CPCV validation + DSR gate", model: "opus", status: "ready" },
      { name: "research-risk-portfolio", description: "HRP/NCO allocation", model: "sonnet", status: "ready" },
      { name: "research-execution", description: "Paper trading only", model: "sonnet", status: "ready" },
      { name: "factor-library", description: "OSAP/OSBAP academic factors", model: "sonnet", status: "ready" },
    ],
  },
  {
    name: "Backend",
    lead: "backend-lead",
    agents: [
      { name: "backend-api", description: "FastAPI endpoints + Pydantic", model: "sonnet", status: "ready" },
      { name: "backend-data", description: "TimescaleDB/Postgres/MinIO", model: "sonnet", status: "ready" },
      { name: "backend-mlops", description: "MLflow + model serving", model: "sonnet", status: "ready" },
      { name: "backend-test", description: "pytest + integration tests", model: "sonnet", status: "ready" },
    ],
  },
  {
    name: "Frontend",
    lead: "frontend-lead",
    agents: [
      { name: "frontend-state", description: "Types, API client, TanStack Query", model: "sonnet", status: "ready" },
      { name: "frontend-ui", description: "Pages + shadcn components", model: "sonnet", status: "ready" },
      { name: "frontend-charts", description: "Recharts + lightweight-charts", model: "sonnet", status: "ready" },
      { name: "frontend-test", description: "Vitest + Playwright", model: "sonnet", status: "ready" },
    ],
  },
  {
    name: "Intelligence",
    lead: "intel-lead",
    agents: [
      { name: "intel-crawler", description: "Data crawlers (FRED, EDGAR, news, etc.)", model: "sonnet", status: "partial" },
      { name: "intel-validator", description: "Claim extraction + corroboration", model: "opus", status: "partial" },
      { name: "phd-council", description: "Multi-LLM PhD council (6 personas)", model: "opus", status: "partial" },
      { name: "pm-discretionary", description: "Discretionary PM with kill criteria", model: "opus", status: "partial" },
    ],
  },
  {
    name: "Cross-cutting",
    lead: null,
    agents: [
      { name: "code-reviewer", description: "PR review for all teams", model: "opus", status: "ready" },
      { name: "llm-verifier", description: "Multi-LLM verification panel", model: "opus", status: "ready" },
    ],
  },
  {
    name: "Workflow",
    lead: null,
    agents: [
      { name: "master-orchestrator", description: "Top-level request router", model: "opus", status: "ready" },
      { name: "commit", description: "Clean git commits (no co-author)", model: "sonnet", status: "ready" },
      { name: "commit-push-pr", description: "Commit + push + PR creation", model: "sonnet", status: "ready" },
      { name: "version-sync", description: "Version bump across all manifests", model: "sonnet", status: "ready" },
    ],
  },
];

const TOTAL_AGENTS = teams.reduce((sum, t) => sum + t.agents.length, 0);
const TOTAL_TEAMS = teams.length;
const READY_COUNT = teams.reduce(
  (sum, t) => sum + t.agents.filter((a) => a.status === "ready").length,
  0,
);
const PARTIAL_COUNT = teams.reduce(
  (sum, t) => sum + t.agents.filter((a) => a.status === "partial").length,
  0,
);

function ModelBadge({ model }: { model: "opus" | "sonnet" }) {
  const styles =
    model === "opus"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {model}
    </span>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
      Partial
    </span>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-medium">{agent.name}</p>
          <StatusBadge status={agent.status} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
      </div>
      <div className="ml-3 shrink-0">
        <ModelBadge model={agent.model} />
      </div>
    </div>
  );
}

function TeamSection({ team }: { team: Team }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{team.name}</span>
          {team.lead && (
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {team.lead}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-muted-foreground">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

const stats = [
  { label: "Defined", value: TOTAL_AGENTS },
  { label: "Teams", value: TOTAL_TEAMS },
  { label: "Ready", value: READY_COUNT },
  { label: "Partial", value: PARTIAL_COUNT },
];

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground">
          {TOTAL_AGENTS}-agent topology grouped by team.
        </p>
      </div>

      {/* Section 1: Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Section 2: Agent Teams */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Agent Teams</h2>
        <div className="space-y-3">
          {teams.map((team) => (
            <TeamSection key={team.name} team={team} />
          ))}
        </div>
      </div>

      {/* Section 3: Pipeline Flow */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Pipeline Flow</h2>
        <p className="text-sm text-muted-foreground">
          Delegation chain for every request:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
          master-orchestrator &rarr; team lead &rarr; specialists &rarr; code-reviewer &rarr; llm-verifier
        </div>
      </div>
    </div>
  );
}
