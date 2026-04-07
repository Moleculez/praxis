"""Audit endpoint tests."""

import pytest


@pytest.mark.anyio
async def test_list_decisions(client):
    """GET /audit/decisions returns a list."""
    resp = await client.get("/audit/decisions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_list_incidents(client):
    """GET /audit/incidents returns a list."""
    resp = await client.get("/audit/incidents")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
