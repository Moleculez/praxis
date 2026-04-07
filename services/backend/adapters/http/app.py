"""FastAPI application factory."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine

from services.backend.adapters.http.middleware import domain_error_handler
from services.backend.adapters.http.routes import experiments, health, hypotheses
from services.backend.config import get_settings
from services.backend.domain.errors import DomainError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings = get_settings()
    app.state.engine = create_async_engine(
        settings.database_url, echo=settings.debug
    )
    yield
    await app.state.engine.dispose()


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
    return app
