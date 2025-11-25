"""OAuth state model for CSRF protection during OAuth flows."""

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDMixin


class OAuthState(Base, UUIDMixin, TimestampMixin):
    """
    Temporary storage for OAuth state parameters.

    Prevents CSRF attacks during OAuth flows by storing a random state
    value that must match on callback. Also stores PKCE code_verifier
    for the Authorization Code flow with PKCE.

    These records are short-lived (10 minutes by default) and should
    be deleted after use or expiration.
    """

    __tablename__ = "oauth_states"

    # Random state parameter (CSRF protection)
    state = Column(String(255), unique=True, nullable=False, index=True)

    # PKCE code_verifier (used to generate code_challenge)
    code_verifier = Column(String(128), nullable=True)

    # OIDC nonce for ID token replay protection
    nonce = Column(String(255), nullable=True)

    # OAuth provider (google, github, etc.)
    provider = Column(String(50), nullable=False)

    # Original redirect URI (for callback validation)
    redirect_uri = Column(String(500), nullable=True)

    # User ID if this is an account linking flow (user is already logged in)
    user_id = Column(UUID(as_uuid=True), nullable=True)

    # Expiration time
    expires_at = Column(DateTime(timezone=True), nullable=False)

    def __repr__(self):
        return f"<OAuthState {self.state[:8]}... ({self.provider})>"
