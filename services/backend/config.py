"""Application configuration via environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — SQLite by default for dev, Postgres for production
    database_url: str = "sqlite+aiosqlite:///data/praxis.db"
    timescale_url: str = ""  # Only needed in production

    # Redis — optional, background tasks degrade gracefully without it
    redis_url: str = ""

    # MinIO — optional, falls back to local filesystem (data/artifacts/)
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "praxis-artifacts"

    # MLflow — optional, experiment tracking disabled when empty
    mlflow_tracking_uri: str = ""

    # LLM Gateway
    openrouter_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_ai_api_key: str = ""
    xai_api_key: str = ""

    # Local LLM (Ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"
    use_local_llm: bool = False

    # Paper Trading
    alpaca_api_key: str = ""
    alpaca_secret_key: str = ""
    alpaca_base_url: str = "https://paper-api.alpaca.markets"

    # Interactive Brokers (Client Portal Gateway)
    ibkr_account_id: str = ""
    ibkr_gateway_url: str = "https://localhost:5000"

    # Broker selection
    broker: Literal["alpaca", "ibkr"] = "alpaca"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]

    # Debug
    debug: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def has_redis(self) -> bool:
        return bool(self.redis_url)

    @property
    def has_minio(self) -> bool:
        return bool(self.minio_endpoint)

    @property
    def has_mlflow(self) -> bool:
        return bool(self.mlflow_tracking_uri)

    @property
    def has_ibkr(self) -> bool:
        return bool(self.ibkr_account_id)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
