"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  useAppSettings,
  useTradingLimits,
  useUpdateTradingLimits,
  useTestLLM,
  useTestBroker,
} from "@/hooks/use-settings";

interface ConnectionBadgeProps {
  label: string;
  connected: boolean;
}

function ConnectionBadge({ label, connected }: ConnectionBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
      {connected ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 dark:text-gray-500" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ConnectionStatusSection() {
  const { data: settings, isLoading } = useAppSettings();
  const testLLM = useTestLLM();
  const testBroker = useTestBroker();

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const connections = [
    { label: "Alpaca", connected: settings?.broker.alpaca_configured ?? false },
    { label: "IBKR", connected: settings?.broker.ibkr_configured ?? false },
    {
      label: "OpenRouter",
      connected: settings?.llm.openrouter_configured ?? false,
    },
    {
      label: "Anthropic",
      connected: settings?.llm.anthropic_configured ?? false,
    },
    { label: "OpenAI", connected: settings?.llm.openai_configured ?? false },
    { label: "Google AI", connected: settings?.llm.google_configured ?? false },
    { label: "Ollama", connected: settings?.llm.ollama_configured ?? false },
  ];

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {connections.map((c) => (
          <ConnectionBadge
            key={c.label}
            label={c.label}
            connected={c.connected}
          />
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => testLLM.mutate()}
          disabled={testLLM.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {testLLM.isPending ? "Testing..." : "Test LLM"}
        </button>
        <button
          type="button"
          onClick={() => testBroker.mutate()}
          disabled={testBroker.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {testBroker.isPending ? "Testing..." : "Test Broker"}
        </button>
      </div>
    </div>
  );
}

function TradingLimitsSection() {
  const { data: limits, isLoading } = useTradingLimits();
  const updateLimits = useUpdateTradingLimits();

  const [form, setForm] = useState({
    max_position_pct: 0.05,
    max_daily_loss: 10000,
    max_positions: 15,
    auto_execute_threshold: 0.05,
    min_confidence: 0.55,
    scan_interval_sec: 60,
    tickers: "SPY,QQQ,AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM",
    use_council: true,
    aggressive_mode: false,
  });

  useEffect(() => {
    if (limits) setForm(limits);
  }, [limits]);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    updateLimits.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">AI Trading Configuration</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI Trading Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how aggressively the AI trades. Lower confidence and higher thresholds = more trades.
        </p>
      </div>

      {/* Mode toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.use_council} onChange={(e) => set("use_council", e.target.checked)} className="h-4 w-4 rounded border" />
          <span className="text-sm font-medium">Use AI Council</span>
          <span className="text-xs text-muted-foreground">(LLM evaluates each ticker)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.aggressive_mode} onChange={(e) => set("aggressive_mode", e.target.checked)} className="h-4 w-4 rounded border" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">Aggressive Mode</span>
          <span className="text-xs text-muted-foreground">(skip council, momentum signals)</span>
        </label>
      </div>

      {/* Ticker list */}
      <div>
        <label className="block text-sm font-medium mb-1">Tickers to Scan</label>
        <input
          type="text"
          value={form.tickers}
          onChange={(e) => set("tickers", e.target.value.toUpperCase())}
          placeholder="SPY,QQQ,AAPL,NVDA,TSLA"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated. AI will scan these every cycle.</p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Min Confidence</label>
          <input type="number" min={0.3} max={0.9} step={0.05} value={form.min_confidence}
            onChange={(e) => set("min_confidence", Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Lower = more trades. 0.5 = trade on slight edge.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Scan Interval (sec)</label>
          <input type="number" min={10} max={3600} step={10} value={form.scan_interval_sec}
            onChange={(e) => set("scan_interval_sec", Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Seconds between full ticker scans.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Position Size (%)</label>
          <input type="number" min={0.5} max={20} step={0.5} value={form.max_position_pct * 100}
            onChange={(e) => set("max_position_pct", Number(e.target.value) / 100)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Auto-Execute Threshold (%)</label>
          <input type="number" min={0.5} max={20} step={0.5} value={form.auto_execute_threshold * 100}
            onChange={(e) => set("auto_execute_threshold", Number(e.target.value) / 100)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Positions below this % auto-execute without approval.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Daily Loss ($)</label>
          <input type="number" min={100} step={500} value={form.max_daily_loss}
            onChange={(e) => set("max_daily_loss", Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Concurrent Positions</label>
          <input type="number" min={1} max={50} value={form.max_positions}
            onChange={(e) => set("max_positions", Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={updateLimits.isPending}
        className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium disabled:opacity-50"
      >
        {updateLimits.isPending ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}

function HowToConfigureSection() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">How to Configure</h2>
      <p className="text-sm text-muted-foreground mb-3">
        API keys are configured via environment variables in your{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
          .env
        </code>{" "}
        file:
      </p>
      <pre className="rounded-md bg-muted p-4 text-xs font-mono overflow-x-auto leading-relaxed">
        {`ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
OPENROUTER_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key
XAI_API_KEY=your_key
OLLAMA_HOST=http://localhost:11434`}
      </pre>
      <p className="mt-3 text-sm text-muted-foreground">
        After updating{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
          .env
        </code>
        , restart the API server.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ConnectionStatusSection />
      <TradingLimitsSection />
      <HowToConfigureSection />
    </div>
  );
}
