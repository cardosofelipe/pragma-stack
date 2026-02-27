# app/api/dependencies/services.py
"""FastAPI dependency functions for service singletons."""

from app.services import oauth_provider_service
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService
from app.services.organization_service import OrganizationService, organization_service
from app.services.session_service import SessionService, session_service
from app.services.user_service import UserService, user_service


def get_auth_service() -> AuthService:
    """Return the AuthService singleton for dependency injection."""
    from app.services.auth_service import AuthService as _AuthService

    return _AuthService()


def get_user_service() -> UserService:
    """Return the UserService singleton for dependency injection."""
    return user_service


def get_organization_service() -> OrganizationService:
    """Return the OrganizationService singleton for dependency injection."""
    return organization_service


def get_session_service() -> SessionService:
    """Return the SessionService singleton for dependency injection."""
    return session_service


def get_oauth_service() -> OAuthService:
    """Return OAuthService for dependency injection."""
    return OAuthService()


def get_oauth_provider_service():
    """Return the oauth_provider_service module for dependency injection."""
    return oauth_provider_service
