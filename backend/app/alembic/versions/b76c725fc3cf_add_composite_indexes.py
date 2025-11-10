"""add_composite_indexes

Revision ID: b76c725fc3cf
Revises: 2d0fcec3b06d
Create Date: 2025-10-30 16:41:33.273135

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b76c725fc3cf"
down_revision: str | None = "2d0fcec3b06d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add composite indexes for common query patterns

    # Composite index for filtering active users by role
    op.create_index(
        "ix_users_active_superuser",
        "users",
        ["is_active", "is_superuser"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # Composite index for sorting active users by creation date
    op.create_index(
        "ix_users_active_created",
        "users",
        ["is_active", "created_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # Composite index for email lookup of non-deleted users
    op.create_index("ix_users_email_not_deleted", "users", ["email", "deleted_at"])


def downgrade() -> None:
    # Remove composite indexes
    op.drop_index("ix_users_email_not_deleted", table_name="users")
    op.drop_index("ix_users_active_created", table_name="users")
    op.drop_index("ix_users_active_superuser", table_name="users")
