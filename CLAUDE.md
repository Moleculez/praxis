# Praxis — Project Conventions for Claude Code

You are working on **Praxis**, a multi-agent quantitative research and paper-trading platform with an integrated **Cogito** intelligence subsystem (PhD council + discretionary PM).

## What Praxis is
A research lab in software form. It ingests market data, generates causal hypotheses, engineers stationary features, trains models (LightGBM + sequence transformers), runs CPCV-validated backtests with Deflated Sharpe gates, allocates via HRP/NCO, and paper-trades approved strategies. A multi-LLM verification panel reviews every artifact that affects capital. The Cogito subsystem layers a PhD council and a discretionary PM on top, calling multiple LLM providers (Claude, GPT, Gemini, custom) for cross-provider reasoning over a validated claim graph.

## Methodological backbone
- de Prado, *Advances in Financial Machine Learning* (2018)
- de Prado, *Machine Learning for Asset Managers* (2020)
- de Prado, *Causal Factor Investing* (2023) — every factor needs a written mechanism
- Capponi & Lehalle (eds.), *Machine Learning and Data Sciences for Financial Markets* (2023)
- Wood, Zohren et al. — Momentum Transformer, DeepLOB, DeepVol
- Bishop, *Deep Learning: Foundations and Concepts* (2024)
- Klein — pre-mortem technique (used by `pm-discretionary`)
- Tetlock — calibration and Brier scoring (used by `phd-council`)

## Repo layout
```
praxis/
  apps/web/                          # Next.js 15 + shadcn frontend
  services/
    backend/                         # FastAPI (hexagonal)
      domain/
      adapters/{http,db}/
      schemas/
      workers/
      monitoring/
    research/                        # quant pipeline
      data/ features/ labels/ models/
      validation/                    # CPCV, DSR, PBO
      portfolios/ execution/         # paper only
    intelligence/                    # Cogito subsystem (NEW)
      crawlers/                      # edgar, fred, news, reddit, transcripts, arxiv
      validation/                    # dedup, claim extraction, corroboration
      council/                       # personas.yaml, providers/, synthesis
      pm/                            # discretionary PM
  data/{raw,clean}/
  experiments/<exp_id>/{manifest,report,backtest,promotion}.json
  hypotheses/<id>.md
  features/registry.yaml
  labels/<exp_id>.parquet
  portfolios/<id>/
  intel/
    briefs/<brief_id>/{claim_graph.json, council/, synthesis.md, disputes.json}
    trade_ideas/<idea_id>.json
    personas/scorecards.json         # Brier-weighted track records
    sources/credibility.json
  audit/
    decisions.jsonl                  # append-only legal record
    incidents.jsonl                  # failure protocol log
    verdicts/<id>.json
  migrations/
  tests/
  CLAUDE.md
  .claude/agents/
```

## Hard rules (apply to ALL agents)
1. **No live trading** from inside Claude Code. Paper only. Live execution requires a human-signed CLI command outside Claude Code.
2. **No factor without a causal story** (`research-causal` must approve).
3. **No promotion without DSR ≥ 0.95 AND PBO ≤ 0.5 AND multi-LLM panel approval.**
4. **Survivorship + look-ahead audits** mandatory on every dataset.
5. **Hexagonal backend.** Domain code has zero framework imports.
6. **Server Components by default** in the frontend.
7. **Tests are not optional.**
8. **Audit log is append-only.**
9. **Cogito-specific**:
   - Never auto-execute discretionary trade ideas. Ever.
   - Discretionary sleeve cap: 20% portfolio gross, ≤8 positions, ≤2% per position.
   - Discretionary and systematic PnL are tracked in **physically separate books**.
   - Council personas run on **different providers** where possible.
   - "Two LLMs agreeing" never counts as two independent sources.
   - Twitter/X data only via licensed vendors. Never scrape raw.
   - Brier scorecard updates run after every horizon resolves. Never delete personas.

