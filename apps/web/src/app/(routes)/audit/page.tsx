"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useAuditDecisions, useAuditIncidents } from "@/hooks/use-audit";
import { Markdown } from "@/components/markdown";

type Tab = "decisions" | "incidents";

const PAGE_SIZE = 25;

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card py-12 text-muted-foreground">
      <FileText size={32} strokeWidth={1.5} className="opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

type Filters = {
  search: string;
  from: string;
  to: string;
};

function matchesDateRange(ts: string | undefined, from: string, to: string): boolean {
  if (!ts) return true;
  const dateStr = ts.slice(0, 10);
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function DecisionsTable({ filters }: { filters: Filters }) {
  const { data, isLoading } = useAuditDecisions();
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filters.search.toLowerCase();
    return [...data]
      .filter((d) => {
        if (q) {
          const haystack = `${d.request ?? ""} ${d.lead ?? ""} ${d.reason ?? ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return matchesDateRange(d.ts, filters.from, filters.to);
      })
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [data, filters.search, filters.from, filters.to]);

  useEffect(() => setPage(0), [filters.search, filters.from, filters.to]);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading decisions...</p>;
  }

  if (!data || data.length === 0) {
    return <EmptyState message="No decisions recorded yet." />;
  }

  if (filtered.length === 0) {
    return <EmptyState message="No decisions match the current filters." />;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <>
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
            {paged.map((d, i) => (
              <tr key={page * PAGE_SIZE + i} className="border-b last:border-b-0">
                <td className="px-4 py-2 whitespace-nowrap align-top">
                  {new Date(d.ts).toLocaleString()}
                </td>
                <td className="px-4 py-2 align-top">{d.request}</td>
                <td className="px-4 py-2 align-top">{d.lead}</td>
                <td className="px-4 py-2">
                  <Markdown content={d.reason} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

function IncidentsTable({ filters }: { filters: Filters }) {
  const { data, isLoading } = useAuditIncidents();
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filters.search.toLowerCase();
    return [...data]
      .filter((inc) => {
        if (q) {
          const haystack = `${inc.agent ?? ""} ${inc.error ?? ""} ${inc.context ?? ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return matchesDateRange(inc.ts, filters.from, filters.to);
      })
      .sort(
        (a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime(),
      );
  }, [data, filters.search, filters.from, filters.to]);

  useEffect(() => setPage(0), [filters.search, filters.from, filters.to]);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading incidents...</p>;
  }

  if (!data || data.length === 0) {
    return <EmptyState message="No incidents recorded yet." />;
  }

  if (filtered.length === 0) {
    return <EmptyState message="No incidents match the current filters." />;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <>
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
            {paged.map((inc, i) => (
              <tr
                key={page * PAGE_SIZE + i}
                className="border-b last:border-b-0 bg-red-500/5 dark:bg-red-500/10"
              >
                <td className="px-4 py-2 whitespace-nowrap align-top">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                    {inc.ts ? new Date(inc.ts).toLocaleString() : "\u2014"}
                  </div>
                </td>
                <td className="px-4 py-2 align-top">{inc.agent ?? "\u2014"}</td>
                <td className="px-4 py-2 align-top">{inc.error ?? "\u2014"}</td>
                <td className="px-4 py-2">
                  {inc.context ? (
                    <Markdown content={inc.context} />
                  ) : (
                    "\u2014"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

export default function AuditPage() {
  const [tab, setTab] = useState<Tab>("decisions");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const filters: Filters = useMemo(
    () => ({ search, from, to }),
    [search, from, to],
  );

  function clearFilters() {
    setSearch("");
    setFrom(defaultFrom());
    setTo(defaultTo());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only audit log. Entries cannot be modified or deleted.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="Filter by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("decisions")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "decisions"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Decisions
        </button>
        <button
          onClick={() => setTab("incidents")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "incidents"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Incidents
        </button>
      </div>

      {tab === "decisions" ? (
        <DecisionsTable filters={filters} />
      ) : (
        <IncidentsTable filters={filters} />
      )}
    </div>
  );
}
