"""add_soft_delete_to_users

Revision ID: 2d0fcec3b06d
Revises: 9e4f2a1b8c7d
Create Date: 2025-10-30 16:40:21.000021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d0fcec3b06d'
down_revision: Union[str, None] = '9e4f2a1b8c7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add deleted_at column for soft deletes
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # Add index on deleted_at for efficient queries
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'])


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_users_deleted_at', table_name='users')

    # Remove column
    op.drop_column('users', 'deleted_at')
