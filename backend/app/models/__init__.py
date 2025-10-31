"""
Models package initialization.
Imports all models to ensure they're registered with SQLAlchemy.
"""
# First import Base to avoid circular imports
from app.core.database import Base
from .base import TimestampMixin, UUIDMixin

# Import models
from .user import User
from .user_session import UserSession
from .organization import Organization
from .user_organization import UserOrganization, OrganizationRole

__all__ = [
    'Base', 'TimestampMixin', 'UUIDMixin',
    'User', 'UserSession',
    'Organization', 'UserOrganization', 'OrganizationRole',
]