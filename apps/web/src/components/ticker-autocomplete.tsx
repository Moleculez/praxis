"use client";

import { useEffect, useRef, useState } from "react";
import { useSymbolSearchEnriched } from "@/hooks/use-live";
import { cn } from "@/lib/utils";

interface TickerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function TickerAutocomplete({
  value,
  onChange,
  id,
  placeholder = "AAPL",
  className,
}: TickerAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { data: suggestions } = useSymbolSearchEnriched(debouncedQuery);

  // Debounce search query by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Clean up blur timeout on unmount
  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          const val = e.target.value.toUpperCase();
          onChange(val);
          setQuery(val);
          setOpen(true);
        }}
        onFocus={() => {
          if (value) {
            setQuery(value);
            setOpen(true);
          }
        }}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn("rounded-md border bg-background px-3 text-sm uppercase", className)}
      />
      {open && suggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-80 rounded-md border bg-background shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.symbol}
              onMouseDown={() => {
                onChange(s.symbol);
                setQuery("");
                setOpen(false);
              }}
              className="px-3 py-2 hover:bg-muted cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{s.symbol}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.price != null && (
                    <span className="text-xs font-medium">${s.price.toFixed(2)}</span>
                  )}
                  {s.change_pct != null && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        s.change_pct >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {s.change_pct >= 0 ? "+" : ""}
                      {s.change_pct.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {s.sector}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
