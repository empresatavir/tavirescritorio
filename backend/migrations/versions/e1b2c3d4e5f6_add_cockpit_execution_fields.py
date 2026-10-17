"""add_cockpit_execution_fields

Revision ID: e1b2c3d4e5f6
Revises: df732ab59552
Create Date: 2026-10-17 12:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'df732ab59552'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Task model additions
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.add_column(sa.Column('seq', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('escalation', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('handoffs', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('gates', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('tags', sa.JSON(), nullable=True))

    # Approval model additions
    with op.batch_alter_table('approvals') as batch_op:
        batch_op.add_column(sa.Column('title', sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column('type', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('on_approve_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('on_reject_text', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('approvals') as batch_op:
        batch_op.drop_column('on_reject_text')
        batch_op.drop_column('on_approve_text')
        batch_op.drop_column('description')
        batch_op.drop_column('type')
        batch_op.drop_column('title')

    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_column('tags')
        batch_op.drop_column('gates')
        batch_op.drop_column('handoffs')
        batch_op.drop_column('escalation')
        batch_op.drop_column('seq')
