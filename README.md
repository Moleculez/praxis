# Praxis

Multi-agent quantitative research and paper-trading platform with an integrated intelligence subsystem (Cogito).

## Prerequisites

- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@9 --activate`)
- [Docker](https://www.docker.com/) and Docker Compose

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Moleculez/praxis.git
cd praxis
cp .env.example .env          # edit with your API keys
pnpm install                  # installs turbo + frontend deps

# 2. Start infrastructure
pnpm run dev:infra            # Postgres, TimescaleDB, Redis, MinIO, MLflow

# 3. Install Python backend
pip install -e "services/backend[dev]"

# 4. Run database migrations
pnpm run migrate              # creates experiments + hypotheses tables

# 5. Start development
pnpm run dev                  # starts Next.js frontend via Turborepo
uvicorn services.backend.main:app --reload  # starts FastAPI backend
```

Or run everything via Docker:

```bash
cp .env.example .env
docker compose up             # starts infra + backend on port 8000
```

## Scripts

All scripts run from the repo root via `pnpm run <script>`.

### Turborepo (JS workspaces)

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start all workspace dev servers |
| `pnpm run build` | Build all workspaces (cached) |
| `pnpm run test` | Run frontend tests |
| `pnpm run lint` | Lint frontend |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run format` | Format frontend code |

### Python

| Script | Description |
|--------|-------------|
| `pnpm run test:py` | Run pytest |
| `pnpm run lint:py` | Lint with ruff |
| `pnpm run typecheck:py` | Type check with mypy --strict |
| `pnpm run format:py` | Format with ruff |

### Infrastructure

| Script | Description |
|--------|-------------|
| `pnpm run dev:infra` | Start Docker services (Postgres, TimescaleDB, Redis, MinIO, MLflow) |
| `pnpm run dev:infra:down` | Stop Docker services |
| `pnpm run migrate` | Run Alembic migrations |

## Project Structure

```
praxis/
  apps/web/                    # Next.js 15 + shadcn/ui frontend
    src/app/(routes)/          #   Pages: research, experiments, portfolios, live, intelligence, agents, audit
    src/components/            #   Nav sidebar, providers, UI components
    src/hooks/                 #   TanStack Query hooks (useExperiments, useHypotheses)
    src/lib/                   #   API client, query keys, utilities
    src/types/                 #   TypeScript types aligned with backend schemas
  services/
    backend/                   # FastAPI (hexagonal architecture)
      domain/                  #   Pure domain models, errors, ports, audit logging
      adapters/http/           #   FastAPI routes, middleware, dependency injection
      adapters/db/             #   Async SQLAlchemy ORM, repositories
      schemas/                 #   Pydantic v2 request/response models + VERIFIER_V1
      workers/                 #   Arq async job workers
      monitoring/              #   Health checks
    research/                  # Quant research pipeline
      data/                    #   Market data ingestion (OHLCV, FRED, EDGAR)
      features/                #   Feature engineering (Polars), dollar bars, microstructure
      labels/                  #   Triple-barrier + meta-labels (mlfinpy)
      models/                  #   LightGBM, sequence models, linear floor
      validation/              #   CPCV, Deflated Sharpe, PBO
      portfolios/              #   HRP + NCO allocation
      execution/               #   Paper trading only (Alpaca/IBKR)
    intelligence/              # Cogito subsystem
      crawlers/                #   EDGAR, FRED, news, Reddit, arXiv, transcripts
      validation/              #   Dedup (embeddings), claim extraction, corroboration
      council/                 #   Multi-LLM PhD council (6 personas, 5 providers)
      pm/                      #   Discretionary PM (pre-mortem, kill criteria)
  migrations/                  # Alembic (forward-only, async)
  tests/                       # pytest (API, research, intelligence schema tests)
  data/{raw,clean}/            # Market data (gitignored)
  experiments/                 # Backtest experiment artifacts
  hypotheses/                  # Research hypotheses
  features/registry.yaml       # Feature registry
  intel/                       # Intelligence outputs (briefs, trade ideas, scorecards)
  audit/                       # Append-only decision + incident logs (JSONL)
  .claude/agents/              # 33 Claude Code agent definitions
```

## API Endpoints

The FastAPI backend serves on port 8000:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/experiments` | List experiments |
| GET | `/experiments/{id}` | Get experiment by ID |
| POST | `/experiments` | Create experiment |
| GET | `/hypotheses` | List hypotheses |
| GET | `/hypotheses/{id}` | Get hypothesis by ID |
| POST | `/hypotheses` | Create hypothesis |

All mutations are logged to `audit/decisions.jsonl` via audit middleware.

## Infrastructure Services

Started via `pnpm run dev:infra` or `docker compose up`:

| Service | Port | Purpose |
|---------|------|---------|
| Postgres | 5432 | Metadata (experiments, hypotheses, audit) |
| TimescaleDB | 5433 | Time-series (bars, ticks, PnL) |
| Redis | 6379 | Cache + Arq job queue |
| MinIO | 9000 / 9001 (console) | S3-compatible artifact storage |
| MLflow | 5000 | Experiment tracking |
| Backend | 8000 | FastAPI application (Docker only) |

## Environment Variables

Copy `.env.example` to `.env` and fill in API keys:

- **Database/Redis/MinIO** -- defaults work with Docker Compose
- **LLM Gateway** -- `OPENROUTER_API_KEY` (recommended single gateway) or individual provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `XAI_API_KEY`)
- **Paper Trading** -- `ALPACA_API_KEY` + `ALPACA_SECRET_KEY` for paper trading via Alpaca

## Claude Code Agents

Praxis ships with 33 agent definitions in `.claude/agents/` organized into teams:

| Team | Agents | Lead |
|------|--------|------|
| Research | data-ingest, features, causal, labeling, model, backtest, risk-portfolio, execution, factor-library | research-lead |
| Backend | api, data, mlops, test | backend-lead |
| Frontend | state, ui, charts, test | frontend-lead |
| Intelligence | crawler, validator, phd-council, pm-discretionary | intel-lead |
| Cross-cutting | code-reviewer, llm-verifier | -- |
| Workflow | master-orchestrator, commit, commit-push-pr | -- |

The `master-orchestrator` routes requests to the appropriate team lead. Commit agents (`commit`, `commit-push-pr`) handle git operations without co-author attribution lines.

See `CLAUDE.md` for full conventions, hard rules, and the verifier schema.

## Key Conventions

- **No live trading** -- paper only, always
- **No factor without a causal story** -- `research-causal` must approve
- **Promotion gates** -- DSR >= 0.95, PBO <= 0.5, multi-LLM panel approval
- **Hexagonal backend** -- domain code has zero framework imports
- **Server Components by default** in the frontend
- **Tests are not optional**
- **Audit log is append-only** -- never truncate or overwrite
- **Cogito rules** -- never auto-execute discretionary trades, 20% sleeve cap, separate PnL books

## License

MIT -- see [LICENSE](LICENSE).
