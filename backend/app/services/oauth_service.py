"""
OAuth Service for handling social authentication flows.

Supports:
- Google OAuth (OpenID Connect)
- GitHub OAuth

Features:
- PKCE support for public clients
- State parameter for CSRF protection
- Auto-linking by email (configurable)
- Account linking for existing users
"""

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import TypedDict, cast
from uuid import UUID

from authlib.integrations.httpx_client import AsyncOAuth2Client
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.crud import oauth_account, oauth_state
from app.models.user import User
from app.schemas.oauth import (
    OAuthAccountCreate,
    OAuthCallbackResponse,
    OAuthProviderInfo,
    OAuthProvidersResponse,
    OAuthStateCreate,
)

logger = logging.getLogger(__name__)


class OAuthProviderConfig(TypedDict, total=False):
    """Type definition for OAuth provider configuration."""

    name: str
    icon: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    email_url: str  # Optional, GitHub-only
    scopes: list[str]
    supports_pkce: bool


# Provider configurations
OAUTH_PROVIDERS: dict[str, OAuthProviderConfig] = {
    "google": {
        "name": "Google",
        "icon": "google",
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scopes": ["openid", "email", "profile"],
        "supports_pkce": True,
    },
    "github": {
        "name": "GitHub",
        "icon": "github",
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "email_url": "https://api.github.com/user/emails",
        "scopes": ["read:user", "user:email"],
        "supports_pkce": False,  # GitHub doesn't support PKCE
    },
}


