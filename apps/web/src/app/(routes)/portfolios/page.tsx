"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const allocationData = [{ name: "Cash", value: 100 }];
const COLORS = ["#94a3b8"];

const riskMetrics = [
  { metric: "Annualized Vol", value: "--" },
  { metric: "99% VaR", value: "--" },
  { metric: "Expected Shortfall", value: "--" },
  { metric: "Correlation Drift", value: "--" },
];

export default function PortfoliosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>

      {/* Section 1: Portfolio Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold">$100,000.00</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Daily P&L</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Max Drawdown</p>
          <p className="text-2xl font-bold">--</p>
        </div>
      </div>

      {/* Section 2: Allocation */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Allocation</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name }) => name}
            >
              {allocationData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3: Risk Metrics */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Risk Metrics</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Metric</th>
              <th className="pb-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {riskMetrics.map(({ metric, value }) => (
              <tr key={metric} className="border-b last:border-0">
                <td className="py-2">{metric}</td>
                <td className="py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <p className="text-sm text-muted-foreground">
        Paper trading only. Connect Alpaca API keys in .env to enable.
      </p>
    </div>
  );
}
