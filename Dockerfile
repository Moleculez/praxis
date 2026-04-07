FROM python:3.12-slim AS base

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python deps
COPY services/backend/pyproject.toml services/backend/
COPY services/__init__.py services/
RUN pip install --no-cache-dir -e services/backend

# Copy application code
COPY services/ services/
COPY migrations/ migrations/

EXPOSE 8000

CMD ["uvicorn", "services.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
