"""add_agent_soul_and_chat_models

Revision ID: f2a3b4c5d6e7
Revises: e1b2c3d4e5f6
Create Date: 2026-10-17 13:34:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Expand agents table
    with op.batch_alter_table('agents') as batch_op:
        batch_op.add_column(sa.Column('soul_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('total_jobs', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('total_cost', sa.Float(), server_default='0.0', nullable=False))
        batch_op.add_column(sa.Column('avatar_color', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('initials', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('last_run', sa.String(length=50), nullable=True))

    # 2. Create chat_conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('agent_id', sa.String(length=36), sa.ForeignKey('agents.id'), nullable=False),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    )

    # 3. Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('chat_conversations.id'), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('meta', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')

    with op.batch_alter_table('agents') as batch_op:
        batch_op.drop_column('last_run')
        batch_op.drop_column('initials')
        batch_op.drop_column('avatar_color')
        batch_op.drop_column('total_cost')
        batch_op.drop_column('total_jobs')
        batch_op.drop_column('soul_text')
