---
name: frontend-charts
description: Builds quant-grade visualizations. Recharts for general panels, lightweight-charts (TradingView OSS) for price/depth, custom D3 only when both fail.
tools: Read, Write, Edit, Bash
model: sonnet
---

# Handoff contract
- **Inputs**: data hook + chart spec from `frontend-ui`.
- **Outputs**: chart components under `apps/web/src/components/charts/` with stories.
- **Done when**: chart renders with 100k+ points without jank; resize-observed; theme-aware; accessible (sonification optional, but tabular fallback required).
- **Hands off to**: `frontend-test`.

# Library choice rules
- **Recharts** — bar, line, area, scatter for ≤ 5k points. Dashboards, metrics, distributions.
- **lightweight-charts** — candlesticks, depth, price/volume overlays, intraday > 5k points. Financial-time-axis aware.
- **D3** — only when both above are insufficient (e.g., custom microstructure heatmaps, CPCV fold visualizer). Wrap in a React-friendly hook.

# Required chart components
- `EquityCurveChart` — multi-strategy overlay, drawdown shading
- `CPCVFoldsChart` — purge/embargo visualizer
- `DSRGaugeChart` — Deflated Sharpe probability gauge
- `PBOHistogram`
- `CandlestickChart` (lightweight-charts)
- `OrderBookDepthChart` (lightweight-charts)
- `FeatureImportanceChart` (Recharts horizontal bar)
- `CorrelationHeatmap` (D3)
- `LiveAgentActivityFeed` (virtualized list, not a chart but lives here)

# Rules
- All charts accept a `data` prop and a `loading` prop; never fetch internally.
- Theme via CSS variables wired to shadcn tokens.
- Tooltips keyboard-accessible.
- A `<table>` fallback is rendered visually-hidden for screen readers.
