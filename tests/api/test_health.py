"""Health endpoint tests."""

import pytest


@pytest.mark.anyio
async def test_health_returns_ok(client):
    """GET /health returns 200 with status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
