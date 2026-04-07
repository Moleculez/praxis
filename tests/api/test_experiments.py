"""Experiment endpoint tests."""

import pytest


@pytest.mark.anyio
async def test_create_experiment(client):
    """POST /experiments creates a draft experiment."""
    resp = await client.post(
        "/experiments/",
        json={"name": "test-exp", "manifest": {"strategy": "momentum"}},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-exp"
    assert data["status"] == "draft"
    assert data["manifest"]["strategy"] == "momentum"
    assert "id" in data


@pytest.mark.anyio
async def test_list_experiments(client):
    """GET /experiments returns a list including the created experiment."""
    await client.post("/experiments/", json={"name": "list-test"})
    resp = await client.get("/experiments/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.anyio
async def test_get_experiment(client):
    """GET /experiments/{id} returns a single experiment."""
    create_resp = await client.post(
        "/experiments/", json={"name": "get-test"}
    )
    exp_id = create_resp.json()["id"]
    resp = await client.get(f"/experiments/{exp_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "get-test"


@pytest.mark.anyio
async def test_delete_experiment(client):
    """DELETE /experiments/{id} removes the experiment."""
    create_resp = await client.post(
        "/experiments/", json={"name": "delete-test"}
    )
    exp_id = create_resp.json()["id"]
    resp = await client.delete(f"/experiments/{exp_id}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_update_experiment_status(client):
    """PATCH /experiments/{id}/status transitions to running."""
    create_resp = await client.post(
        "/experiments/", json={"name": "status-test"}
    )
    exp_id = create_resp.json()["id"]
    resp = await client.patch(
        f"/experiments/{exp_id}/status", json={"status": "running"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"
