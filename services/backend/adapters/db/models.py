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


class OrderRow(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    side: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    quantity: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    price: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    order_type: Mapped[str] = mapped_column(String(10), nullable=False, default="market")
    time_in_force: Mapped[str] = mapped_column(String(10), nullable=False, default="day")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    timestamp: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    fill_price: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="mock")
    notes: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
