"use client";

import { useMemo, useState } from "react";
import {
  useTradeIdeas,
  useUpdateTradeIdea,
} from "@/hooks/use-intelligence";
import { cn } from "@/lib/utils";
import type { TradeIdea, TradeIdeaStatus } from "@/types";

const STATUS_COLUMNS: { key: TradeIdeaStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_COLORS: Record<TradeIdeaStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  reviewing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function DirectionBadge({ direction }: { direction: string }) {
  const isLong = direction === "long";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isLong
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      )}
    >
      {isLong ? "Long" : "Short"}
    </span>
  );
}

function ConvictionIndicator({ conviction }: { conviction: string }) {
  const levels: Record<string, { dots: number; color: string }> = {
    low: { dots: 1, color: "bg-yellow-500" },
    medium: { dots: 2, color: "bg-blue-500" },
    high: { dots: 3, color: "bg-green-500" },
  };
  const level = levels[conviction.toLowerCase()] ?? levels.medium;
  return (
    <div className="flex items-center gap-1" title={`Conviction: ${conviction}`}>
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            i < level.dots ? level.color : "bg-muted",
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground capitalize">
        {conviction}
      </span>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
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

function IdeaCard({
  idea,
  onSelect,
}: {
  idea: TradeIdea;
  onSelect: (idea: TradeIdea) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(idea)}
      className="w-full text-left rounded-lg border bg-card p-3 space-y-2 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-bold">
          {idea.ticker}
        </span>
        <DirectionBadge direction={idea.direction} />
      </div>
      <p className="text-sm text-foreground line-clamp-2">{idea.thesis}</p>
      <div className="flex items-center justify-between">
        <ConvictionIndicator conviction={idea.conviction} />
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(idea.created_at)}
        </span>
      </div>
      {(idea.entry_zone || idea.stop_loss || idea.target) && (
        <div className="flex gap-3 text-xs text-muted-foreground border-t pt-2">
          {idea.entry_zone && (
            <span>
              Entry: <span className="font-mono">{idea.entry_zone}</span>
            </span>
          )}
          {idea.stop_loss && (
            <span>
              Stop: <span className="font-mono text-red-500">{idea.stop_loss}</span>
            </span>
          )}
          {idea.target && (
            <span>
              Target: <span className="font-mono text-green-500">{idea.target}</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function IdeaDetail({
  idea,
  onClose,
}: {
  idea: TradeIdea;
  onClose: () => void;
}) {
  const updateIdea = useUpdateTradeIdea();
  const [notes, setNotes] = useState(idea.notes);

  function handleStatusChange(newStatus: TradeIdeaStatus) {
    updateIdea.mutate(
      { id: idea.id, status: newStatus },
      { onSuccess: () => onClose() },
    );
  }

  function handleSaveNotes() {
    updateIdea.mutate({ id: idea.id, notes });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-muted px-2.5 py-1 text-sm font-mono font-bold">
              {idea.ticker}
            </span>
            <DirectionBadge direction={idea.direction} />
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_COLORS[idea.status],
              )}
            >
              {idea.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg px-2"
          >
            X
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">Thesis</h3>
          <p className="text-sm text-muted-foreground">{idea.thesis}</p>
        </div>

        {(idea.entry_zone || idea.stop_loss || idea.target) && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {idea.entry_zone && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Entry Zone</p>
                <p className="text-sm font-mono font-medium">{idea.entry_zone}</p>
              </div>
            )}
            {idea.stop_loss && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-3">
                <p className="text-xs text-red-600 dark:text-red-400">Stop Loss</p>
                <p className="text-sm font-mono font-medium text-red-600 dark:text-red-400">
                  {idea.stop_loss}
                </p>
              </div>
            )}
            {idea.target && (
              <div className="rounded-lg border border-green-200 dark:border-green-900/50 p-3">
                <p className="text-xs text-green-600 dark:text-green-400">Target</p>
                <p className="text-sm font-mono font-medium text-green-600 dark:text-green-400">
                  {idea.target}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <ConvictionIndicator conviction={idea.conviction} />
        </div>

        {idea.pre_mortem && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Pre-Mortem</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {idea.pre_mortem}
            </p>
          </div>
        )}

        {idea.kill_criteria && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Kill Criteria</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {idea.kill_criteria}
            </p>
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add review notes..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
          {notes !== idea.notes && (
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={updateIdea.isPending}
              className="mt-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
            >
              Save Notes
            </button>
          )}
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground mb-4">
          <span>Created: {formatRelativeTime(idea.created_at)}</span>
          {idea.reviewed_at && (
            <span>Reviewed: {formatRelativeTime(idea.reviewed_at)}</span>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          {idea.status === "new" && (
            <button
              type="button"
              onClick={() => handleStatusChange("reviewing")}
              disabled={updateIdea.isPending}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              Start Review
            </button>
          )}
          {(idea.status === "new" || idea.status === "reviewing") && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("approved")}
                disabled={updateIdea.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("rejected")}
                disabled={updateIdea.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IdeasPage() {
  const ideas = useTradeIdeas();
  const [selectedIdea, setSelectedIdea] = useState<TradeIdea | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<TradeIdeaStatus, TradeIdea[]> = {
      new: [],
      reviewing: [],
      approved: [],
      rejected: [],
      expired: [],
    };
    if (ideas.data) {
      for (const idea of ideas.data) {
        buckets[idea.status]?.push(idea);
      }
    }
    return buckets;
  }, [ideas.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Ideas</h1>
        <p className="mt-1 text-muted-foreground">
          Discretionary PM review queue. Ideas are never auto-executed.
        </p>
      </div>

      {ideas.isLoading && (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Loading trade ideas...
        </div>
      )}

      {ideas.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load trade ideas. Is the backend running?
          </p>
        </div>
      )}

      {ideas.isSuccess && ideas.data.length === 0 && (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No trade ideas yet. Generate ideas from the Intelligence page using
          the PhD council thesis evaluator.
        </div>
      )}

      {ideas.isSuccess && ideas.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_COLUMNS.map(({ key, label }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{label}</h2>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_COLORS[key],
                  )}
                >
                  {grouped[key].length}
                </span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {grouped[key].map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onSelect={setSelectedIdea}
                  />
                ))}
                {grouped[key].length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No {label.toLowerCase()} ideas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </div>
  );
}
