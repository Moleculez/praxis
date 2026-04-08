/* ------------------------------------------------------------------ */
/*  Frontend types aligned with backend Pydantic schemas              */
/*  Source of truth: services/backend/schemas/ + domain/models.py     */
/* ------------------------------------------------------------------ */

// --- Experiment (ExperimentResponse) --------------------------------

export interface Experiment {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "failed" | "promoted";
  manifest: Record<string, unknown>;
  created_at: string | null;
}

// --- Hypothesis (HypothesisResponse) --------------------------------

export interface Hypothesis {
  id: string;
  claim: string;
  mechanism: string;
  status: "proposed" | "testing" | "confirmed" | "rejected";
  created_at: string | null;
}

// --- Verifier (VERIFIER_V1 frozen schema) ---------------------------

export type RiskLevel = "low" | "med" | "high" | "n/a";

export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
}

export interface BoolAssessment {
  value: boolean;
  reason: string;
}

export type ArtifactType =
  | "feature"
  | "label"
  | "backtest"
  | "code"
  | "causal_story"
  | "council_brief"
  | "pm_idea";

export interface VerifierVerdict {
  schema_version: "VERIFIER_V1";
  artifact_id: string;
  artifact_type: ArtifactType;
  leakage_risk: RiskAssessment;
  lookahead_risk: RiskAssessment;
  survivorship_risk: RiskAssessment;
  causal_story_plausible: BoolAssessment;
  metrics_consistent: BoolAssessment;
  code_correctness: RiskAssessment;
  decision: "pass" | "fail" | "uncertain";
  reasoning: string;
}

// --- Shared (common.py) ---------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ErrorResponse {
  detail: string;
}

// --- Audit (domain model) -------------------------------------------

export interface AuditDecision {
  ts: string;
  request: string;
  lead: string;
  reason: string;
}

// --- Future / planned (no backend endpoint yet) ---------------------

export interface BacktestMetrics {
  sharpe_ratio: number;
  deflated_sharpe_ratio: number;
  pbo: number;
  max_drawdown: number;
  annual_return: number;
  calmar_ratio: number;
}

export interface Portfolio {
  id: string;
  name: string;
  strategy_ids: string[];
  allocation_method: "hrp" | "nco" | "equal_weight";
  created_at: string;
}

export interface IntelBrief {
  id: string;
  title: string;
  created_at: string;
  claim_count: number;
  status: "draft" | "reviewed" | "published";
  summary?: string;
}

export interface CrawlerSource {
  name: string;
  source: string;
  status: "implemented" | "stub";
  description: string;
  last_updated?: string;
}

// --- Council (Cogito intelligence subsystem) --------------------------

export interface CouncilAssessment {
  persona_id: string;
  probability: number;
  confidence: string;
  assessment: string;
  mechanism: string;
  falsification_test: string;
}

export interface CouncilSynthesis {
  consensus: string;
  probability: number;
  probability_range: [number, number];
  spread: number;
  n_personas: number;
  disagreements: string[];
  assessments: CouncilAssessment[];
  summary: string;
}
