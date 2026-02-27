# app/repositories/__init__.py
"""Repository layer — all database access goes through these classes."""

from app.repositories.oauth_account import OAuthAccountRepository, oauth_account_repo
from app.repositories.oauth_authorization_code import (
    OAuthAuthorizationCodeRepository,
    oauth_authorization_code_repo,
)
from app.repositories.oauth_client import OAuthClientRepository, oauth_client_repo
from app.repositories.oauth_consent import OAuthConsentRepository, oauth_consent_repo
from app.repositories.oauth_provider_token import (
    OAuthProviderTokenRepository,
    oauth_provider_token_repo,
)
from app.repositories.oauth_state import OAuthStateRepository, oauth_state_repo
from app.repositories.organization import OrganizationRepository, organization_repo
from app.repositories.session import SessionRepository, session_repo
from app.repositories.user import UserRepository, user_repo

__all__ = [
    "UserRepository",
    "user_repo",
    "OrganizationRepository",
    "organization_repo",
    "SessionRepository",
    "session_repo",
    "OAuthAccountRepository",
    "oauth_account_repo",
    "OAuthAuthorizationCodeRepository",
    "oauth_authorization_code_repo",
    "OAuthClientRepository",
    "oauth_client_repo",
    "OAuthConsentRepository",
    "oauth_consent_repo",
    "OAuthProviderTokenRepository",
    "oauth_provider_token_repo",
    "OAuthStateRepository",
    "oauth_state_repo",
]
