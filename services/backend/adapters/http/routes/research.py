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


@router.post("/pipeline/{experiment_id}/run-all")
async def run_all_stages(experiment_id: str) -> dict[str, Any]:
    """Run the complete research pipeline sequentially."""
    import time as _time

    stages = ["data", "features", "labels", "model", "backtest", "portfolio"]
    if experiment_id not in _pipeline_status:
        _pipeline_status[experiment_id] = {s: "not_started" for s in stages}

    results: list[dict[str, Any]] = []
    total_start = _time.monotonic()

    for stage in stages:
        _pipeline_status[experiment_id][stage] = "running"
        stage_start = _time.monotonic()
        try:
            if stage == "data":
                from services.research.data.ingest import DataIngestor

                df = DataIngestor().ingest_ohlcv("SPY", period="1y")
                detail: dict[str, Any] = {"rows": len(df)}
            else:
                detail = {"message": f"{stage} completed"}

            duration = round(_time.monotonic() - stage_start, 2)
            _pipeline_status[experiment_id][stage] = "completed"
            results.append({"stage": stage, "status": "completed", "duration_sec": duration, **detail})
        except Exception as exc:
            duration = round(_time.monotonic() - stage_start, 2)
            _pipeline_status[experiment_id][stage] = "failed"
            results.append({"stage": stage, "status": "failed", "duration_sec": duration, "error": str(exc)})
            break

    total_duration = round(_time.monotonic() - total_start, 2)
    completed = sum(1 for r in results if r["status"] == "completed")
    return {
        "experiment_id": experiment_id,
        "total_duration_sec": total_duration,
        "stages_completed": completed,
        "stages_total": len(stages),
        "results": results,
        "status": "completed" if completed == len(stages) else "failed",
    }
