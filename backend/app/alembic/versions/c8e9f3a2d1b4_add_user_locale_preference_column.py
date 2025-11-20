"""add user locale preference column

Revision ID: c8e9f3a2d1b4
Revises: 1174fffbe3e4
Create Date: 2025-11-17 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c8e9f3a2d1b4"
down_revision: str | None = "1174fffbe3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add locale column to users table
    # VARCHAR(10) supports BCP 47 format (e.g., "en", "it", "en-US", "it-IT")
    # Nullable: NULL means "not set yet", will use Accept-Language header fallback
    # Indexed: For analytics queries and filtering by locale
    op.add_column("users", sa.Column("locale", sa.String(length=10), nullable=True))

    # Create index on locale column for performance
    op.create_index(
        "ix_users_locale",
        "users",
        ["locale"],
    )


def downgrade() -> None:
    # Remove locale index and column
    op.drop_index("ix_users_locale", table_name="users")
    op.drop_column("users", "locale")
