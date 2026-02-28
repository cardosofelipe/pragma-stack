"""OAuth authorization code model for OAuth provider mode."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class OAuthAuthorizationCode(Base, UUIDMixin, TimestampMixin):
    """
    OAuth 2.0 Authorization Code for the authorization code flow.

    Authorization codes are:
    - Single-use (marked as used after exchange)
    - Short-lived (10 minutes default)
    - Bound to specific client, user, redirect_uri
    - Support PKCE (code_challenge/code_challenge_method)

    Security considerations:
    - Code must be cryptographically random (64 chars, URL-safe)
    - Must validate redirect_uri matches exactly
    - Must verify PKCE code_verifier for public clients
    - Must be consumed within expiration time

    Performance indexes (defined in migration 0002_add_performance_indexes.py):
    - ix_perf_oauth_auth_codes_expires: expires_at WHERE used = false
    """

    __tablename__ = "oauth_authorization_codes"

    # The authorization code (cryptographically random, URL-safe)
    code = Column(String(128), unique=True, nullable=False, index=True)

    # Client that requested the code
    client_id = Column(
        String(64),
        ForeignKey("oauth_clients.client_id", ondelete="CASCADE"),
        nullable=False,
    )

    # User who authorized the request
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Redirect URI (must match exactly on token exchange)
    redirect_uri = Column(String(2048), nullable=False)

    # Granted scopes (space-separated)
    scope = Column(String(1000), nullable=False, default="")

    # PKCE support (required for public clients)
    code_challenge = Column(String(128), nullable=True)
    code_challenge_method = Column(String(10), nullable=True)  # "S256" or "plain"

    # State parameter (for CSRF protection, returned to client)
    state = Column(String(256), nullable=True)

    # Nonce (for OpenID Connect, included in ID token)
    nonce = Column(String(256), nullable=True)

    # Expiration (codes are short-lived, typically 10 minutes)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Single-use flag (set to True after successful exchange)
    used = Column(Boolean, default=False, nullable=False)

    # Relationships
    client = relationship("OAuthClient", backref="authorization_codes")
    user = relationship("User", backref="oauth_authorization_codes")

    # Indexes for efficient cleanup queries
    __table_args__ = (
        Index("ix_oauth_authorization_codes_expires_at", "expires_at"),
        Index("ix_oauth_authorization_codes_client_user", "client_id", "user_id"),
    )

    def __repr__(self):
        return f"<OAuthAuthorizationCode {self.code[:8]}... for {self.client_id}>"

    @property
    def is_expired(self) -> bool:
        """Check if the authorization code has expired."""
        # Use timezone-aware comparison (datetime.utcnow() is deprecated)
        now = datetime.now(UTC)
        expires_at = self.expires_at
        # Handle both timezone-aware and naive datetimes from DB
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return bool(now > expires_at)

    @property
    def is_valid(self) -> bool:
        """Check if the authorization code is valid (not used, not expired)."""
        return not self.used and not self.is_expired
