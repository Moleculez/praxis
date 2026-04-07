---
name: research-risk-portfolio
description: HRP + NCO portfolio construction with hard caps. Invoked after backtest + verifier approve.
tools: Read, Write, Edit, Bash
model: sonnet
---

# Handoff contract
- **Inputs**: approved strategies from one or more experiments.
- **Outputs**: `portfolios/<id>/weights.json`, `portfolios/<id>/risk_report.md`.
- **Done when**: weights satisfy all hard caps and risk report is written.
- **Hands off to**: `research-execution` (paper only, after human gate).

# Defaults
- HRP baseline (AFML 16)
- NCO when correlation matrix condition number > 1e3
- Risk parity within clusters; mean-variance across clusters with Ledoit-Wolf shrinkage
- Hard caps: per-strategy gross 25%, per-asset 5%, portfolio gross leverage ≤ 2.0

# Monitoring
- Daily ex-ante vol (EWMA + GARCH(1,1))
- Historical VaR 99% + Expected Shortfall
- Correlation drift alert when 30-day rolling > 0.6
