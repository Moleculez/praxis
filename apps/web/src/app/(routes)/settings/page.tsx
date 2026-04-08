"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Download, RotateCcw, Info, Shield, Globe, User } from "lucide-react";
import { toast } from "sonner";
import {
  useAppSettings,
  useSystemInfo,
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

function SystemInfoSection() {
  const { data: info, isLoading } = useSystemInfo();

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" /> System Info
        </h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const items = [
    { label: "Python", value: info?.python_version ?? "Unknown" },
    { label: "Platform", value: info?.platform ?? "Unknown" },
    { label: "Database", value: info?.database ?? "Unknown" },
    { label: "Debug Mode", value: info?.debug ? "Enabled" : "Disabled" },
  ];

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Info className="h-5 w-5" /> System Info
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border px-4 py-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProxyConfigSection() {
  const { data: settings, isLoading } = useAppSettings();

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5" /> Proxy Configuration
        </h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5" /> Proxy Configuration
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">HTTP Proxy</p>
          <p className="text-sm font-medium mt-0.5">
            {settings?.proxy?.http_proxy ? "Configured" : "Not configured"}
          </p>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">No-Proxy Hosts</p>
          <p className="text-sm font-medium mt-0.5">
            {settings?.proxy?.no_proxy || "None"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Proxy is configured via{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          HTTP_PROXY
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          NO_PROXY
        </code>{" "}
        environment variables in your{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          .env
        </code>{" "}
        file.
      </p>
    </div>
  );
}

const DEFAULT_TRADING_LIMITS = {
  max_position_pct: 2,
  max_daily_loss: 5000,
  max_positions: 8,
  auto_execute_threshold: 1,
};

function ExportConfigButton() {
  const appSettings = useAppSettings();

  function handleExport() {
    const data = appSettings.data;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "praxis-config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Config exported");
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={appSettings.isLoading || !appSettings.data}
      className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Export Config
    </button>
  );
}

function TradingLimitsSection() {
  const { data: limits, isLoading } = useTradingLimits();
  const updateLimits = useUpdateTradingLimits();
  const [form, setForm] = useState({
    max_position_pct: 0.05, max_daily_loss: 10000, max_positions: 15,
    auto_execute_threshold: 0.10, min_confidence: 0.55, scan_interval_sec: 60,
    tickers: "SPY,QQQ,AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM",
    use_council: true, aggressive_mode: false,
  });

  useEffect(() => { if (limits) setForm(limits); }, [limits]);
  function set(key: string, value: unknown) { setForm((f) => ({ ...f, [key]: value })); }

  if (isLoading) {
    return (<div className="rounded-lg border p-6"><h2 className="text-lg font-semibold mb-4">AI Trading Configuration</h2><p className="text-sm text-muted-foreground">Loading...</p></div>);
  }

  return (
    <div className="rounded-lg border p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> AI Trading Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure how aggressively the AI trades.</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.use_council} onChange={(e) => set("use_council", e.target.checked)} className="h-4 w-4 rounded border" />
          <span className="text-sm font-medium">Use AI Council</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.aggressive_mode} onChange={(e) => set("aggressive_mode", e.target.checked)} className="h-4 w-4 rounded border" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">Aggressive Mode</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tickers to Scan</label>
        <input type="text" value={form.tickers} onChange={(e) => set("tickers", e.target.value.toUpperCase())} className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono" />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated. AI scans these every cycle.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className="block text-sm font-medium mb-1">Min Confidence</label><input type="number" min={0.3} max={0.9} step={0.05} value={form.min_confidence} onChange={(e) => set("min_confidence", Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /><p className="text-xs text-muted-foreground mt-1">Lower = more trades</p></div>
        <div><label className="block text-sm font-medium mb-1">Scan Interval (sec)</label><input type="number" min={10} max={3600} step={10} value={form.scan_interval_sec} onChange={(e) => set("scan_interval_sec", Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Max Position (%)</label><input type="number" min={0.5} max={20} step={0.5} value={form.max_position_pct * 100} onChange={(e) => set("max_position_pct", Number(e.target.value) / 100)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Auto-Execute (%)</label><input type="number" min={0.5} max={20} step={0.5} value={form.auto_execute_threshold * 100} onChange={(e) => set("auto_execute_threshold", Number(e.target.value) / 100)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /><p className="text-xs text-muted-foreground mt-1">Below this = auto-trade</p></div>
        <div><label className="block text-sm font-medium mb-1">Max Daily Loss ($)</label><input type="number" min={100} step={500} value={form.max_daily_loss} onChange={(e) => set("max_daily_loss", Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Max Positions</label><input type="number" min={1} max={50} value={form.max_positions} onChange={(e) => set("max_positions", Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => updateLimits.mutate(form)} disabled={updateLimits.isPending} className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium disabled:opacity-50">{updateLimits.isPending ? "Saving..." : "Save Configuration"}</button>
        <button type="button" onClick={() => { const d = { max_position_pct: 0.02, max_daily_loss: 5000, max_positions: 8, auto_execute_threshold: 0.01, min_confidence: 0.6, scan_interval_sec: 300, tickers: "SPY,QQQ,AAPL,NVDA,TSLA", use_council: true, aggressive_mode: false }; setForm(d as typeof form); updateLimits.mutate(d); }} disabled={updateLimits.isPending} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"><RotateCcw className="h-4 w-4" />Reset</button>
      </div>
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

function UserProfileSection() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5" /> User Profile
      </h2>
      <p className="text-sm text-muted-foreground">
        Authentication is not configured. User management will be available once
        an auth provider is set up.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <ExportConfigButton />
      </div>
      <SystemInfoSection />
      <ConnectionStatusSection />
      <ProxyConfigSection />
      <TradingLimitsSection />
      <UserProfileSection />
      <HowToConfigureSection />
    </div>
  );
}
