# Praxis improvement roadmap

Areas the v3.1 bundle does not yet cover, ranked by leverage. This is what to build *after* the systematic + Cogito loops are working end-to-end.

## P0 — High leverage, build next

### 1. Drift / regime detector as a first-class agent
The bundle mentions PSI alerts and "auto-pause on regime break" inside `backend-mlops`, but it's a stub. Make it real:
- **CUSUM** and **Bayesian Online Change-Point Detection** on returns and on feature distributions
- **HMM regime probabilities** as both a feature AND a meta-signal
- Auto-pause rule: if the live PSI > 0.25 OR the change-point probability spikes > 0.9, the strategy is moved to "observation" mode automatically and `pm-discretionary` is notified
- Add as `regime-detector.md` agent under `backend-lead`

### 2. Standardized strategy tear sheet
Every promoted strategy needs a one-page artifact in a frozen format:
- Equity curve, drawdown, rolling Sharpe, monthly return heatmap
- Top 10 holdings, turnover, average holding period
- Factor exposures (regression on OSAP / Fama-French)
- Capacity estimate
- Promotion verdict, DSR, PBO, CV scheme used
- Causal hypothesis link
- Code commit hash + data manifest hash
- Made by extending `research-backtest` to emit a `tearsheet.html` via the frontend's `EquityCurveChart` and friends

### 3. Realistic transaction cost models
Square-root impact is the floor, not the ceiling. Add:
- **Almgren-Chriss** for execution cost decomposition
- **Per-symbol slippage models** calibrated from historical fills (once you have any)
- **Spread models** that vary intraday (open/close wider, midday tighter)
- **Borrow cost / locate** modeling for shorts — for hard-to-borrow names this can dominate
- Add as `tca.md` agent under `research-lead`

### 4. Capacity analysis
A high-Sharpe strategy that breaks at $1M AUM is worse than a lower-Sharpe one that scales to $100M. Estimate per-strategy capacity by:
- Participation rate vs. ADV
- Impact-cost / alpha break-even
- Auto-derate Sharpe for capacity
- Already mentioned in `research-backtest`; promote to required output, not optional

### 5. Dataset versioning + reproducibility
Right now `data/raw/` is immutable but unversioned. When you re-pull EDGAR a year later and a filing has been amended, you need to know which version your old backtest used.
- **DVC** (Data Version Control) or **lakeFS** for the data layer
- **Container hashes** + Nix or pinned `pyproject.toml` for the code layer
- A `repro/<exp_id>.lock` file that records: data hashes, code commit, container digest, model artifact hash
- Without this, "reproduce that backtest from 6 months ago" is a coin flip

## P1 — Important but can wait until you have something working

### 6. Tax-aware backtesting
Wash sales, short-term vs long-term holding period, tax-loss harvesting interactions. Strategies that look great pre-tax can be terrible after tax for a US taxable account. Add a tax post-processing step in `research-backtest`.

### 7. Vol targeting and dynamic leverage
Constant-leverage portfolios are a lazy default. Vol-targeted (target ex-ante portfolio vol, scale gross exposure to hit it) typically improves Sharpe modestly and improves drawdown profile substantially.

### 8. Tail risk hedging module
Static OTM put overlays, VIX-based dynamic hedges, or trend-following overlays as a structural drag for crash insurance. Add as a portfolio-level decision in `research-risk-portfolio`.

### 9. Meta-strategy ("strategy of strategies")
Once you have N > 5 systematic strategies, the question stops being "is this strategy good" and becomes "which strategies should be alive right now and at what weight." This is its own modeling problem — typically a bandit / Thompson sampling formulation with a Brier-style track record per strategy. Mirrors the Cogito persona scoring loop, conceptually.

### 10. Live monitoring + alerting
Grafana dashboards on top of Postgres + Prometheus, with paging on:
- PSI > 0.25 on any input feature
- Daily PnL outside ±3σ
- Position drift from target weights > 2%
- Any kill criterion on a discretionary idea firing
- Any backtest gate failure on a promoted strategy

### 11. Strategy decay tracker
For every live strategy, automatically test whether the OOS Sharpe is still consistent with the in-sample Sharpe (Bailey-Lopez de Prado have a test for this). When the OOS regime shifts, the strategy goes to observation; if it stays there 60 days, it retires.

## P2 — Specialist additions

### 12. Options-aware portfolio construction
Greeks-budgeted positioning, vol surface modeling, vega/gamma constraints. Only relevant if you intend to trade options.

### 13. Futures roll handling
Continuous contracts with proper roll adjustment (panama, ratio, calendar). Most retail backtest engines do this wrong.

### 14. International markets + FX hedging
The same machinery extended to non-USD universes, with explicit hedge decisions per strategy.

### 15. Crypto microstructure
Funding rate signals, perp basis, on-chain flows. Free data; Coingecko + Binance + Glassnode-free-tier covers most of it.

### 16. Privacy / secrets / audit
Vault for secrets, key rotation policy, signed audit logs, immutable PnL ledger. Required if you ever want to demo this to anyone with money.

## P3 — Research questions worth setting up to answer

These aren't agents. They're experiments the platform should be designed to run cleanly:

1. Does the multi-LLM Council actually beat a single Claude-Opus prompt over 100 horizons? (Brier score race)
2. Does the discretionary sleeve add or destroy alpha vs. its own counterfactual (no human override)?
3. How quickly do OSAP factors decay when you train on pre-2020 data and test on 2020+?
4. What is the marginal value of each free data tier? (Run the same experiment with Tier 1 only, then Tier 1+2, etc.)
5. Cross-provider disagreement as a signal: do high-disagreement theses underperform consensus theses?

These are the questions a research platform exists to answer. Build the platform so they're cheap to run.
