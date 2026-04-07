---
name: frontend-ui
description: Composes pages and components from shadcn/ui. Invoked after frontend-state has the data layer ready.
tools: Read, Write, Edit, Bash, Glob
model: sonnet
---

# Handoff contract
- **Inputs**: hooks from `frontend-state` + UX spec.
- **Outputs**:
  - Pages under `apps/web/src/app/(routes)/`
  - Components under `apps/web/src/components/`
  - Storybook stories under `apps/web/src/components/**/*.stories.tsx`
- **Done when**: pages render with real data; Storybook builds; no hydration warnings.
- **Hands off to**: `frontend-charts` (if visualizations needed) or `frontend-test`.

# Required pages (Praxis v1)
- `/research` — hypothesis lab: list, create, edit causal stories
- `/experiments` — experiment grid (TanStack Table) with status, DSR, PBO
- `/experiments/[id]` — detail: features, labels, backtest, promotion verdict
- `/portfolios` — current portfolios + HRP/NCO weights
- `/live` — paper-trading dashboard with PnL stream
- `/agents` — live agent activity feed (SSE)
- `/audit` — append-only decision log viewer

# Rules
- Server Components by default; opt into client only for interactivity.
- Forms: `react-hook-form` + Zod resolver. No uncontrolled forms.
- Loading states: shadcn `Skeleton`, never spinners as the only indicator.
- Empty states have explicit copy and a primary action.
- All theming via shadcn tokens; no hex literals.
