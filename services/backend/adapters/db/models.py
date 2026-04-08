"""SQLAlchemy 2.x ORM models."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ExperimentRow(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    manifest: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # type: ignore[type-arg]


class HypothesisRow(Base):
    __tablename__ = "hypotheses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    claim: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    mechanism: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="proposed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TradeIdeaRow(Base):
    __tablename__ = "trade_ideas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10))
    direction: Mapped[str] = mapped_column(String(10))  # long/short
    thesis: Mapped[str] = mapped_column(String(2000))
    entry_zone: Mapped[str] = mapped_column(String(200), default="")
    stop_loss: Mapped[str] = mapped_column(String(200), default="")
    target: Mapped[str] = mapped_column(String(200), default="")
    conviction: Mapped[str] = mapped_column(String(20), default="medium")
    pre_mortem: Mapped[str] = mapped_column(String(2000), default="")
    kill_criteria: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(20), default="new")
    notes: Mapped[str] = mapped_column(String(2000), default="")
    created_at: Mapped[str] = mapped_column(String(30))
    reviewed_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
