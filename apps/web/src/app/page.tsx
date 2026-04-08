"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Brain,
  FlaskConical,
  Radio,
  Settings,
  Shield,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  useTradingSummary,
  useAutoTradeStatus,
  useSignals,
  useConnectionStatus,
  useMarketOverview,
} from "@/hooks/use-live";
import type { MarketOverviewItem } from "@/hooks/use-live";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Health hook                                                        */
/* ------------------------------------------------------------------ */

interface HealthStatus {
  status: string;
  database: string;
  llm_keys?: boolean;
  alpaca_keys?: boolean;
}

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthStatus>("/health"),
    retry: 1,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Market hours helper                                                */
/* ------------------------------------------------------------------ */

/** Return true if NYSE is currently open (Mon-Fri 9:30-16:00 ET). */
function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes >= 570 && minutes < 960; // 9:30=570, 16:00=960
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Top-row stat cards                                                 */
/* ------------------------------------------------------------------ */

function PortfolioCard() {
  const summary = useTradingSummary();
  const loading = summary.isLoading;
  const pnl = summary.data?.net_pnl ?? 0;
  const positive = pnl >= 0;

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-purple-500" />
        <p className="text-sm text-muted-foreground">Portfolio</p>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <>
          <p className="mt-2 text-2xl font-bold">
            {summary.data?.trades_today ?? 0} trades today
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              positive ? "text-green-500" : "text-red-500",
            )}
          >
            {positive ? "+" : ""}
            {pnl.toFixed(2)} P&amp;L
            {summary.data?.win_rate != null && (
              <span className="ml-2 text-muted-foreground">
                {(summary.data.win_rate * 100).toFixed(0)}% win
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function AITradingCard() {
  const status = useAutoTradeStatus();
  const loading = status.isLoading;
  const running = status.data?.running ?? false;
  const signalsCount = status.data?.signals_count ?? 0;
  const strategy =
    (status.data?.config?.strategy as string | undefined) ?? "Default";

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-blue-500" />
        <p className="text-sm text-muted-foreground">AI Trading</p>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                running ? "bg-green-500" : "bg-gray-400",
              )}
            />
            <p className="text-2xl font-bold">
              {running ? "Running" : "Stopped"}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {strategy} &middot; {signalsCount} signals
          </p>
        </>
      )}
    </div>
  );
}

function MarketOverviewCard() {
  const conn = useConnectionStatus();
  const loading = conn.isLoading;
  const connected = conn.data?.connected ?? false;
  const source = conn.data?.source ?? "Unknown";

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <Radio size={16} className="text-green-500" />
        <p className="text-sm text-muted-foreground">Market Connection</p>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                connected ? "bg-green-500" : "bg-red-500",
              )}
            />
            <p className="text-2xl font-bold">
              {connected ? "Connected" : "Disconnected"}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{source}</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal Feed                                                        */
/* ------------------------------------------------------------------ */

