# Praxis

Multi-agent quantitative research and paper-trading platform with an integrated intelligence subsystem (Cogito).

## Prerequisites

- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@9 --activate`)
- [Docker](https://www.docker.com/) (optional -- only for production infra or local LLM)

## Quick Start

No Docker or external services needed. SQLite and local filesystem by default.

```bash
git clone https://github.com/Moleculez/praxis.git
cd praxis
cp .env.example .env
pnpm install
pip install -e "services/backend[dev]"

# Start backend (auto-creates SQLite DB + tables)
uvicorn services.backend.main:app --reload    # http://localhost:8000

# Start frontend (separate terminal)
pnpm run dev                                   # http://localhost:3000
```

## Dev vs Production

| | Dev (default) | Production |
|-|---------------|------------|
| **Database** | SQLite (`data/praxis.db`) | Postgres + TimescaleDB |
| **Cache/Queue** | None (inline) | Redis + Arq |
| **Artifacts** | Local filesystem | MinIO (S3) |
| **Tracking** | Disabled | MLflow |
| **LLM** | Ollama or API keys | OpenRouter gateway |
| **Setup** | `pip install` + `uvicorn` | `docker compose --profile prod up` |

### Production setup

```bash
# Edit .env: uncomment DATABASE_URL=postgresql+asyncpg://...
docker compose --profile prod up -d
pip install -e "services/backend[prod,dev]"
pnpm run migrate
uvicorn services.backend.main:app --reload
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start frontend dev server (Turborepo) |
| `pnpm run build` | Build frontend (cached) |
| `pnpm run test` | Run frontend tests |
| `pnpm run lint` | Lint frontend |
| `pnpm run typecheck` | TypeScript type check |
| `pnpm run test:py` | Run pytest |
| `pnpm run lint:py` | Lint Python with ruff |
| `pnpm run typecheck:py` | Type check Python with mypy |
| `pnpm run format:py` | Format Python with ruff |
| `pnpm run dev:infra` | Start Docker infra (prod profile) |
| `pnpm run dev:infra:down` | Stop Docker infra |
| `pnpm run migrate` | Run Alembic migrations (Postgres only) |

## Project Structure

```
praxis/
  apps/web/                    # Next.js 15 + shadcn/ui frontend
    src/app/(routes)/          #   research, experiments, portfolios, live, intelligence, agents, audit
    src/components/            #   Nav sidebar, providers
    src/hooks/                 #   TanStack Query hooks
    src/lib/                   #   API client, query keys, cn()
    src/types/                 #   TypeScript types (aligned with backend)
  services/
    backend/                   # FastAPI (hexagonal architecture)
      domain/                  #   Models, errors, ports, audit logging (zero framework imports)
      adapters/http/           #   Routes, middleware, dependency injection
      adapters/db/             #   SQLAlchemy ORM + repositories (SQLite or Postgres)
      schemas/                 #   Pydantic v2 models + VERIFIER_V1
      workers/                 #   Background tasks (optional Redis/Arq)
    research/                  # Quant research pipeline
      data/                    #   Data ingestion (OHLCV, FRED, EDGAR)
      features/                #   Feature engineering (Polars)
      labels/                  #   Triple-barrier + meta-labels
      models/                  #   LightGBM, sequence models, linear floor
      validation/              #   CPCV, Deflated Sharpe, PBO
      portfolios/              #   HRP + NCO allocation
      execution/               #   Paper trading only
    intelligence/              # Cogito subsystem
      crawlers/                #   EDGAR, FRED, news, Reddit, arXiv, transcripts
      validation/              #   Dedup, claim extraction, corroboration
      council/                 #   Multi-LLM PhD council (6 personas)
      pm/                      #   Discretionary PM
  migrations/                  # Alembic (Postgres only, forward-only)
  tests/                       # pytest + Vitest
  data/                        # SQLite DB, raw/clean data, artifacts (gitignored)
  audit/                       # Append-only JSONL logs
  .claude/agents/              # 33 Claude Code agent definitions
```

## API

Backend serves on `http://localhost:8000`. All mutations logged to `audit/decisions.jsonl`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/experiments` | List experiments |
| GET | `/experiments/{id}` | Get experiment |
| POST | `/experiments` | Create experiment |
| GET | `/hypotheses` | List hypotheses |
| GET | `/hypotheses/{id}` | Get hypothesis |
| POST | `/hypotheses` | Create hypothesis |

## Local LLM (Ollama)

For development without API keys:

```bash
docker compose --profile local-llm up -d
docker exec praxis-ollama-1 ollama pull llama3.1
```

Then in `.env`:
```
USE_LOCAL_LLM=true
OLLAMA_MODEL=llama3.1
```

The LLM gateway routes through Ollama's OpenAI-compatible endpoint at `localhost:11434/v1`.

Recommended models: `llama3.1` (8B, fast), `mistral`, `codellama`.

## Environment Variables

Copy `.env.example` to `.env`. Defaults work for dev -- no keys needed to start.

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `sqlite+aiosqlite:///data/praxis.db` | Swap for Postgres in prod |
| `REDIS_URL` | *(empty)* | Optional, enables Arq workers |
| `MINIO_ENDPOINT` | *(empty)* | Optional, enables S3 artifacts |
| `MLFLOW_TRACKING_URI` | *(empty)* | Optional, enables experiment tracking |
| `OPENROUTER_API_KEY` | *(empty)* | One key for all LLM providers |
| `USE_LOCAL_LLM` | `false` | Route LLM calls through Ollama |
| `OLLAMA_MODEL` | `llama3.1` | Model for local inference |
| `ALPACA_API_KEY` | *(empty)* | Paper trading |

## Claude Code Agents

33 agent definitions in `.claude/agents/`, organized into teams:

| Team | Agents | Lead |
|------|--------|------|
| Research | data-ingest, features, causal, labeling, model, backtest, risk-portfolio, execution, factor-library | research-lead |
| Backend | api, data, mlops, test | backend-lead |
| Frontend | state, ui, charts, test | frontend-lead |
| Intelligence | crawler, validator, phd-council, pm-discretionary | intel-lead |
| Cross-cutting | code-reviewer, llm-verifier | -- |
| Workflow | master-orchestrator, commit, commit-push-pr | -- |

`master-orchestrator` routes requests to team leads. `commit` and `commit-push-pr` handle git without co-author lines.

See `CLAUDE.md` for conventions, hard rules, and verifier schema.

## Key Rules

- **No live trading** -- paper only, always
- **No factor without a causal story**
- **Promotion gates** -- DSR >= 0.95, PBO <= 0.5, multi-LLM approval
- **Hexagonal backend** -- domain has zero framework imports
- **Server Components by default** in frontend
- **Tests are not optional**
- **Audit log is append-only**
- **Cogito** -- never auto-execute trades, 20% sleeve cap, separate PnL books

## License

MIT -- see [LICENSE](LICENSE).
