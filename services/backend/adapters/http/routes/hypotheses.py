"""Hypothesis CRUD routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.adapters.db.repositories import SqlHypothesisRepository
from services.backend.adapters.http.dependencies import get_session
from services.backend.domain.models import Hypothesis
from services.backend.schemas.hypotheses import HypothesisCreate, HypothesisResponse

router = APIRouter()


def _to_response(hyp: Hypothesis) -> HypothesisResponse:
    return HypothesisResponse(
        id=hyp.id,
        claim=hyp.claim,
        mechanism=hyp.mechanism,
        status=hyp.status.value,
        created_at=hyp.created_at,
    )


@router.get("/")
async def list_hypotheses(
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[HypothesisResponse]:
    repo = SqlHypothesisRepository(session)
    hypotheses = await repo.list(offset=offset, limit=limit)
    return [_to_response(h) for h in hypotheses]


@router.get("/{hypothesis_id}")
async def get_hypothesis(
    hypothesis_id: str,
    session: AsyncSession = Depends(get_session),
) -> HypothesisResponse:
    repo = SqlHypothesisRepository(session)
    hyp = await repo.get(hypothesis_id)
    if hyp is None:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return _to_response(hyp)


@router.post("/", status_code=201)
async def create_hypothesis(
    body: HypothesisCreate,
    session: AsyncSession = Depends(get_session),
) -> HypothesisResponse:
    repo = SqlHypothesisRepository(session)
    hyp = Hypothesis(claim=body.claim, mechanism=body.mechanism)
    created = await repo.create(hyp)
    await session.commit()
    return _to_response(created)
