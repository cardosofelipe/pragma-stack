"""OAuth account model for linking external OAuth providers to users."""

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class OAuthAccount(Base, UUIDMixin, TimestampMixin):
    """
    Links OAuth provider accounts to users.

    Supports multiple OAuth providers per user (e.g., user can have both
    Google and GitHub connected). Each provider account is uniquely identified
    by (provider, provider_user_id).
    """

    __tablename__ = "oauth_accounts"

    # Link to user
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # OAuth provider identification
    provider = Column(
        String(50), nullable=False, index=True
    )  # google, github, microsoft
    provider_user_id = Column(String(255), nullable=False)  # Provider's unique user ID
    provider_email = Column(
        String(255), nullable=True, index=True
    )  # Email from provider (for reference)

    # Optional: store provider tokens for API access
    # TODO: Encrypt these at rest in production (requires key management infrastructure)
    access_token = Column(String(2048), nullable=True)
    refresh_token = Column(String(2048), nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    user = relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        # Each provider account can only be linked to one user
        UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
        # Index for finding all OAuth accounts for a user + provider
        Index("ix_oauth_accounts_user_provider", "user_id", "provider"),
    )

    def __repr__(self):
        return f"<OAuthAccount {self.provider}:{self.provider_user_id}>"
