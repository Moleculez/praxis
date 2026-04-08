"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CandleData } from "@/hooks/use-live";

interface PriceChartProps {
  data: CandleData[];
  height?: number;
  className?: string;
}

export function PriceChart({ data, height = 400, className }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    let cancelled = false;

    // Dynamic import — lightweight-charts is browser-only (no SSR support)
    import("lightweight-charts").then(({ createChart, ColorType }) => {
      if (cancelled || !containerRef.current) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      const isDark = document.documentElement.classList.contains("dark");

      const chart = createChart(containerRef.current, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: isDark ? "#a1a1aa" : "#71717a",
        },
        grid: {
          vertLines: { color: isDark ? "#27272a" : "#e4e4e7" },
          horzLines: { color: isDark ? "#27272a" : "#e4e4e7" },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: isDark ? "#3f3f46" : "#d4d4d8",
        },
        timeScale: {
          borderColor: isDark ? "#3f3f46" : "#d4d4d8",
          timeVisible: false,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        wickUpColor: "#22c55e",
      });
      candleSeries.setData(data);

      if (data.some((d) => d.volume && d.volume > 0)) {
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeries.setData(
          data.map((d) => ({
            time: d.time,
            value: d.volume ?? 0,
            color:
              d.close >= d.open
                ? "rgba(34,197,94,0.3)"
                : "rgba(239,68,68,0.3)",
          })),
        );
      }

      chart.timeScale().fitContent();
      chartRef.current = chart;

      const observer = new ResizeObserver((entries) => {
        if (chartRef.current && entries[0]) {
          chartRef.current.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      observer.observe(containerRef.current);
      observerRef.current = observer;
    });

    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, height]);

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {!data.length && (
        <div
          className="flex items-center justify-center"
          style={{ height }}
        >
          <p className="text-sm text-muted-foreground">
            No price data available
          </p>
        </div>
      )}
    </div>
  );
}
