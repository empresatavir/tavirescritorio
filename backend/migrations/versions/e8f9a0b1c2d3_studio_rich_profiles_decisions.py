"""studio rich profiles, piece fields, decisions

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-10-20 02:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("profiles", schema=None) as batch_op:
        batch_op.add_column(sa.Column("handle", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("company", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("design_system", sa.JSON(), nullable=True))
        batch_op.add_column(
            sa.Column("cycle_goal", sa.Integer(), nullable=False, server_default="12")
        )
        batch_op.add_column(
            sa.Column("cycle_done", sa.Integer(), nullable=False, server_default="0")
        )

    with op.batch_alter_table("pieces", schema=None) as batch_op:
        batch_op.add_column(sa.Column("subtitle", sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column("cta", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("slides", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("progress", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("squad", sa.String(length=100), nullable=True))

    op.create_table(
        "studio_decisions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("profile_id", sa.String(length=36), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("run_id", sa.String(length=50), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("selected_option_id", sa.String(length=50), nullable=True),
        sa.Column("piece_id", sa.String(length=36), sa.ForeignKey("pieces.id"), nullable=True),
        sa.Column("waiting_label", sa.String(length=100), nullable=True),
        sa.Column("platform_label", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_studio_decisions_profile_id", "studio_decisions", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_studio_decisions_profile_id", table_name="studio_decisions")
    op.drop_table("studio_decisions")

    with op.batch_alter_table("pieces", schema=None) as batch_op:
        batch_op.drop_column("squad")
        batch_op.drop_column("progress")
        batch_op.drop_column("slides")
        batch_op.drop_column("cta")
        batch_op.drop_column("subtitle")

    with op.batch_alter_table("profiles", schema=None) as batch_op:
        batch_op.drop_column("cycle_done")
        batch_op.drop_column("cycle_goal")
        batch_op.drop_column("design_system")
        batch_op.drop_column("company")
        batch_op.drop_column("handle")
