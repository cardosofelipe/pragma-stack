"""add oauth models

Revision ID: d5a7b2c9e1f3
Revises: c8e9f3a2d1b4
Create Date: 2025-11-24 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d5a7b2c9e1f3"
down_revision: str | None = "c8e9f3a2d1b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Make password_hash nullable on users table (for OAuth-only users)
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )

    # 2. Create oauth_accounts table (links OAuth providers to users)
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("provider_email", sa.String(length=255), nullable=True),
        sa.Column("access_token_encrypted", sa.String(length=2048), nullable=True),
        sa.Column("refresh_token_encrypted", sa.String(length=2048), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_oauth_accounts_user_id",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "provider", "provider_user_id", name="uq_oauth_provider_user"
        ),
    )

    # Create indexes for oauth_accounts
    op.create_index("ix_oauth_accounts_user_id", "oauth_accounts", ["user_id"])
    op.create_index("ix_oauth_accounts_provider", "oauth_accounts", ["provider"])
    op.create_index(
        "ix_oauth_accounts_provider_email", "oauth_accounts", ["provider_email"]
    )
    op.create_index(
        "ix_oauth_accounts_user_provider", "oauth_accounts", ["user_id", "provider"]
    )

    # 3. Create oauth_states table (CSRF protection during OAuth flow)
    op.create_table(
        "oauth_states",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("state", sa.String(length=255), nullable=False),
        sa.Column("code_verifier", sa.String(length=128), nullable=True),
        sa.Column("nonce", sa.String(length=255), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("redirect_uri", sa.String(length=500), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for oauth_states
    op.create_index("ix_oauth_states_state", "oauth_states", ["state"], unique=True)
    op.create_index("ix_oauth_states_expires_at", "oauth_states", ["expires_at"])

    # 4. Create oauth_clients table (OAuth provider mode - skeleton for MCP)
    op.create_table(
        "oauth_clients",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("client_secret_hash", sa.String(length=255), nullable=True),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column("client_description", sa.String(length=1000), nullable=True),
        sa.Column("client_type", sa.String(length=20), nullable=False),
        sa.Column("redirect_uris", postgresql.JSONB(), nullable=False),
        sa.Column("allowed_scopes", postgresql.JSONB(), nullable=False),
        sa.Column("access_token_lifetime", sa.String(length=10), nullable=False),
        sa.Column("refresh_token_lifetime", sa.String(length=10), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("owner_user_id", sa.UUID(), nullable=True),
        sa.Column("mcp_server_url", sa.String(length=2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            name="fk_oauth_clients_owner_user_id",
            ondelete="SET NULL",
        ),
    )

    # Create indexes for oauth_clients
    op.create_index(
        "ix_oauth_clients_client_id", "oauth_clients", ["client_id"], unique=True
    )
    op.create_index("ix_oauth_clients_is_active", "oauth_clients", ["is_active"])


def downgrade() -> None:
    # Drop oauth_clients table and indexes
    op.drop_index("ix_oauth_clients_is_active", table_name="oauth_clients")
    op.drop_index("ix_oauth_clients_client_id", table_name="oauth_clients")
    op.drop_table("oauth_clients")

    # Drop oauth_states table and indexes
    op.drop_index("ix_oauth_states_expires_at", table_name="oauth_states")
    op.drop_index("ix_oauth_states_state", table_name="oauth_states")
    op.drop_table("oauth_states")

    # Drop oauth_accounts table and indexes
    op.drop_index("ix_oauth_accounts_user_provider", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_provider_email", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_provider", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_user_id", table_name="oauth_accounts")
    op.drop_table("oauth_accounts")

    # Revert password_hash to non-nullable
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
