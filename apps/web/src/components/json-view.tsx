"use client";

import { useState } from "react";

interface JsonViewProps {
  data: unknown;
  collapsed?: boolean;
  label?: string;
}

export function JsonView({ data, collapsed = false, label }: JsonViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const json = JSON.stringify(data, null, 2);
  const lineCount = json.split("\n").length;

  if (!data || (typeof data === "object" && Object.keys(data as object).length === 0)) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-center">
        <p className="text-sm text-muted-foreground">No data</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {(label || lineCount > 5) && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted transition-colors"
        >
          <span>{label ?? "JSON"}</span>
          <span>{isCollapsed ? `▸ ${lineCount} lines` : "▾ collapse"}</span>
        </button>
      )}
      {!isCollapsed && (
        <pre className="p-3 overflow-x-auto text-sm font-mono bg-muted/30">
          <code>{json}</code>
        </pre>
      )}
    </div>
  );
}
