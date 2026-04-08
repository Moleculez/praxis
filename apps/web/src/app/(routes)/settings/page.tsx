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

  const [maxPositionPct, setMaxPositionPct] = useState(2);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5000);
  const [maxPositions, setMaxPositions] = useState(8);
  const [autoExecuteThreshold, setAutoExecuteThreshold] = useState(1);

  useEffect(() => {
    if (limits) {
      setMaxPositionPct(limits.max_position_pct);
      setMaxDailyLoss(limits.max_daily_loss);
      setMaxPositions(limits.max_positions);
      setAutoExecuteThreshold(limits.auto_execute_threshold);
    }
  }, [limits]);

  function handleSave() {
    updateLimits.mutate({
      max_position_pct: maxPositionPct,
      max_daily_loss: maxDailyLoss,
      max_positions: maxPositions,
      auto_execute_threshold: autoExecuteThreshold,
    });
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Trading Limits</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Trading Limits</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Position Size (%)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={maxPositionPct}
            onChange={(e) => setMaxPositionPct(Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Daily Loss ($)
          </label>
          <input
            type="number"
            min={0}
            step={100}
            value={maxDailyLoss}
            onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Concurrent Positions
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={maxPositions}
            onChange={(e) => setMaxPositions(Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Auto-Execute Threshold (%)
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={autoExecuteThreshold}
            onChange={(e) => setAutoExecuteThreshold(Number(e.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateLimits.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {updateLimits.isPending ? "Saving..." : "Save Limits"}
        </button>
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
