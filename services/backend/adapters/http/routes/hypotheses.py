"""Hypothesis CRUD routes."""

from fastapi import APIRouter

from services.backend.schemas.hypotheses import HypothesisCreate, HypothesisResponse

router = APIRouter()


@router.get("/")
async def list_hypotheses(offset: int = 0, limit: int = 50) -> list[HypothesisResponse]:
    # TODO: wire to repository via dependency injection
    return []


@router.get("/{hypothesis_id}")
async def get_hypothesis(hypothesis_id: str) -> HypothesisResponse:
    # TODO: wire to repository via dependency injection
    return HypothesisResponse(
        id=hypothesis_id, claim="", mechanism="", status="proposed"
    )


@router.post("/", status_code=201)
async def create_hypothesis(body: HypothesisCreate) -> HypothesisResponse:
    # TODO: wire to repository via dependency injection
    return HypothesisResponse(
        id="stub", claim=body.claim, mechanism=body.mechanism, status="proposed"
    )
