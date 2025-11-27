from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """
    User model for authentication and profile data.

    Performance indexes (defined in migration 0002_add_performance_indexes.py):
    - ix_perf_users_email_lower: LOWER(email) WHERE deleted_at IS NULL
    - ix_perf_users_active: is_active WHERE deleted_at IS NULL
    """

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    # Nullable to support OAuth-only users who never set a password
    password_hash = Column(String(255), nullable=True)
    first_name = Column(String(100), nullable=False, default="user")
    last_name = Column(String(100), nullable=True)
    phone_number = Column(String(20))
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_superuser = Column(Boolean, default=False, nullable=False, index=True)
    preferences = Column(JSONB)
    locale = Column(String(10), nullable=True, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    user_organizations = relationship(
        "UserOrganization", back_populates="user", cascade="all, delete-orphan"
    )
    oauth_accounts = relationship(
        "OAuthAccount", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def has_password(self) -> bool:
        """Check if user can login with password (not OAuth-only)."""
        return self.password_hash is not None

    @property
    def can_remove_oauth(self) -> bool:
        """Check if user can safely remove an OAuth account link."""
        return self.has_password or len(self.oauth_accounts) > 1

    def __repr__(self):
        return f"<User {self.email}>"
