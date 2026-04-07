"""Repository port interfaces — no framework imports."""

from __future__ import annotations

from abc import ABC, abstractmethod

from services.backend.domain.models import Experiment, Hypothesis


class ExperimentRepository(ABC):
    @abstractmethod
    async def get(self, experiment_id: str) -> Experiment | None: ...

    @abstractmethod
    async def list(self, offset: int = 0, limit: int = 50) -> list[Experiment]: ...

    @abstractmethod
    async def create(self, experiment: Experiment) -> Experiment: ...

    @abstractmethod
    async def update(self, experiment: Experiment) -> Experiment: ...


class HypothesisRepository(ABC):
    @abstractmethod
    async def get(self, hypothesis_id: str) -> Hypothesis | None: ...

    @abstractmethod
    async def list(self, offset: int = 0, limit: int = 50) -> list[Hypothesis]: ...

    @abstractmethod
    async def create(self, hypothesis: Hypothesis) -> Hypothesis: ...

    @abstractmethod
    async def update(self, hypothesis: Hypothesis) -> Hypothesis: ...