class OAuthService:
    """Service for handling OAuth authentication flows."""

    @staticmethod
    def get_enabled_providers() -> OAuthProvidersResponse:
        """
        Get list of enabled OAuth providers.

        Returns:
            OAuthProvidersResponse with enabled providers
        """
        providers = []

        for provider_id in settings.enabled_oauth_providers:
            if provider_id in OAUTH_PROVIDERS:
                config = OAUTH_PROVIDERS[provider_id]
                providers.append(
                    OAuthProviderInfo(
                        provider=provider_id,
                        name=config["name"],
                        icon=config["icon"],
                    )
                )

        return OAuthProvidersResponse(
            enabled=settings.OAUTH_ENABLED and len(providers) > 0,
            providers=providers,
        )

    @staticmethod
    def _get_provider_credentials(provider: str) -> tuple[str, str]:
        """Get client ID and secret for a provider."""
        if provider == "google":
            client_id = settings.OAUTH_GOOGLE_CLIENT_ID
            client_secret = settings.OAUTH_GOOGLE_CLIENT_SECRET
        elif provider == "github":
            client_id = settings.OAUTH_GITHUB_CLIENT_ID
            client_secret = settings.OAUTH_GITHUB_CLIENT_SECRET
        else:
            raise AuthenticationError(f"Unknown OAuth provider: {provider}")

        if not client_id or not client_secret:
            raise AuthenticationError(f"OAuth provider {provider} is not configured")

        return client_id, client_secret

    @staticmethod
    async def create_authorization_url(
        db: AsyncSession,
        *,
        provider: str,
        redirect_uri: str,
        user_id: str | None = None,
    ) -> tuple[str, str]:
        """
        Create OAuth authorization URL with state and optional PKCE.

        Args:
            db: Database session
            provider: OAuth provider (google, github)
            redirect_uri: Callback URL after OAuth
            user_id: User ID if linking account (user is logged in)

        Returns:
            Tuple of (authorization_url, state)

        Raises:
            AuthenticationError: If provider is not configured
        """
        if not settings.OAUTH_ENABLED:
            raise AuthenticationError("OAuth is not enabled")

        if provider not in OAUTH_PROVIDERS:
            raise AuthenticationError(f"Unknown OAuth provider: {provider}")

        if provider not in settings.enabled_oauth_providers:
            raise AuthenticationError(f"OAuth provider {provider} is not enabled")

        config = OAUTH_PROVIDERS[provider]
        client_id, client_secret = OAuthService._get_provider_credentials(provider)

        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)

        # Generate PKCE code verifier and challenge if supported
        code_verifier = None
        code_challenge = None
        if config.get("supports_pkce"):
            code_verifier = secrets.token_urlsafe(64)
            # Create code_challenge using S256 method
            import base64
            import hashlib

            code_challenge_bytes = hashlib.sha256(code_verifier.encode()).digest()
            code_challenge = (
                base64.urlsafe_b64encode(code_challenge_bytes).decode().rstrip("=")
            )

        # Generate nonce for OIDC (Google)
        nonce = secrets.token_urlsafe(32) if provider == "google" else None

        # Store state in database
        from uuid import UUID

        state_data = OAuthStateCreate(
            state=state,
            code_verifier=code_verifier,
            nonce=nonce,
            provider=provider,
            redirect_uri=redirect_uri,
            user_id=UUID(user_id) if user_id else None,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.OAUTH_STATE_EXPIRE_MINUTES),
        )
        await oauth_state.create_state(db, obj_in=state_data)

        # Build authorization URL
        async with AsyncOAuth2Client(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        ) as client:
            # Prepare authorization params
            auth_params = {
                "state": state,
                "scope": " ".join(config["scopes"]),
            }

            if code_challenge:
                auth_params["code_challenge"] = code_challenge
                auth_params["code_challenge_method"] = "S256"

            if nonce:
                auth_params["nonce"] = nonce

            url, _ = client.create_authorization_url(
                config["authorize_url"],
                **auth_params,
            )

        logger.info(f"OAuth authorization URL created for {provider}")
        return url, state

    @staticmethod
    async def handle_callback(
        db: AsyncSession,
        *,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> OAuthCallbackResponse:
        """
        Handle OAuth callback and authenticate/create user.

        Args:
            db: Database session
            code: Authorization code from provider
            state: State parameter for CSRF verification
            redirect_uri: Callback URL (must match authorization request)

        Returns:
            OAuthCallbackResponse with tokens

        Raises:
            AuthenticationError: If authentication fails
        """
        # Validate and consume state
        state_record = await oauth_state.get_and_consume_state(db, state=state)
        if not state_record:
            raise AuthenticationError("Invalid or expired OAuth state")

        # Extract provider from state record (str for type safety)
        provider: str = str(state_record.provider)

        if provider not in OAUTH_PROVIDERS:
            raise AuthenticationError(f"Unknown OAuth provider: {provider}")

        config = OAUTH_PROVIDERS[provider]
        client_id, client_secret = OAuthService._get_provider_credentials(provider)

        # Exchange code for tokens
        async with AsyncOAuth2Client(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        ) as client:
            try:
                # Prepare token request params
                token_params: dict[str, str] = {"code": code}

                if state_record.code_verifier:
                    token_params["code_verifier"] = str(state_record.code_verifier)

                token = await client.fetch_token(
                    config["token_url"],
                    **token_params,
                )
            except Exception as e:
                logger.error(f"OAuth token exchange failed: {e!s}")
                raise AuthenticationError("Failed to exchange authorization code")

            # Get user info from provider
            try:
                access_token = token.get("access_token")
                if not access_token:
                    raise AuthenticationError("No access token received")

                user_info = await OAuthService._get_user_info(
                    client, provider, config, access_token
                )
            except Exception as e:
                logger.error(f"Failed to get user info: {e!s}")
                raise AuthenticationError(
                    "Failed to get user information from provider"
                )

        # Process user info and create/link account
        provider_user_id = str(user_info.get("id") or user_info.get("sub"))
        # Email can be None if user didn't grant email permission
        email_raw = user_info.get("email")
        provider_email: str | None = str(email_raw) if email_raw else None

        if not provider_user_id:
            raise AuthenticationError("Provider did not return user ID")

        # Check if this OAuth account already exists
        existing_oauth = await oauth_account.get_by_provider_id(
            db, provider=provider, provider_user_id=provider_user_id
        )

        is_new_user = False

        if existing_oauth:
            # Existing OAuth account - login
            user = existing_oauth.user
            if not user.is_active:
                raise AuthenticationError("User account is inactive")

            # Update tokens if stored
            if token.get("access_token"):
                await oauth_account.update_tokens(
                    db,
                    account=existing_oauth,
                    access_token_encrypted=token.get("access_token"),  # TODO: encrypt
                    refresh_token_encrypted=token.get("refresh_token"),  # TODO: encrypt
                    token_expires_at=datetime.now(UTC)
                    + timedelta(seconds=token.get("expires_in", 3600)),
                )

            logger.info(f"OAuth login successful for {user.email} via {provider}")

        elif state_record.user_id:
            # Account linking flow (user is already logged in)
            result = await db.execute(
                select(User).where(User.id == state_record.user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                raise AuthenticationError("User not found for account linking")

            # Check if user already has this provider linked
            user_id = cast(UUID, user.id)
            existing_provider = await oauth_account.get_user_account_by_provider(
                db, user_id=user_id, provider=provider
            )
            if existing_provider:
                raise AuthenticationError(
                    f"You already have a {provider} account linked"
                )

            # Create OAuth account link
            oauth_create = OAuthAccountCreate(
                user_id=user_id,
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=provider_email,
                access_token_encrypted=token.get("access_token"),  # TODO: encrypt
                refresh_token_encrypted=token.get("refresh_token"),  # TODO: encrypt
                token_expires_at=datetime.now(UTC)
                + timedelta(seconds=token.get("expires_in", 3600))
                if token.get("expires_in")
                else None,
            )
            await oauth_account.create_account(db, obj_in=oauth_create)

            logger.info(f"OAuth account linked: {provider} -> {user.email}")

        else:
            # New OAuth login - check for existing user by email
            user = None

            if provider_email and settings.OAUTH_AUTO_LINK_BY_EMAIL:
                result = await db.execute(
                    select(User).where(User.email == provider_email)
                )
                user = result.scalar_one_or_none()

            if user:
                # Auto-link to existing user
                if not user.is_active:
                    raise AuthenticationError("User account is inactive")

                # Check if user already has this provider linked
                user_id = cast(UUID, user.id)
                existing_provider = await oauth_account.get_user_account_by_provider(
                    db, user_id=user_id, provider=provider
                )
                if existing_provider:
                    # This shouldn't happen if we got here, but safety check
                    logger.warning(
                        f"OAuth account already linked (race condition?): {provider} -> {user.email}"
                    )
                else:
                    # Create OAuth account link
                    oauth_create = OAuthAccountCreate(
                        user_id=user_id,
                        provider=provider,
                        provider_user_id=provider_user_id,
                        provider_email=provider_email,
                        access_token_encrypted=token.get("access_token"),
                        refresh_token_encrypted=token.get("refresh_token"),
                        token_expires_at=datetime.now(UTC)
                        + timedelta(seconds=token.get("expires_in", 3600))
                        if token.get("expires_in")
                        else None,
                    )
                    await oauth_account.create_account(db, obj_in=oauth_create)

                logger.info(f"OAuth auto-linked by email: {provider} -> {user.email}")

            else:
                # Create new user
                if not provider_email:
                    raise AuthenticationError(
                        f"Email is required for registration. "
                        f"Please grant email permission to {provider}."
                    )

                user = await OAuthService._create_oauth_user(
                    db,
                    email=provider_email,
                    provider=provider,
                    provider_user_id=provider_user_id,
                    user_info=user_info,
                    token=token,
                )
                is_new_user = True

                logger.info(f"New user created via OAuth: {user.email} ({provider})")

        # Generate JWT tokens
        claims = {
            "is_superuser": user.is_superuser,
            "email": user.email,
            "first_name": user.first_name,
        }

        access_token_jwt = create_access_token(subject=str(user.id), claims=claims)
        refresh_token_jwt = create_refresh_token(subject=str(user.id))

        return OAuthCallbackResponse(
            access_token=access_token_jwt,
            refresh_token=refresh_token_jwt,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            is_new_user=is_new_user,
        )

    @staticmethod
    async def _get_user_info(
        client: AsyncOAuth2Client,
        provider: str,
        config: OAuthProviderConfig,
        access_token: str,
    ) -> dict[str, object]:
        """Get user info from OAuth provider."""
        headers = {"Authorization": f"Bearer {access_token}"}

        if provider == "github":
            # GitHub returns JSON with Accept header
            headers["Accept"] = "application/vnd.github+json"

        resp = await client.get(config["userinfo_url"], headers=headers)
        resp.raise_for_status()
        user_info = resp.json()

        # GitHub requires separate request for email
        if provider == "github" and not user_info.get("email"):
            email_resp = await client.get(
                config["email_url"],
                headers=headers,
            )
            email_resp.raise_for_status()
            emails = email_resp.json()

            # Find primary verified email
            for email_data in emails:
                if email_data.get("primary") and email_data.get("verified"):
                    user_info["email"] = email_data["email"]
                    break

        return user_info

    @staticmethod
    async def _create_oauth_user(
        db: AsyncSession,
        *,
        email: str,
        provider: str,
        provider_user_id: str,
        user_info: dict,
        token: dict,
    ) -> User:
        """Create a new user from OAuth provider data."""
        # Extract name from user_info
        first_name = "User"
        last_name = None

        if provider == "google":
            first_name = user_info.get("given_name") or user_info.get("name", "User")
            last_name = user_info.get("family_name")
        elif provider == "github":
            # GitHub has full name, try to split
            name = user_info.get("name") or user_info.get("login", "User")
            parts = name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else None

        # Create user (no password for OAuth-only users)
        user = User(
            email=email,
            password_hash=None,  # OAuth-only user
            first_name=first_name,
            last_name=last_name,
            is_active=True,
            is_superuser=False,
        )
        db.add(user)
        await db.flush()  # Get user.id

        # Create OAuth account link
        user_id = cast(UUID, user.id)
        oauth_create = OAuthAccountCreate(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            access_token_encrypted=token.get("access_token"),  # TODO: encrypt
            refresh_token_encrypted=token.get("refresh_token"),  # TODO: encrypt
            token_expires_at=datetime.now(UTC)
            + timedelta(seconds=token.get("expires_in", 3600))
            if token.get("expires_in")
            else None,
        )
        await oauth_account.create_account(db, obj_in=oauth_create)

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def unlink_provider(
        db: AsyncSession,
        *,
        user: User,
        provider: str,
    ) -> bool:
        """
        Unlink an OAuth provider from a user account.

        Args:
            db: Database session
            user: User to unlink from
            provider: Provider to unlink

        Returns:
            True if unlinked successfully

        Raises:
            AuthenticationError: If unlinking would leave user without login method
        """
        # Check if user can safely remove this OAuth account
        # Note: We query directly instead of using user.can_remove_oauth property
        # because the property uses lazy loading which doesn't work in async context
        user_id = cast(UUID, user.id)
        has_password = user.password_hash is not None
        oauth_accounts = await oauth_account.get_user_accounts(db, user_id=user_id)
        can_remove = has_password or len(oauth_accounts) > 1

        if not can_remove:
            raise AuthenticationError(
                "Cannot unlink OAuth account. You must have either a password set "
                "or at least one other OAuth provider linked."
            )

        deleted = await oauth_account.delete_account(
            db, user_id=user_id, provider=provider
        )

        if not deleted:
            raise AuthenticationError(f"No {provider} account found to unlink")

        logger.info(f"OAuth provider unlinked: {provider} from {user.email}")
        return True

    @staticmethod
    async def cleanup_expired_states(db: AsyncSession) -> int:
        """
        Clean up expired OAuth states.

        Should be called periodically (e.g., by a background task).

        Args:
            db: Database session

        Returns:
            Number of states cleaned up
        """
        return await oauth_state.cleanup_expired(db)
