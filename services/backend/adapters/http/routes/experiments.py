"""Experiment CRUD routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.adapters.db.repositories import SqlExperimentRepository
from services.backend.adapters.http.dependencies import get_session
from services.backend.domain.models import Experiment, ExperimentStatus
from services.backend.schemas.common import StatusUpdate
from services.backend.schemas.experiments import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentUpdate,
)

router = APIRouter()


def _to_response(exp: Experiment) -> ExperimentResponse:
    return ExperimentResponse(
        id=exp.id,
        name=exp.name,
        status=exp.status.value,
        manifest=exp.manifest,
        created_at=exp.created_at,
    )


@router.get("/")
async def list_experiments(
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[ExperimentResponse]:
    repo = SqlExperimentRepository(session)
    experiments = await repo.list(offset=offset, limit=limit)
    return [_to_response(e) for e in experiments]


@router.get("/{experiment_id}")
async def get_experiment(
    experiment_id: str,
    session: AsyncSession = Depends(get_session),
) -> ExperimentResponse:
    repo = SqlExperimentRepository(session)
    exp = await repo.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return _to_response(exp)


@router.post("/", status_code=201)
async def create_experiment(
    body: ExperimentCreate,
    session: AsyncSession = Depends(get_session),
) -> ExperimentResponse:
    repo = SqlExperimentRepository(session)
    exp = Experiment(name=body.name, manifest=body.manifest)
    created = await repo.create(exp)
    await session.commit()
    return _to_response(created)


@router.put("/{experiment_id}")
async def update_experiment(
    experiment_id: str,
    body: ExperimentUpdate,
    session: AsyncSession = Depends(get_session),
) -> ExperimentResponse:
    repo = SqlExperimentRepository(session)
    exp = await repo.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if body.name is not None:
        exp.name = body.name
    if body.manifest is not None:
        exp.manifest = body.manifest
    updated = await repo.update(exp)
    await session.commit()
    return _to_response(updated)


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(
    experiment_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    repo = SqlExperimentRepository(session)
    deleted = await repo.delete(experiment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Experiment not found")
    await session.commit()


@router.patch("/{experiment_id}/status")
async def update_experiment_status(
    experiment_id: str,
    body: StatusUpdate,
    session: AsyncSession = Depends(get_session),
) -> ExperimentResponse:
    repo = SqlExperimentRepository(session)
    exp = await repo.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    try:
        exp.status = ExperimentStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status: {body.status}. "
            f"Valid values: {[s.value for s in ExperimentStatus]}",
        )
    updated = await repo.update(exp)
    await session.commit()
    return _to_response(updated)
