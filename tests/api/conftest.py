"""API test fixtures."""

import pytest
from httpx import ASGITransport, AsyncClient

from services.backend.adapters.http.app import create_app


@pytest.fixture
def app():
    """Create test FastAPI application."""
    return create_app()


@pytest.fixture
async def client(app):
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
