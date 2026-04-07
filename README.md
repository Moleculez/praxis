# Praxis

Multi-agent quantitative research and paper-trading platform with an integrated intelligence subsystem (Cogito).

## Prerequisites

- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@9 --activate`)
- [Docker](https://www.docker.com/) (optional — only needed for production infra or Ollama)

## Quick Start

Zero infrastructure needed for dev — uses SQLite and local filesystem by default.

```bash
# 1. Clone and install
git clone https://github.com/Moleculez/praxis.git
cd praxis
cp .env.example .env          # defaults work out of the box
pnpm install                  # installs turbo + frontend deps
pip install -e "services/backend[dev]"

# 2. Start development (SQLite auto-creates tables on first run)
uvicorn services.backend.main:app --reload  # backend on :8000
pnpm run dev                                # frontend on :3000
```

### Production setup (Docker)

For the full stack with Postgres, TimescaleDB, Redis, MinIO, and MLflow:

```bash
# Uncomment the Postgres DATABASE_URL in .env, then:
docker compose --profile prod up -d    # starts all infra
pip install -e "services/backend[prod,dev]"
pnpm run migrate                       # Alembic migrations
uvicorn services.backend.main:app --reload
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

## Infrastructure

### Dev (default — no Docker needed)

| Component | Tech | Notes |
|-----------|------|-------|
| Database | SQLite | Auto-created at `data/praxis.db` |
| Artifacts | Local filesystem | `data/artifacts/` |
| Background jobs | Inline | No Redis needed |
| LLM | Ollama or API keys | Optional |

### Production (`--profile prod`)

| Service | Port | Purpose |
|---------|------|---------|
| Postgres | 5432 | Metadata (experiments, hypotheses, audit) |
| TimescaleDB | 5433 | Time-series (bars, ticks, PnL) |
| Redis | 6379 | Cache + Arq job queue |
| MinIO | 9000 / 9001 (console) | S3-compatible artifact storage |
| MLflow | 5000 | Experiment tracking |
| Ollama | 11434 | Local LLM (optional, `--profile local-llm`) |

## Local LLM (Ollama)

For development without API keys, run a local LLM via Ollama:

```bash
# Start Ollama alongside other services
docker compose --profile local-llm up -d

# Pull a model (first time only)
docker exec praxis-ollama-1 ollama pull llama3.1

# Enable local mode in .env
echo "USE_LOCAL_LLM=true" >> .env
```

The LLM gateway automatically routes through Ollama's OpenAI-compatible endpoint (`localhost:11434/v1`) when `USE_LOCAL_LLM=true`. The council config also supports `gateway: "ollama"` for local persona routing.

Recommended models for dev:
- `llama3.1` -- general purpose (8B, fast)
- `llama3.1:70b` -- higher quality (needs 40GB+ VRAM)
- `mistral` -- lighter alternative
- `codellama` -- code-focused tasks

## Environment Variables

Copy `.env.example` to `.env` and fill in API keys:

- **Database/Redis/MinIO** -- defaults work with Docker Compose
- **LLM Gateway** -- `OPENROUTER_API_KEY` (recommended single gateway) or individual provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `XAI_API_KEY`)
- **Local LLM** -- set `USE_LOCAL_LLM=true` and `OLLAMA_MODEL=llama3.1` to skip API keys entirely
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
