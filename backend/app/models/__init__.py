"""
Models package initialization.
Imports all models to ensure they're registered with SQLAlchemy.
"""

# First import Base to avoid circular imports
from app.core.database import Base

from .base import TimestampMixin, UUIDMixin

# OAuth models
from .oauth_account import OAuthAccount
from .oauth_client import OAuthClient
from .oauth_state import OAuthState
from .organization import Organization

# Import models
from .user import User
from .user_organization import OrganizationRole, UserOrganization
from .user_session import UserSession

__all__ = [
    "Base",
    "OAuthAccount",
    "OAuthClient",
    "OAuthState",
    "Organization",
    "OrganizationRole",
    "TimestampMixin",
    "UUIDMixin",
    "User",
    "UserOrganization",
    "UserSession",
]
