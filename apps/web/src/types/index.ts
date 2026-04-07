export interface Experiment {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "failed" | "promoted";
  hypothesis_id: string;
  created_at: string;
  updated_at: string;
  metrics?: BacktestMetrics;
}

export interface BacktestMetrics {
  sharpe_ratio: number;
  deflated_sharpe_ratio: number;
  pbo: number;
  max_drawdown: number;
  annual_return: number;
  calmar_ratio: number;
}

export interface Hypothesis {
  id: string;
  title: string;
  causal_mechanism: string;
  status: "proposed" | "approved" | "rejected" | "testing";
  author: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  name: string;
  strategy_ids: string[];
  allocation_method: "hrp" | "nco" | "equal_weight";
  created_at: string;
  updated_at: string;
}

export interface AuditDecision {
  id: string;
  timestamp: string;
  artifact_id: string;
  artifact_type: string;
  decision: "pass" | "fail" | "uncertain";
  reasoning: string;
  schema_version: string;
}

export interface IntelBrief {
  id: string;
  title: string;
  created_at: string;
  claim_count: number;
  status: "draft" | "reviewed" | "published";
}

export interface VerifierVerdict {
  schema_version: string;
  artifact_id: string;
  artifact_type:
    | "feature"
    | "label"
    | "backtest"
    | "code"
    | "causal_story"
    | "council_brief"
    | "pm_idea";
  leakage_risk: { level: "low" | "med" | "high"; reason: string };
  lookahead_risk: { level: "low" | "med" | "high"; reason: string };
  survivorship_risk: { level: "low" | "med" | "high"; reason: string };
  causal_story_plausible: { value: boolean; reason: string };
  metrics_consistent: { value: boolean; reason: string };
  code_correctness: { level: "low" | "med" | "high" | "n/a"; reason: string };
  decision: "pass" | "fail" | "uncertain";
  reasoning: string;
}
