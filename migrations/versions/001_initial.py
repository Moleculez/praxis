"""Initial tables: experiments, hypotheses.

Revision ID: 001
Revises:
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, default=""),
        sa.Column("status", sa.String(20), nullable=False, default="draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("manifest", sa.JSON, nullable=False),
    )
    op.create_table(
        "hypotheses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("claim", sa.String(1000), nullable=False, default=""),
        sa.Column("mechanism", sa.String(2000), nullable=False, default=""),
        sa.Column("status", sa.String(20), nullable=False, default="proposed"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("hypotheses")
    op.drop_table("experiments")
