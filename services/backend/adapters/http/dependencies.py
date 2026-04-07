"""Shared FastAPI dependencies for route handlers."""

from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_session(request: Request) -> AsyncGenerator[AsyncSession]:
    """Yield an async DB session from the app-level session factory."""
    async with request.app.state.session_factory() as session:
        yield session