function SignalFeed() {
  const signals = useSignals();
  const loading = signals.isLoading;
  const items = (signals.data ?? []).slice(0, 10);

  return (
    <section className="rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-blue-500" />
        <h2 className="text-lg font-semibold">AI Signal Feed</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Brain size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Start AI Trading to generate signals
          </p>
          <Link
            href="/trading"
            className="mt-3 text-sm font-medium text-blue-500 hover:underline"
          >
            Go to Trading
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Ticker</th>
                <th className="pb-2 font-medium">Direction</th>
                <th className="pb-2 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-4 font-medium">{s.ticker}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        s.direction === "buy"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
                      )}
                    >
                      {s.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {(s.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 text-muted-foreground line-clamp-1">
                    {s.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal Charts                                                      */
/* ------------------------------------------------------------------ */

function SignalCharts() {
  const signals = useSignals();

  const signalTrend = useMemo(() => {
    if (!signals.data?.length) return [];
    return signals.data.slice(-20).map((s, i) => ({
      idx: i,
      confidence: Math.round(s.confidence * 100),
    }));
  }, [signals.data]);

  if (signalTrend.length === 0) return null;

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-2">Confidence Trend</h3>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={signalTrend}>
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Confidence"]}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-2">Signal Activity</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={signalTrend}>
            <Bar dataKey="confidence" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <XAxis dataKey="idx" hide />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Confidence"]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Market Overview                                                    */
/* ------------------------------------------------------------------ */

function MarketSymbolCard({ item }: { item: MarketOverviewItem }) {
  const positive = (item.change_pct ?? 0) >= 0;
  const strokeColor = positive ? "#22c55e" : "#ef4444";

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {item.symbol}
          </p>
          <p className="text-lg font-bold">
            {item.price != null ? `$${item.price.toFixed(2)}` : "$--"}
          </p>
          {item.change_pct != null && (
            <p
              className={cn(
                "text-xs font-medium",
                positive ? "text-green-600" : "text-red-600",
              )}
            >
              {positive ? "+" : ""}
              {item.change_pct.toFixed(2)}%
            </p>
          )}
        </div>
        {item.history.length > 1 && (
          <div className="w-[72px] h-[40px] shrink-0">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={item.history}>
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketHoursIndicator() {
  const open = isMarketOpen();
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          open ? "bg-green-500" : "bg-gray-400",
        )}
      />
      {open ? "Market Open" : "Market Closed"}
    </div>
  );
}

const OVERVIEW_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";

function MarketOverview() {
  const { data, isLoading } = useMarketOverview();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Market Overview</h2>
        <MarketHoursIndicator />
      </div>
      {isLoading ? (
        <div className={OVERVIEW_GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      ) : (
        <div className={OVERVIEW_GRID}>
          {(data ?? []).map((item) => (
            <MarketSymbolCard key={item.symbol} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */

const quickActions = [
  { label: "Start AI Trading", href: "/trading", icon: Brain },
  { label: "View Portfolio", href: "/trading", icon: BarChart3 },
  { label: "Research Pipeline", href: "/research", icon: FlaskConical },
  { label: "AI Intelligence", href: "/intelligence", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Audit Log", href: "/audit", icon: Shield },
] as const;

function QuickActions() {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center justify-center gap-2 rounded-lg border px-4 py-6 text-sm font-medium transition-all hover:bg-muted/50 hover:scale-[1.02] hover:border-foreground/20"
          >
            <a.icon size={16} className="text-muted-foreground" />
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Setup Wizard                                                       */
/* ------------------------------------------------------------------ */

const setupSteps = [
  {
    step: 1,
    title: "Configure API Keys",
    href: "/settings",
    description: "Add your LLM and broker API keys",
  },
  {
    step: 2,
    title: "Choose Strategy",
    href: "/trading",
    description: "Select an AI trading strategy",
  },
  {
    step: 3,
    title: "Start Trading",
    href: "/trading",
    description: "Launch paper trading with AI signals",
  },
] as const;

function SetupWizard() {
  return (
    <section className="rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-6">
      <h2 className="text-lg font-semibold mb-4">Get Started</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {setupSteps.map((s) => (
          <Link key={s.step} href={s.href} className="flex gap-3 group">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
              {s.step}
            </div>
            <div>
              <p className="font-medium group-hover:underline">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const health = useHealth();

  const keysConfigured =
    !!health.data?.llm_keys || !!health.data?.alpaca_keys;
  const showWizard = !health.isLoading && !keysConfigured;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Command Center</h1>

      {showWizard && <SetupWizard />}

      {/* Top row: 3 stat cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <PortfolioCard />
        <AITradingCard />
        <MarketOverviewCard />
      </section>

      {/* Charts: confidence trend + signal activity */}
      <SignalCharts />

      {/* Market Overview: major index prices */}
      <MarketOverview />

      {/* Signal Feed */}
      <SignalFeed />

      {/* Quick Actions */}
      <QuickActions />
    </main>
  );
}
