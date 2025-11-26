"""OAuth provider token models for OAuth provider mode."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class OAuthProviderRefreshToken(Base, UUIDMixin, TimestampMixin):
    """
    OAuth 2.0 Refresh Token for the OAuth provider.

    Refresh tokens are:
    - Opaque (stored as hash in DB, actual token given to client)
    - Long-lived (configurable, default 30 days)
    - Revocable (via revoked flag or deletion)
    - Bound to specific client, user, and scope

    Access tokens are JWTs and not stored in DB (self-contained).
    This model only tracks refresh tokens for revocation support.

    Security considerations:
    - Store token hash, not plaintext
    - Support token rotation (new refresh token on use)
    - Track last used time for security auditing
    - Support revocation by user, client, or admin
    """

    __tablename__ = "oauth_provider_refresh_tokens"

    # Hash of the refresh token (SHA-256)
    # We store hash, not plaintext, for security
    token_hash = Column(String(64), unique=True, nullable=False, index=True)

    # Unique token ID (JTI) - used in JWT access tokens to reference this refresh token
    jti = Column(String(64), unique=True, nullable=False, index=True)

    # Client that owns this token
    client_id = Column(
        String(64),
        ForeignKey("oauth_clients.client_id", ondelete="CASCADE"),
        nullable=False,
    )

    # User who authorized this token
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Granted scopes (space-separated)
    scope = Column(String(1000), nullable=False, default="")

    # Token expiration
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Revocation flag
    revoked = Column(Boolean, default=False, nullable=False, index=True)

    # Last used timestamp (for security auditing)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Device/session info (optional, for user visibility)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)

    # Relationships
    client = relationship("OAuthClient", backref="refresh_tokens")
    user = relationship("User", backref="oauth_provider_refresh_tokens")

    # Indexes
    __table_args__ = (
        Index("ix_oauth_provider_refresh_tokens_expires_at", "expires_at"),
        Index("ix_oauth_provider_refresh_tokens_client_user", "client_id", "user_id"),
        Index(
            "ix_oauth_provider_refresh_tokens_user_revoked",
            "user_id",
            "revoked",
        ),
    )

    def __repr__(self):
        status = "revoked" if self.revoked else "active"
        return f"<OAuthProviderRefreshToken {self.jti[:8]}... ({status})>"

    @property
    def is_expired(self) -> bool:
        """Check if the refresh token has expired."""
        # Use timezone-aware comparison (datetime.utcnow() is deprecated)
        now = datetime.now(UTC)
        expires_at = self.expires_at
        # Handle both timezone-aware and naive datetimes from DB
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return now > expires_at

    @property
    def is_valid(self) -> bool:
        """Check if the refresh token is valid (not revoked, not expired)."""
        return not self.revoked and not self.is_expired


class OAuthConsent(Base, UUIDMixin, TimestampMixin):
    """
    OAuth consent record - remembers user consent for a client.

    When a user grants consent to an OAuth client, we store the record
    so they don't have to re-consent on subsequent authorizations
    (unless scopes change).

    This enables a better UX - users only see consent screen once per client,
    unless the client requests additional scopes.
    """

    __tablename__ = "oauth_consents"

    # User who granted consent
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Client that received consent
    client_id = Column(
        String(64),
        ForeignKey("oauth_clients.client_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Granted scopes (space-separated)
    granted_scopes = Column(String(1000), nullable=False, default="")

    # Relationships
    client = relationship("OAuthClient", backref="consents")
    user = relationship("User", backref="oauth_consents")

    # Unique constraint: one consent record per user+client
    __table_args__ = (
        Index(
            "ix_oauth_consents_user_client",
            "user_id",
            "client_id",
            unique=True,
        ),
    )

    def __repr__(self):
        return f"<OAuthConsent user={self.user_id} client={self.client_id}>"

    def has_scopes(self, requested_scopes: list[str]) -> bool:
        """Check if all requested scopes are already granted."""
        granted = set(self.granted_scopes.split()) if self.granted_scopes else set()
        requested = set(requested_scopes)
        return requested.issubset(granted)
