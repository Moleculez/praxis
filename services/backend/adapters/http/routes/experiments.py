"""Experiment CRUD routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.adapters.db.repositories import SqlExperimentRepository
from services.backend.adapters.http.dependencies import get_session
from services.backend.domain.models import Experiment
from services.backend.schemas.experiments import ExperimentCreate, ExperimentResponse

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
