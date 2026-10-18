"""add factory and studio production fields

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-10-17 17:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update engineering_templates with mesas
    with op.batch_alter_table('engineering_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mesas', sa.JSON(), nullable=True))

    # 2. Update projects with factory pipeline fields
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('template_code', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('stages_done', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('total_stages', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('stack', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('goal', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('audience', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('scope_items', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('pendencies', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('kanban_cards', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('files', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('keys', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('event_log', sa.JSON(), nullable=True))

    # 3. Update profiles with studio styling and social fields
    with op.batch_alter_table('profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('niche', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('audience', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('context', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('color', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('initials', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('networks', sa.JSON(), nullable=True))

    # 4. Update pieces with production workflow fields
    with op.batch_alter_table('pieces', schema=None) as batch_op:
        batch_op.add_column(sa.Column('num', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('net', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('needs', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('script', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('caption', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('tags', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('images', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('timeline', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('pieces', schema=None) as batch_op:
        batch_op.drop_column('timeline')
        batch_op.drop_column('images')
        batch_op.drop_column('tags')
        batch_op.drop_column('caption')
        batch_op.drop_column('script')
        batch_op.drop_column('needs')
        batch_op.drop_column('net')
        batch_op.drop_column('num')

    with op.batch_alter_table('profiles', schema=None) as batch_op:
        batch_op.drop_column('networks')
        batch_op.drop_column('initials')
        batch_op.drop_column('color')
        batch_op.drop_column('context')
        batch_op.drop_column('audience')
        batch_op.drop_column('niche')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('event_log')
        batch_op.drop_column('keys')
        batch_op.drop_column('files')
        batch_op.drop_column('kanban_cards')
        batch_op.drop_column('pendencies')
        batch_op.drop_column('scope_items')
        batch_op.drop_column('audience')
        batch_op.drop_column('goal')
        batch_op.drop_column('stack')
        batch_op.drop_column('total_stages')
        batch_op.drop_column('stages_done')
        batch_op.drop_column('template_code')
        batch_op.drop_column('company')

    with op.batch_alter_table('engineering_templates', schema=None) as batch_op:
        batch_op.drop_column('mesas')
