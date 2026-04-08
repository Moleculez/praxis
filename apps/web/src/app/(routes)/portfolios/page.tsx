"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { usePortfolio, useRiskMetrics } from "@/hooks/use-portfolios";
import { cn } from "@/lib/utils";

function formatUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatMetric(value: number | null): string {
  if (value === null) return "--";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", className)}>{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4">
        <div className="h-6 w-24 animate-pulse rounded bg-muted mb-4" />
        <div className="h-[300px] animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-4">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load portfolio data</p>
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

/** Color-code risk metrics: green = favorable, red = concerning */
function riskColor(metric: string, value: number | null): string {
  if (value === null) return "";
  switch (metric) {
    case "Sharpe Ratio":
      return value >= 1.0
        ? "text-green-600 dark:text-green-400"
        : value < 0.5
          ? "text-red-600 dark:text-red-400"
          : "";
    case "Max Drawdown":
      return value > -0.1
        ? "text-green-600 dark:text-green-400"
        : value < -0.2
          ? "text-red-600 dark:text-red-400"
          : "";
    case "Annualized Vol":
      return value < 0.15
        ? "text-green-600 dark:text-green-400"
        : value > 0.3
          ? "text-red-600 dark:text-red-400"
          : "";
    case "Correlation Drift":
      return Math.abs(value) < 0.1
        ? "text-green-600 dark:text-green-400"
        : Math.abs(value) > 0.25
          ? "text-red-600 dark:text-red-400"
          : "";
    default:
      return "";
  }
}

export default function PortfoliosPage() {
  const portfolio = usePortfolio();
  const risk = useRiskMetrics();

  if (portfolio.isLoading) return <LoadingSkeleton />;

  if (portfolio.isError) {
    const err = portfolio.error as { message?: string } | undefined;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
        <ErrorBanner message={err?.message ?? "Check that the API server is running."} />
      </div>
    );
  }

  const data = portfolio.data;
  if (!data) return null;

  const pnlColor = data.daily_pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const totalAllocation = data.allocation.reduce((sum: number, a: { value: number }) => sum + a.value, 0);

  const riskRows: Array<{ metric: string; value: string; raw: number | null }> = risk.data
    ? [
        { metric: "Annualized Vol", value: formatMetric(risk.data.annualized_vol), raw: risk.data.annualized_vol },
        { metric: "99% VaR", value: formatMetric(risk.data.var_99), raw: risk.data.var_99 },
        { metric: "Expected Shortfall", value: formatMetric(risk.data.expected_shortfall), raw: risk.data.expected_shortfall },
        { metric: "Correlation Drift", value: formatMetric(risk.data.correlation_drift), raw: risk.data.correlation_drift },
        { metric: "Sharpe Ratio", value: formatMetric(risk.data.sharpe_ratio), raw: risk.data.sharpe_ratio },
        { metric: "Max Drawdown", value: formatMetric(risk.data.max_drawdown), raw: risk.data.max_drawdown },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
        {data.source && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              data.source === "alpaca"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
            )}
          >
            {data.source === "alpaca" ? "Alpaca" : "Mock"}
          </span>
        )}
      </div>

      {data.source === "mock" && data.positions.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 dark:border-yellow-900 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Using in-memory data. Connect Alpaca for persistent positions.
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Value" value={formatUsd(data.total_value)} />
        <StatCard label="Cash" value={formatUsd(data.cash)} />
        <StatCard label="Daily P&L" value={formatUsd(data.daily_pnl)} className={pnlColor} />
      </div>

      {/* Positions table */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        {data.positions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No positions yet. Submit orders on the Live page to build your portfolio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Ticker</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Avg Price</th>
                  <th className="pb-2 font-medium text-right">Current Price</th>
                  <th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((pos) => {
                  const pnl = pos.unrealized_pnl ?? (pos.current_price - pos.avg_price) * pos.quantity;
                  const rowColor = pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
                  return (
                    <tr key={pos.ticker} className="border-b last:border-0">
                      <td className="py-2 font-medium">{pos.ticker}</td>
                      <td className="py-2 text-right">{pos.quantity}</td>
                      <td className="py-2 text-right">{formatUsd(pos.avg_price)}</td>
                      <td className="py-2 text-right">{formatUsd(pos.current_price)}</td>
                      <td className={cn("py-2 text-right font-medium", rowColor)}>{formatUsd(pnl)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation: pie chart + table side by side */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Allocation</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.allocation}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name }) => name}
              >
                {data.allocation.map((slice, index) => (
                  <Cell key={`cell-${index}`} fill={slice.color} />
                ))}
                <Label
                  value={formatUsd(totalAllocation)}
                  position="center"
                  className="fill-foreground text-lg font-bold"
                />
              </Pie>
              <Tooltip
                formatter={(value: number) => formatUsd(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium text-right">Value</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.allocation.map((slice) => (
                  <tr key={slice.name} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      {slice.name}
                    </td>
                    <td className="py-2 text-right">{formatUsd(slice.value)}</td>
                    <td className="py-2 text-right">
                      {totalAllocation > 0 ? formatPct((slice.value / totalAllocation) * 100) : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Equity curve (placeholder) */}
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">Equity Curve</h2>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">Equity curve available after running backtests</p>
          <p className="text-xs mt-1">Run a pipeline to generate historical performance data</p>
        </div>
      </div>

      {/* Risk metrics */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Risk Metrics</h2>
        {risk.isLoading && <p className="text-sm text-muted-foreground">Loading risk metrics...</p>}
        {risk.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load risk metrics. Check that the API server is running.</p>
          </div>
        )}
        {riskRows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map(({ metric, value, raw }) => (
                <tr key={metric} className="border-b last:border-0">
                  <td className="py-2">{metric}</td>
                  <td className={cn("py-2 text-right font-medium", riskColor(metric, raw))}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <p className="text-sm text-muted-foreground">
        Paper trading only. Connect Alpaca API keys in .env to enable.
      </p>
    </div>
  );
}
