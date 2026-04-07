"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePortfolio, useRiskMetrics } from "@/hooks/use-portfolios";
import { cn } from "@/lib/utils";

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <p className="font-medium">Failed to load portfolio data</p>
      <p className="text-sm">{message}</p>
    </div>
  );
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
        <ErrorBanner message={err?.message ?? "Unknown error"} />
      </div>
    );
  }

  const data = portfolio.data;
  if (!data) return null;

  const pnlColor = data.daily_pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const riskRows: Array<{ metric: string; value: string }> = risk.data
    ? [
        { metric: "Annualized Vol", value: formatMetric(risk.data.annualized_vol) },
        { metric: "99% VaR", value: formatMetric(risk.data.var_99) },
        { metric: "Expected Shortfall", value: formatMetric(risk.data.expected_shortfall) },
        { metric: "Correlation Drift", value: formatMetric(risk.data.correlation_drift) },
        { metric: "Sharpe Ratio", value: formatMetric(risk.data.sharpe_ratio) },
        { metric: "Max Drawdown", value: formatMetric(risk.data.max_drawdown) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Value" value={formatUsd(data.total_value)} />
        <StatCard label="Cash" value={formatUsd(data.cash)} />
        <StatCard label="Daily P&L" value={formatUsd(data.daily_pnl)} className={pnlColor} />
      </div>

      {/* Positions table */}
      {data.positions.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Positions</h2>
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
                  const pnl = (pos.current_price - pos.avg_price) * pos.quantity;
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
        </div>
      )}

      {/* Allocation pie chart */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Allocation</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.allocation}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name }) => name}
            >
              {data.allocation.map((slice, index) => (
                <Cell key={`cell-${index}`} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Risk metrics */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Risk Metrics</h2>
        {risk.isLoading && <p className="text-sm text-muted-foreground">Loading risk metrics...</p>}
        {risk.isError && <p className="text-sm text-red-600">Failed to load risk metrics.</p>}
        {riskRows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map(({ metric, value }) => (
                <tr key={metric} className="border-b last:border-0">
                  <td className="py-2">{metric}</td>
                  <td className="py-2 text-right">{value}</td>
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
