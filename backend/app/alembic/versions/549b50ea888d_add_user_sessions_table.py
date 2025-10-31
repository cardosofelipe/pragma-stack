"""add_user_sessions_table

Revision ID: 549b50ea888d
Revises: b76c725fc3cf
Create Date: 2025-10-31 07:41:18.729544

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '549b50ea888d'
down_revision: Union[str, None] = 'b76c725fc3cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_sessions table for per-device session management
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('refresh_token_jti', sa.String(length=255), nullable=False),
        sa.Column('device_name', sa.String(length=255), nullable=True),
        sa.Column('device_id', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('location_city', sa.String(length=100), nullable=True),
        sa.Column('location_country', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create foreign key to users table
    op.create_foreign_key(
        'fk_user_sessions_user_id',
        'user_sessions',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Create indexes for performance
    # 1. Lookup session by refresh token JTI (most common query)
    op.create_index(
        'ix_user_sessions_jti',
        'user_sessions',
        ['refresh_token_jti'],
        unique=True
    )

    # 2. Lookup sessions by user ID
    op.create_index(
        'ix_user_sessions_user_id',
        'user_sessions',
        ['user_id']
    )

    # 3. Composite index for active sessions by user
    op.create_index(
        'ix_user_sessions_user_active',
        'user_sessions',
        ['user_id', 'is_active']
    )

    # 4. Index on expires_at for cleanup job
    op.create_index(
        'ix_user_sessions_expires_at',
        'user_sessions',
        ['expires_at']
    )

    # 5. Composite index for active session lookup by JTI
    op.create_index(
        'ix_user_sessions_jti_active',
        'user_sessions',
        ['refresh_token_jti', 'is_active']
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_user_sessions_jti_active', table_name='user_sessions')
    op.drop_index('ix_user_sessions_expires_at', table_name='user_sessions')
    op.drop_index('ix_user_sessions_user_active', table_name='user_sessions')
    op.drop_index('ix_user_sessions_user_id', table_name='user_sessions')
    op.drop_index('ix_user_sessions_jti', table_name='user_sessions')

    # Drop foreign key
    op.drop_constraint('fk_user_sessions_user_id', 'user_sessions', type_='foreignkey')

    # Drop table
    op.drop_table('user_sessions')
