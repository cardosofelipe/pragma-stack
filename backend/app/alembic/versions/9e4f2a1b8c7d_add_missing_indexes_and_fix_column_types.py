"""Add missing indexes and fix column types

Revision ID: 9e4f2a1b8c7d
Revises: 38bf9e7e74b3
Create Date: 2025-10-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e4f2a1b8c7d'
down_revision: Union[str, None] = '38bf9e7e74b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing indexes for is_active and is_superuser
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    op.create_index(op.f('ix_users_is_superuser'), 'users', ['is_superuser'], unique=False)

    # Fix column types to match model definitions with explicit lengths
    op.alter_column('users', 'email',
               existing_type=sa.String(),
               type_=sa.String(length=255),
               nullable=False)

    op.alter_column('users', 'password_hash',
               existing_type=sa.String(),
               type_=sa.String(length=255),
               nullable=False)

    op.alter_column('users', 'first_name',
               existing_type=sa.String(),
               type_=sa.String(length=100),
               nullable=False,
               server_default='user')  # Add server default

    op.alter_column('users', 'last_name',
               existing_type=sa.String(),
               type_=sa.String(length=100),
               nullable=True)

    op.alter_column('users', 'phone_number',
               existing_type=sa.String(),
               type_=sa.String(length=20),
               nullable=True)


def downgrade() -> None:
    # Revert column types
    op.alter_column('users', 'phone_number',
               existing_type=sa.String(length=20),
               type_=sa.String(),
               nullable=True)

    op.alter_column('users', 'last_name',
               existing_type=sa.String(length=100),
               type_=sa.String(),
               nullable=True)

    op.alter_column('users', 'first_name',
               existing_type=sa.String(length=100),
               type_=sa.String(),
               nullable=False,
               server_default=None)  # Remove server default

    op.alter_column('users', 'password_hash',
               existing_type=sa.String(length=255),
               type_=sa.String(),
               nullable=False)

    op.alter_column('users', 'email',
               existing_type=sa.String(length=255),
               type_=sa.String(),
               nullable=False)

    # Drop indexes
    op.drop_index(op.f('ix_users_is_superuser'), table_name='users')
    op.drop_index(op.f('ix_users_is_active'), table_name='users')
