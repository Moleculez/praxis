"""Experiment CRUD routes."""

from fastapi import APIRouter

from services.backend.schemas.experiments import ExperimentCreate, ExperimentResponse

router = APIRouter()


@router.get("/")
async def list_experiments(offset: int = 0, limit: int = 50) -> list[ExperimentResponse]:
    # TODO: wire to repository via dependency injection
    return []


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str) -> ExperimentResponse:
    # TODO: wire to repository via dependency injection
    return ExperimentResponse(id=experiment_id, name="", status="draft", manifest={})


@router.post("/", status_code=201)
async def create_experiment(body: ExperimentCreate) -> ExperimentResponse:
    # TODO: wire to repository via dependency injection
    return ExperimentResponse(id="stub", name=body.name, status="draft", manifest=body.manifest)
