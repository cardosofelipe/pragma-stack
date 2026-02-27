"""rename oauth account token fields drop encrypted suffix

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-27 01:03:18.869178

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("oauth_accounts", "access_token_encrypted", new_column_name="access_token")
    op.alter_column("oauth_accounts", "refresh_token_encrypted", new_column_name="refresh_token")


def downgrade() -> None:
    op.alter_column("oauth_accounts", "access_token", new_column_name="access_token_encrypted")
    op.alter_column("oauth_accounts", "refresh_token", new_column_name="refresh_token_encrypted")
