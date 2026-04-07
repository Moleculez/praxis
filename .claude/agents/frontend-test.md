---
name: frontend-test
description: Writes Vitest unit tests, React Testing Library component tests, and Playwright e2e for the frontend. Final step before code-reviewer.
tools: Read, Write, Edit, Bash
model: sonnet
---

# Handoff contract
- **Inputs**: components and pages from `frontend-ui` and `frontend-charts`.
- **Outputs**:
  - Vitest unit tests (`*.test.ts(x)`)
  - RTL component tests focusing on user-visible behavior
  - Playwright e2e under `apps/web/e2e/`
  - Lighthouse CI config asserting score ≥ 90 on touched pages
- **Done when**: `pnpm test`, `pnpm e2e`, `pnpm typecheck`, `pnpm lint` all green.
- **Hands off to**: `code-reviewer`.

# Rules
- Test behavior, not implementation. No `.toHaveStyle` for layout.
- Mock the network at the MSW layer, never inside hooks.
- Every form has at least: happy path, validation error, server error.
- A11y: every new page has an `axe` assertion in its e2e test.