## Failure protocol
- Any agent returning `status: failed` gets ONE retry with clarification.
- Second failure → halt, log to `audit/incidents.jsonl`, surface to user.
- No silent retry loops. Ever.

## Verifier panel JSON schema (frozen, versioned: VERIFIER_V1)
Every `llm-verifier` call must return:
```json
{
  "schema_version": "VERIFIER_V1",
  "artifact_id": "string",
  "artifact_type": "feature|label|backtest|code|causal_story|council_brief|pm_idea",
  "leakage_risk": {"level": "low|med|high", "reason": "string"},
  "lookahead_risk": {"level": "low|med|high", "reason": "string"},
  "survivorship_risk": {"level": "low|med|high", "reason": "string"},
  "causal_story_plausible": {"value": true, "reason": "string"},
  "metrics_consistent": {"value": true, "reason": "string"},
  "code_correctness": {"level": "low|med|high|n/a", "reason": "string"},
  "decision": "pass|fail|uncertain",
  "reasoning": "string"
}
```

## Provider routing matrix (default — current as of April 2026)

Recommended: route all calls through a single OpenAI-compatible gateway (OpenRouter or Cline API). One key, all providers, one-parameter switching. Direct SDK usage is acceptable when privacy/billing dictates.

| Role | Primary | Fallback | Why |
|---|---|---|---|
| Quant methodology, code review, PM | `anthropic/claude-opus-4.6` | `openai/gpt-5.4` | #1 finance agent tasks, SWE-bench leader, 1M context |
| Microstructure / daily-driver analysis | `anthropic/claude-sonnet-4.6` | `openai/gpt-5.4` | Near-Opus quality at ~5x lower cost |
| Macro reasoning + web grounding | `google/gemini-3.1-pro` | `anthropic/claude-opus-4.6` | ARC-AGI-2 leader (77.1%), GPQA Diamond 94.3%, 2M context, $2/$12 |
| Behavioral / X-sentiment | `xai/grok-4.20` | `openai/gpt-5.4` | Native real-time X/Twitter data |
| Sector specialist (search-heavy) | `google/gemini-3.1-pro` | `openai/gpt-5.4` | Best grounding + large context for filings |
| Red Team | Forced ≠ thesis author | dynamic | Cross-provider disagreement is the signal |
| Bulk claim extraction / classification | `deepseek/deepseek-v4` | `google/gemini-3-flash` | ~$0.28/$1.10 per 1M, ~27x cheaper than frontier |
| Verifier panel | ≥2 distinct providers from above | n/a | Same-provider panels are theater |

API keys via env vars only. Per-brief cost cap in `services/intelligence/council/config.yaml`. Update model strings deliberately when new generations drop and re-baseline Brier weights for affected personas.

## How to start a session
1. `master-orchestrator` reads this file.
2. Classifies request: research / backend / frontend / intelligence / cross-team.
3. Delegates to the relevant lead.
4. Each lead delegates to specialists in the documented order.
5. End with a one-paragraph summary + artifact paths.

## Tooling
- **Python**: 3.12, ruff, mypy --strict, pytest, Polars, FastAPI, SQLAlchemy 2.x async, Arq, MLflow, neuralforecast, stable-baselines3, sentence-transformers
- **JS**: pnpm, Next.js 15, TypeScript strict, shadcn/ui, Tailwind v4, TanStack Query/Table, react-hook-form, Zod, Recharts, lightweight-charts, Vitest, Playwright
- **Infra**: Docker Compose for local; TimescaleDB, Postgres, Redis, MinIO, MLflow
- **LLM gateway (recommended)**: OpenRouter or Cline API — single OpenAI-compatible endpoint for Claude / GPT / Gemini / Grok / DeepSeek / open-weight
- **LLM clients (direct mode)**: `anthropic`, `openai`, `google-generativeai`, `xai` SDKs

## Style
- Small functions, explicit types, no clever one-liners.
- Conventional commits. One logical change per commit.
- PRs < 500 LOC ideal. Larger PRs are split before review.
