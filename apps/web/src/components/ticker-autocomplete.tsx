"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SymbolInfo } from "@/hooks/use-live";
import { apiFetch } from "@/lib/api";
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
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const blurRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes into input
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(blurRef.current);
    };
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q) {
      setResults([]);
      return;
    }
    try {
      const data = await apiFetch<SymbolInfo[]>(
        `/live/symbols/search?q=${encodeURIComponent(q)}`,
      );
      setResults(data);
    } catch {
      setResults([]);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    onChange(val);
    setOpen(true);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 200);
  }

  function handleFocus() {
    if (inputValue) {
      setOpen(true);
      search(inputValue);
    }
  }

  function handleBlur() {
    blurRef.current = setTimeout(() => setOpen(false), 150);
  }

  function selectItem(symbol: string) {
    setInputValue(symbol);
    onChange(symbol);
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectItem(results[activeIndex].symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `ticker-opt-${activeIndex}` : undefined}
        className={cn(
          "rounded-md border bg-background px-3 text-sm uppercase",
          className,
        )}
      />
      {open && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute top-full left-0 z-30 mt-1 w-96 rounded-md border bg-background shadow-lg max-h-72 overflow-y-auto"
        >
          {results.map((s, i) => (
            <li
              key={s.symbol}
              id={`ticker-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(s.symbol);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "px-3 py-2.5 cursor-pointer border-b border-border/50 last:border-0",
                i === activeIndex ? "bg-accent" : "hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm shrink-0">{s.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.price != null && (
                    <span className="text-xs font-medium tabular-nums">
                      ${s.price.toFixed(2)}
                    </span>
                  )}
                  {s.change_pct != null && (
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        s.change_pct >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {s.change_pct >= 0 ? "+" : ""}
                      {s.change_pct.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
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
