"use client";

import { useState } from "react";

type Agent = {
  name: string;
  description: string;
  model: "opus" | "sonnet";
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
      { name: "research-data-ingest", description: "Market data ingestion", model: "sonnet" },
      { name: "research-features", description: "Feature engineering (Polars)", model: "sonnet" },
      { name: "research-causal", description: "Causal story validation", model: "opus" },
      { name: "research-labeling", description: "Triple-barrier labels", model: "sonnet" },
      { name: "research-model", description: "Model training (LightGBM, transformers)", model: "opus" },
      { name: "research-backtest", description: "CPCV validation + DSR gate", model: "opus" },
      { name: "research-risk-portfolio", description: "HRP/NCO allocation", model: "sonnet" },
      { name: "research-execution", description: "Paper trading only", model: "sonnet" },
      { name: "factor-library", description: "OSAP/OSBAP academic factors", model: "sonnet" },
    ],
  },
  {
    name: "Backend",
    lead: "backend-lead",
    agents: [
      { name: "backend-api", description: "FastAPI endpoints + Pydantic", model: "sonnet" },
      { name: "backend-data", description: "TimescaleDB/Postgres/MinIO", model: "sonnet" },
      { name: "backend-mlops", description: "MLflow + model serving", model: "sonnet" },
      { name: "backend-test", description: "pytest + integration tests", model: "sonnet" },
    ],
  },
  {
    name: "Frontend",
    lead: "frontend-lead",
    agents: [
      { name: "frontend-state", description: "Types, API client, TanStack Query", model: "sonnet" },
      { name: "frontend-ui", description: "Pages + shadcn components", model: "sonnet" },
      { name: "frontend-charts", description: "Recharts + lightweight-charts", model: "sonnet" },
      { name: "frontend-test", description: "Vitest + Playwright", model: "sonnet" },
    ],
  },
  {
    name: "Intelligence",
    lead: "intel-lead",
    agents: [
      { name: "intel-crawler", description: "Data crawlers (FRED, EDGAR, news, etc.)", model: "sonnet" },
      { name: "intel-validator", description: "Claim extraction + corroboration", model: "opus" },
      { name: "phd-council", description: "Multi-LLM PhD council (6 personas)", model: "opus" },
      { name: "pm-discretionary", description: "Discretionary PM with kill criteria", model: "opus" },
    ],
  },
  {
    name: "Cross-cutting",
    lead: null,
    agents: [
      { name: "code-reviewer", description: "PR review for all teams", model: "opus" },
      { name: "llm-verifier", description: "Multi-LLM verification panel", model: "opus" },
    ],
  },
  {
    name: "Workflow",
    lead: null,
    agents: [
      { name: "master-orchestrator", description: "Top-level request router", model: "opus" },
      { name: "commit", description: "Clean git commits (no co-author)", model: "sonnet" },
      { name: "commit-push-pr", description: "Commit + push + PR creation", model: "sonnet" },
      { name: "version-sync", description: "Version bump across all manifests", model: "sonnet" },
    ],
  },
];

const TOTAL_AGENTS = teams.reduce((sum, t) => sum + t.agents.length, 0);
const TOTAL_TEAMS = teams.length;
const TOTAL_LEADS = teams.filter((t) => t.lead !== null).length;

function ModelBadge({ model }: { model: "opus" | "sonnet" }) {
  const styles =
    model === "opus"
      ? "bg-purple-100 text-purple-800"
      : "bg-blue-100 text-blue-800";

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {model}
    </span>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium">{agent.name}</p>
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
  { label: "Total Agents", value: TOTAL_AGENTS },
  { label: "Teams", value: TOTAL_TEAMS },
  { label: "Leads", value: TOTAL_LEADS },
  { label: "Active", value: 0 },
];

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground">
          33-agent topology grouped by team.
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
