"use client";

import { useState } from "react";
import { useAuditDecisions, useAuditIncidents } from "@/hooks/use-audit";

type Tab = "decisions" | "incidents";

function DecisionsTable() {
  const { data, isLoading } = useAuditDecisions();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading decisions...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No decisions recorded yet.</p>;
  }

  const sorted = [...data].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Timestamp</th>
            <th className="px-4 py-2 text-left font-medium">Request</th>
            <th className="px-4 py-2 text-left font-medium">Lead</th>
            <th className="px-4 py-2 text-left font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="px-4 py-2 whitespace-nowrap">
                {new Date(d.ts).toLocaleString()}
              </td>
              <td className="px-4 py-2">{d.request}</td>
              <td className="px-4 py-2">{d.lead}</td>
              <td className="px-4 py-2">{d.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentsTable() {
  const { data, isLoading } = useAuditIncidents();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading incidents...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No incidents recorded yet.</p>;
  }

  const sorted = [...data].sort(
    (a, b) =>
      new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime(),
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Timestamp</th>
            <th className="px-4 py-2 text-left font-medium">Agent</th>
            <th className="px-4 py-2 text-left font-medium">Error</th>
            <th className="px-4 py-2 text-left font-medium">Context</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((inc, i) => (
            <tr key={i} className="border-b last:border-b-0 bg-red-500/10">
              <td className="px-4 py-2 whitespace-nowrap">
                {inc.ts ? new Date(inc.ts).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2">{inc.agent ?? "—"}</td>
              <td className="px-4 py-2">{inc.error ?? "—"}</td>
              <td className="px-4 py-2">{inc.context ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditPage() {
  const [tab, setTab] = useState<Tab>("decisions");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only audit log. Entries cannot be modified or deleted.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("decisions")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "decisions"
              ? "bg-primary text-primary-foreground"
              : "border bg-background hover:bg-muted"
          }`}
        >
          Decisions
        </button>
        <button
          onClick={() => setTab("incidents")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "incidents"
              ? "bg-primary text-primary-foreground"
              : "border bg-background hover:bg-muted"
          }`}
        >
          Incidents
        </button>
      </div>

      {tab === "decisions" ? <DecisionsTable /> : <IncidentsTable />}
    </div>
  );
}
