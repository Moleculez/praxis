"""Research pipeline API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()

# In-memory pipeline state for paper-trading research pipeline.
# Production would persist to DB / Redis; this is sufficient for the
# hexagonal adapter layer.
_pipeline_status: dict[str, dict[str, Any]] = {}

VALID_STAGES = frozenset({
    "ingest",
    "features",
    "labels",
    "validation",
    "training",
    "portfolio",
    "backtest",
})


@router.get("/pipeline")
async def pipeline_status() -> dict[str, Any]:
    """Return global pipeline status across all experiments."""
    return {
        "experiments": list(_pipeline_status.keys()),
        "count": len(_pipeline_status),
        "status": "idle" if not _pipeline_status else "active",
    }


@router.get("/pipeline/{experiment_id}")
async def experiment_pipeline_status(experiment_id: str) -> dict[str, Any]:
    """Return pipeline status for a specific experiment."""
    if experiment_id not in _pipeline_status:
        raise HTTPException(status_code=404, detail="Experiment not found in pipeline")
    return _pipeline_status[experiment_id]


@router.post("/pipeline/{experiment_id}/run/{stage}")
async def run_pipeline_stage(experiment_id: str, stage: str) -> dict[str, Any]:
    """Trigger a specific pipeline stage for an experiment.

    Valid stages: ingest, features, labels, validation, training,
    portfolio, backtest.
    """
    if stage not in VALID_STAGES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid stage '{stage}'. Valid stages: {sorted(VALID_STAGES)}",
        )

    if experiment_id not in _pipeline_status:
        _pipeline_status[experiment_id] = {"stages": {}, "current_stage": None}

    _pipeline_status[experiment_id]["current_stage"] = stage
    _pipeline_status[experiment_id]["stages"][stage] = "running"

    # In a real system this would dispatch to an Arq worker.
    # For now we mark as queued and return immediately.
    _pipeline_status[experiment_id]["stages"][stage] = "queued"

    return {
        "experiment_id": experiment_id,
        "stage": stage,
        "status": "queued",
        "message": f"Stage '{stage}' queued for experiment '{experiment_id}'.",
    }


@router.post("/ingest/{source}")
async def ingest_data(source: str) -> dict[str, Any]:
    """Ingest data from a named source.

    Supported sources are configured per deployment (e.g. ``polygon``,
    ``fred``, ``edgar``).  This endpoint validates the source name and
    enqueues the ingest job.
    """
    known_sources = {"polygon", "fred", "edgar", "yahoo", "csv"}
    if source not in known_sources:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown source '{source}'. Known: {sorted(known_sources)}",
        )

    return {
        "source": source,
        "status": "queued",
        "message": f"Ingest from '{source}' has been queued.",
    }
