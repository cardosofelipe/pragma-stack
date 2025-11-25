"""Add OAuth provider models for MCP integration.

Revision ID: f8c3d2e1a4b5
Revises: d5a7b2c9e1f3
Create Date: 2025-01-15 10:00:00.000000

This migration adds tables for OAuth provider mode:
- oauth_authorization_codes: Temporary authorization codes
- oauth_provider_refresh_tokens: Long-lived refresh tokens
- oauth_consents: User consent records
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f8c3d2e1a4b5"
down_revision = "d5a7b2c9e1f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create oauth_authorization_codes table
    op.create_table(
        "oauth_authorization_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(128), nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("redirect_uri", sa.String(2048), nullable=False),
        sa.Column("scope", sa.String(1000), nullable=False, server_default=""),
        sa.Column("code_challenge", sa.String(128), nullable=True),
        sa.Column("code_challenge_method", sa.String(10), nullable=True),
        sa.Column("state", sa.String(256), nullable=True),
        sa.Column("nonce", sa.String(256), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["oauth_clients.client_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_oauth_authorization_codes_code",
        "oauth_authorization_codes",
        ["code"],
        unique=True,
    )
    op.create_index(
        "ix_oauth_authorization_codes_expires_at",
        "oauth_authorization_codes",
        ["expires_at"],
    )
    op.create_index(
        "ix_oauth_authorization_codes_client_user",
        "oauth_authorization_codes",
        ["client_id", "user_id"],
    )

    # Create oauth_provider_refresh_tokens table
    op.create_table(
        "oauth_provider_refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("jti", sa.String(64), nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope", sa.String(1000), nullable=False, server_default=""),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("device_info", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["oauth_clients.client_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_token_hash",
        "oauth_provider_refresh_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_jti",
        "oauth_provider_refresh_tokens",
        ["jti"],
        unique=True,
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_expires_at",
        "oauth_provider_refresh_tokens",
        ["expires_at"],
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_client_user",
        "oauth_provider_refresh_tokens",
        ["client_id", "user_id"],
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_user_revoked",
        "oauth_provider_refresh_tokens",
        ["user_id", "revoked"],
    )
    op.create_index(
        "ix_oauth_provider_refresh_tokens_revoked",
        "oauth_provider_refresh_tokens",
        ["revoked"],
    )

    # Create oauth_consents table
    op.create_table(
        "oauth_consents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("granted_scopes", sa.String(1000), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["oauth_clients.client_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_oauth_consents_user_client",
        "oauth_consents",
        ["user_id", "client_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("oauth_consents")
    op.drop_table("oauth_provider_refresh_tokens")
    op.drop_table("oauth_authorization_codes")
