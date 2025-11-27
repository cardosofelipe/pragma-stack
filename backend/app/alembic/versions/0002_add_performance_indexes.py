"""Add performance indexes

Revision ID: 0002
Revises: 0001
Create Date: 2025-11-27

Performance indexes that Alembic cannot auto-detect:
- Functional indexes (LOWER expressions)
- Partial indexes (WHERE clauses)

These indexes use the ix_perf_ prefix and are excluded from autogenerate
via the include_object() function in env.py.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ==========================================================================
    # USERS TABLE - Performance indexes for authentication
    # ==========================================================================

    # Case-insensitive email lookup for login/registration
    # Query: SELECT * FROM users WHERE LOWER(email) = LOWER(:email) AND deleted_at IS NULL
    # Impact: High - every login, registration check, password reset
    op.create_index(
        "ix_perf_users_email_lower",
        "users",
        [sa.text("LOWER(email)")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # Active users lookup (non-soft-deleted)
    # Query: SELECT * FROM users WHERE deleted_at IS NULL AND ...
    # Impact: Medium - user listings, admin queries
    op.create_index(
        "ix_perf_users_active",
        "users",
        ["is_active"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ==========================================================================
    # ORGANIZATIONS TABLE - Performance indexes for multi-tenant lookups
    # ==========================================================================

    # Case-insensitive slug lookup for URL routing
    # Query: SELECT * FROM organizations WHERE LOWER(slug) = LOWER(:slug) AND is_active = true
    # Impact: Medium - every organization page load
    op.create_index(
        "ix_perf_organizations_slug_lower",
        "organizations",
        [sa.text("LOWER(slug)")],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )

    # ==========================================================================
    # USER SESSIONS TABLE - Performance indexes for session management
    # ==========================================================================

    # Expired session cleanup
    # Query: SELECT * FROM user_sessions WHERE expires_at < NOW() AND is_active = true
    # Impact: Medium - background cleanup jobs
    op.create_index(
        "ix_perf_user_sessions_expires",
        "user_sessions",
        ["expires_at"],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )

    # ==========================================================================
    # OAUTH PROVIDER TOKENS - Performance indexes for token management
    # ==========================================================================

    # Expired refresh token cleanup
    # Query: SELECT * FROM oauth_provider_refresh_tokens WHERE expires_at < NOW() AND revoked = false
    # Impact: Medium - OAuth token cleanup, validation
    op.create_index(
        "ix_perf_oauth_refresh_tokens_expires",
        "oauth_provider_refresh_tokens",
        ["expires_at"],
        unique=False,
        postgresql_where=sa.text("revoked = false"),
    )

    # ==========================================================================
    # OAUTH AUTHORIZATION CODES - Performance indexes for auth flow
    # ==========================================================================

    # Expired authorization code cleanup
    # Query: DELETE FROM oauth_authorization_codes WHERE expires_at < NOW() AND used = false
    # Impact: Low-Medium - OAuth cleanup jobs
    op.create_index(
        "ix_perf_oauth_auth_codes_expires",
        "oauth_authorization_codes",
        ["expires_at"],
        unique=False,
        postgresql_where=sa.text("used = false"),
    )


def downgrade() -> None:
    # Drop indexes in reverse order
    op.drop_index("ix_perf_oauth_auth_codes_expires", table_name="oauth_authorization_codes")
    op.drop_index("ix_perf_oauth_refresh_tokens_expires", table_name="oauth_provider_refresh_tokens")
    op.drop_index("ix_perf_user_sessions_expires", table_name="user_sessions")
    op.drop_index("ix_perf_organizations_slug_lower", table_name="organizations")
    op.drop_index("ix_perf_users_active", table_name="users")
    op.drop_index("ix_perf_users_email_lower", table_name="users")
