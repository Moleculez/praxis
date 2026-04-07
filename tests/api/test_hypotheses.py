"""Hypothesis endpoint tests."""

import pytest


@pytest.mark.anyio
async def test_create_hypothesis(client):
    """POST /hypotheses creates a proposed hypothesis."""
    resp = await client.post(
        "/hypotheses/",
        json={
            "claim": "Momentum predicts returns",
            "mechanism": "Behavioral underreaction to news",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["claim"] == "Momentum predicts returns"
    assert data["mechanism"] == "Behavioral underreaction to news"
    assert data["status"] == "proposed"
    assert "id" in data


@pytest.mark.anyio
async def test_list_hypotheses(client):
    """GET /hypotheses returns a list including the created hypothesis."""
    await client.post(
        "/hypotheses/",
        json={"claim": "list-test", "mechanism": "test mechanism"},
    )
    resp = await client.get("/hypotheses/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.anyio
async def test_get_hypothesis(client):
    """GET /hypotheses/{id} returns a single hypothesis."""
    create_resp = await client.post(
        "/hypotheses/",
        json={"claim": "get-test", "mechanism": "test mechanism"},
    )
    hyp_id = create_resp.json()["id"]
    resp = await client.get(f"/hypotheses/{hyp_id}")
    assert resp.status_code == 200
    assert resp.json()["claim"] == "get-test"


@pytest.mark.anyio
async def test_delete_hypothesis(client):
    """DELETE /hypotheses/{id} removes the hypothesis."""
    create_resp = await client.post(
        "/hypotheses/",
        json={"claim": "delete-test", "mechanism": "test mechanism"},
    )
    hyp_id = create_resp.json()["id"]
    resp = await client.delete(f"/hypotheses/{hyp_id}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_update_hypothesis_status(client):
    """PATCH /hypotheses/{id}/status transitions to testing."""
    create_resp = await client.post(
        "/hypotheses/",
        json={"claim": "status-test", "mechanism": "test mechanism"},
    )
    hyp_id = create_resp.json()["id"]
    resp = await client.patch(
        f"/hypotheses/{hyp_id}/status", json={"status": "testing"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "testing"
