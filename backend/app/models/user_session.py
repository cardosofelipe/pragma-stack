"""
User session model for tracking per-device authentication sessions.

This allows users to:
- See where they're logged in
- Logout from specific devices
- Manage their active sessions
"""

from datetime import UTC

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class UserSession(Base, UUIDMixin, TimestampMixin):
    """
    Tracks individual user sessions (per-device).

    Each time a user logs in from a device, a new session is created.
    Sessions are identified by the refresh token JTI (JWT ID).
    """

    __tablename__ = "user_sessions"

    # Foreign key to user
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Refresh token identifier (JWT ID from the refresh token)
    refresh_token_jti = Column(String(255), unique=True, nullable=False, index=True)

    # Device information
    device_name = Column(String(255), nullable=True)  # "iPhone 14", "Chrome on MacBook"
    device_id = Column(
        String(255), nullable=True
    )  # Persistent device identifier (from client)
    ip_address = Column(String(45), nullable=True)  # IPv4 (15 chars) or IPv6 (45 chars)
    user_agent = Column(String(500), nullable=True)  # Browser/app user agent

    # Session timing
    last_used_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Session state
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Geographic information (optional, can be populated from IP)
    location_city = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)

    # Relationship to user
    user = relationship("User", backref="sessions")

    # Composite indexes for performance (defined in migration)
    __table_args__ = (
        Index("ix_user_sessions_user_active", "user_id", "is_active"),
        Index("ix_user_sessions_jti_active", "refresh_token_jti", "is_active"),
    )

    def __repr__(self):
        return f"<UserSession {self.device_name} ({self.ip_address})>"

    @property
    def is_expired(self) -> bool:
        """Check if session has expired."""
        from datetime import datetime

        return self.expires_at < datetime.now(UTC)

    def to_dict(self):
        """Convert session to dictionary for serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "device_name": self.device_name,
            "device_id": self.device_id,
            "ip_address": self.ip_address,
            "last_used_at": self.last_used_at.isoformat()
            if self.last_used_at
            else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": self.is_active,
            "location_city": self.location_city,
            "location_country": self.location_country,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
