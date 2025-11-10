"""add_performance_indexes

Revision ID: 1174fffbe3e4
Revises: fbf6318a8a36
Create Date: 2025-11-01 04:15:25.367010

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1174fffbe3e4"
down_revision: str | None = "fbf6318a8a36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add performance indexes for optimized queries."""

    # Index for session cleanup queries
    # Optimizes: DELETE WHERE is_active = FALSE AND expires_at < now AND created_at < cutoff
    op.create_index(
        "ix_user_sessions_cleanup",
        "user_sessions",
        ["is_active", "expires_at", "created_at"],
        unique=False,
        postgresql_where=sa.text("is_active = false"),
    )

    # Index for user search queries (basic trigram support without pg_trgm extension)
    # Optimizes: WHERE email ILIKE '%search%' OR first_name ILIKE '%search%'
    # Note: For better performance, consider enabling pg_trgm extension
    op.create_index(
        "ix_users_email_lower",
        "users",
        [sa.text("LOWER(email)")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_index(
        "ix_users_first_name_lower",
        "users",
        [sa.text("LOWER(first_name)")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_index(
        "ix_users_last_name_lower",
        "users",
        [sa.text("LOWER(last_name)")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # Index for organization search
    op.create_index(
        "ix_organizations_name_lower",
        "organizations",
        [sa.text("LOWER(name)")],
        unique=False,
    )


def downgrade() -> None:
    """Remove performance indexes."""

    # Drop indexes in reverse order
    op.drop_index("ix_organizations_name_lower", table_name="organizations")
    op.drop_index("ix_users_last_name_lower", table_name="users")
    op.drop_index("ix_users_first_name_lower", table_name="users")
    op.drop_index("ix_users_email_lower", table_name="users")
    op.drop_index("ix_user_sessions_cleanup", table_name="user_sessions")
