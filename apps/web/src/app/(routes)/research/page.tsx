"use client";

import Link from "next/link";
import { useHypotheses } from "@/hooks/use-hypotheses";

const pipelineStages = [
  { name: "Data", description: "Ingest OHLCV, FRED, EDGAR" },
  { name: "Features", description: "Dollar bars, fracdiff, microstructure" },
  { name: "Labels", description: "Triple-barrier + meta-labels" },
  { name: "Model", description: "LightGBM, sequence, linear floor" },
  { name: "Backtest", description: "CPCV, DSR, PBO validation" },
  { name: "Portfolio", description: "HRP/NCO allocation" },
];

const hypothesisStatusColors: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  testing: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const quickLinks = [
  { href: "/experiments", title: "Experiments", description: "Track backtest experiments and results" },
  { href: "/portfolios", title: "Portfolios", description: "View allocations and risk metrics" },
  { href: "/intelligence", title: "Intelligence", description: "Cogito briefs and council analysis" },
];

export default function ResearchPage() {
  const { data: hypotheses, isLoading, error } = useHypotheses();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Research Pipeline</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">Pipeline Status</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipelineStages.map((stage, i) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div className="rounded-lg border p-3 min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="font-medium text-sm">{stage.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>
              {i < pipelineStages.length - 1 && (
                <span className="text-muted-foreground text-lg">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Hypotheses</h2>
        {isLoading && <p className="text-muted-foreground">Loading hypotheses...</p>}
        {error && <p className="text-red-500">Failed to load hypotheses.</p>}
        {hypotheses && hypotheses.length === 0 && (
          <p className="text-muted-foreground">No hypotheses yet. Create one to start the research pipeline.</p>
        )}
        {hypotheses && hypotheses.length > 0 && (
          <div className="space-y-3">
            {hypotheses.map((h) => (
              <div key={h.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{h.claim}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hypothesisStatusColors[h.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {h.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{h.mechanism}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border p-4 hover:bg-accent transition-colors">
              <p className="font-medium">{link.title}</p>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
