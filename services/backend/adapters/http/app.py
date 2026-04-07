"""FastAPI application factory."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from services.backend.adapters.db.models import Base
from services.backend.adapters.http.middleware import domain_error_handler
from services.backend.adapters.http.routes import (
    audit,
    experiments,
    health,
    hypotheses,
    intelligence,
    live,
    portfolios,
)
from services.backend.config import get_settings
from services.backend.domain.errors import DomainError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=settings.debug)
    app.state.engine = engine
    app.state.session_factory = async_sessionmaker(engine, expire_on_commit=False)

    # Auto-create tables for SQLite dev mode (no Alembic needed)
    if settings.is_sqlite:
        Path("data").mkdir(exist_ok=True)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Praxis", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(DomainError, domain_error_handler)  # type: ignore[arg-type]
    app.include_router(health.router, tags=["health"])
    app.include_router(experiments.router, prefix="/experiments", tags=["experiments"])
    app.include_router(hypotheses.router, prefix="/hypotheses", tags=["hypotheses"])
    app.include_router(audit.router, prefix="/audit", tags=["audit"])
    app.include_router(portfolios.router, prefix="/portfolios", tags=["portfolios"])
    app.include_router(intelligence.router, prefix="/intelligence", tags=["intelligence"])
    app.include_router(live.router, prefix="/live", tags=["live"])
    return app
