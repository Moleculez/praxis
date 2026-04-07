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
pnpm run migrate

# 5. Start development
pnpm run dev                  # starts Next.js frontend via Turborepo
uvicorn services.backend.main:app --reload  # starts FastAPI backend
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
  apps/web/                  # Next.js 15 + shadcn/ui frontend
  services/
    backend/                 # FastAPI (hexagonal architecture)
      domain/                #   Pure domain models, errors, ports
      adapters/http/         #   FastAPI routes + middleware
      adapters/db/           #   SQLAlchemy ORM + repositories
      schemas/               #   Pydantic v2 request/response models
      workers/               #   Arq async job workers
      monitoring/            #   Health checks
    research/                # Quant research pipeline
      data/                  #   Market data ingestion
      features/              #   Feature engineering (Polars)
      labels/                #   Triple-barrier + meta-labels
      models/                #   LightGBM, sequence models, linear floor
      validation/            #   CPCV, Deflated Sharpe, PBO
      portfolios/            #   HRP + NCO allocation
      execution/             #   Paper trading only
    intelligence/            # Cogito subsystem
      crawlers/              #   EDGAR, FRED, news, Reddit, arXiv, transcripts
      validation/            #   Dedup, claim extraction, corroboration
      council/               #   Multi-LLM PhD council (6 personas)
      pm/                    #   Discretionary PM
  migrations/                # Alembic (forward-only)
  tests/                     # pytest + Vitest + Playwright
  data/{raw,clean}/          # Market data (gitignored)
  experiments/               # Backtest experiment artifacts
  hypotheses/                # Research hypotheses
  features/registry.yaml     # Feature registry
  intel/                     # Intelligence outputs (briefs, trade ideas, scorecards)
  audit/                     # Append-only decision + incident logs
  .claude/agents/            # 33 Claude Code agent definitions
```

## Infrastructure Services

Started via `pnpm run dev:infra`:

| Service | Port | Purpose |
|---------|------|---------|
| Postgres | 5432 | Metadata (experiments, hypotheses, audit) |
| TimescaleDB | 5433 | Time-series (bars, ticks, PnL) |
| Redis | 6379 | Cache + Arq job queue |
| MinIO | 9000 / 9001 (console) | S3-compatible artifact storage |
| MLflow | 5000 | Experiment tracking |

## Environment Variables

Copy `.env.example` to `.env` and fill in API keys:

- **Database/Redis/MinIO** -- defaults work with Docker Compose
- **LLM Gateway** -- `OPENROUTER_API_KEY` (recommended single gateway) or individual provider keys
- **Paper Trading** -- `ALPACA_API_KEY` + `ALPACA_SECRET_KEY` for paper trading via Alpaca

## Claude Code Agents

Praxis ships with 33 agent definitions in `.claude/agents/` organized into 4 teams:

- **Research** (10 agents): data ingestion, features, causal stories, labeling, models, backtesting, risk/portfolio, execution
- **Backend** (5 agents): API, data layer, MLOps, testing
- **Frontend** (5 agents): state, UI, charts, testing
- **Intelligence / Cogito** (5 agents): crawlers, claim validation, PhD council, discretionary PM
- **Cross-cutting** (3 agents): code reviewer, multi-LLM verifier, factor library
- **Workflow** (3 agents): master orchestrator, commit, commit-push-pr
- **Leads** (2 additional): research-lead, intel-lead

The `master-orchestrator` routes requests to the appropriate team lead. Commit agents (`commit`, `commit-push-pr`) handle git operations without co-author attribution lines.

See `CLAUDE.md` for full conventions, hard rules, and the verifier schema.

## Key Conventions

- **No live trading** -- paper only, always
- **No factor without a causal story**
- **Promotion gates**: DSR >= 0.95, PBO <= 0.5, multi-LLM panel approval
- **Hexagonal backend**: domain code has zero framework imports
- **Server Components by default** in the frontend
- **Tests are not optional**
- **Audit log is append-only**

## License

Private.
