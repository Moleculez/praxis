"""Concrete repository implementations backed by SQLAlchemy."""

from __future__ import annotations

from datetime import UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.adapters.db.models import ExperimentRow, HypothesisRow
from services.backend.domain.models import (
    Experiment,
    ExperimentStatus,
    Hypothesis,
    HypothesisStatus,
)
from services.backend.domain.ports import ExperimentRepository, HypothesisRepository


class SqlExperimentRepository(ExperimentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, experiment_id: str) -> Experiment | None:
        row = await self._session.get(ExperimentRow, experiment_id)
        if row is None:
            return None
        return self._to_domain(row)

    async def list(self, offset: int = 0, limit: int = 50) -> list[Experiment]:
        stmt = select(ExperimentRow).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return [self._to_domain(r) for r in result.scalars()]

    async def create(self, experiment: Experiment) -> Experiment:
        row = ExperimentRow(
            id=experiment.id,
            name=experiment.name,
            status=experiment.status.value,
            created_at=experiment.created_at,
            manifest=experiment.manifest,
        )
        self._session.add(row)
        await self._session.flush()
        return experiment

    async def update(self, experiment: Experiment) -> Experiment:
        row = await self._session.get(ExperimentRow, experiment.id)
        if row is not None:
            row.name = experiment.name
            row.status = experiment.status.value
            row.manifest = experiment.manifest
            await self._session.flush()
        return experiment

    @staticmethod
    def _to_domain(row: ExperimentRow) -> Experiment:
        return Experiment(
            id=row.id,
            name=row.name,
            status=ExperimentStatus(row.status),
            created_at=row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=UTC),
            manifest=row.manifest,
        )


class SqlHypothesisRepository(HypothesisRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, hypothesis_id: str) -> Hypothesis | None:
        row = await self._session.get(HypothesisRow, hypothesis_id)
        if row is None:
            return None
        return self._to_domain(row)

    async def list(self, offset: int = 0, limit: int = 50) -> list[Hypothesis]:
        stmt = select(HypothesisRow).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return [self._to_domain(r) for r in result.scalars()]

    async def create(self, hypothesis: Hypothesis) -> Hypothesis:
        row = HypothesisRow(
            id=hypothesis.id,
            claim=hypothesis.claim,
            mechanism=hypothesis.mechanism,
            status=hypothesis.status.value,
            created_at=hypothesis.created_at,
        )
        self._session.add(row)
        await self._session.flush()
        return hypothesis

    async def update(self, hypothesis: Hypothesis) -> Hypothesis:
        row = await self._session.get(HypothesisRow, hypothesis.id)
        if row is not None:
            row.claim = hypothesis.claim
            row.mechanism = hypothesis.mechanism
            row.status = hypothesis.status.value
            await self._session.flush()
        return hypothesis

    @staticmethod
    def _to_domain(row: HypothesisRow) -> Hypothesis:
        created = row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=UTC)
        return Hypothesis(
            id=row.id,
            claim=row.claim,
            mechanism=row.mechanism,
            status=HypothesisStatus(row.status),
            created_at=created,
        )
