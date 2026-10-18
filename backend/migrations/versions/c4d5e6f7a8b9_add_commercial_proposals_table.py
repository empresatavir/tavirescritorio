"""add commercial proposals table

Revision ID: c4d5e6f7a8b9
Revises: a3b4c5d6e7f8
Create Date: 2026-10-18 01:12:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'proposals',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('num', sa.String(length=50), nullable=False),
        sa.Column('client', sa.String(length=200), nullable=False),
        sa.Column('stage', sa.String(length=20), server_default='progress', nullable=False),
        sa.Column('status', sa.String(length=200), server_default='Em elaboração', nullable=False),
        sa.Column('tone', sa.String(length=20), server_default='work', nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('validity', sa.String(length=50), nullable=True),
        sa.Column('deadline', sa.String(length=100), nullable=True),
        sa.Column('task_id', sa.String(length=36), nullable=True),
        sa.Column('project_id', sa.String(length=36), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('scope', sa.Text(), nullable=True),
        sa.Column('items', sa.JSON(), nullable=True),
        sa.Column('collected', sa.JSON(), nullable=True),
        sa.Column('changes', sa.JSON(), nullable=True),
        sa.Column('timeline', sa.JSON(), nullable=True),
        sa.Column('send_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('num')
    )


def downgrade() -> None:
    op.drop_table('proposals')
