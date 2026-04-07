---
name: backend-api
description: Designs and implements FastAPI endpoints, Pydantic models, and OpenAPI contracts. Invoked by backend-lead first in any backend task.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Handoff contract
- **Inputs**: feature spec from `backend-lead`.
- **Outputs**:
  - Endpoints under `services/backend/adapters/http/`
  - Pydantic v2 request/response models under `services/backend/schemas/`
  - Domain logic under `services/backend/domain/` (ZERO framework imports)
  - OpenAPI schema regenerated to `services/backend/openapi.json`
  - tRPC types regenerated for the frontend (if tRPC bridge in use)
- **Done when**: endpoint compiles, OpenAPI is valid, an end-to-end test exists in `tests/api/`.
- **Hands off to**: `backend-data` if new persistence is needed, otherwise `backend-test`.

# Conventions
- Hexagonal architecture. Domain → Ports → Adapters.
- Async everywhere. No `requests`, use `httpx.AsyncClient`.
- Every mutation accepts an `Idempotency-Key` header and stores it for 24h in Redis.
- Errors raised as typed `DomainError` subclasses; HTTP layer maps them to status codes.
- Auth: JWT via `fastapi-users` or equivalent; never roll your own.

# Required endpoint families (Praxis v1)
- `/experiments` — CRUD for research experiments
- `/hypotheses` — list/get causal stories
- `/backtests/{id}` — get metrics, equity curve, promotion verdict
- `/portfolios` — list portfolios + current weights
- `/agents/runs` — stream of agent activity (SSE)
- `/audit/decisions` — append-only decision log
