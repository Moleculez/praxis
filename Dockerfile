# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
RUN corepack enable && corepack prepare pnpm@9 --activate && pnpm install --frozen-lockfile
COPY apps/web/ apps/web/
RUN pnpm --filter @praxis/web build

# Stage 2: Production
FROM python:3.12-slim
WORKDIR /app

# Install Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[prod]" 2>/dev/null || pip install --no-cache-dir -e .

# Copy backend
COPY services/ services/
COPY migrations/ migrations/
COPY .claude/ .claude/

# Copy built frontend
COPY --from=frontend-builder /app/apps/web/.next apps/web/.next
COPY --from=frontend-builder /app/apps/web/public apps/web/public
COPY --from=frontend-builder /app/apps/web/package.json apps/web/package.json

# Create data directories
RUN mkdir -p data audit intel experiments hypotheses features labels portfolios

# Runtime
EXPOSE 8000
ENV HOST=0.0.0.0 PORT=8000 WORKERS=4

CMD ["sh", "-c", "uvicorn services.backend.main:app --host $HOST --port $PORT --workers $WORKERS"]
