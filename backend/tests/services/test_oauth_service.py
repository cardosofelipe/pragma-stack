# tests/services/test_oauth_service.py
"""
Tests for OAuthService covering authorization URL creation,
callback handling, and account management.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.core.exceptions import AuthenticationError
from app.crud.oauth import oauth_account, oauth_state
from app.schemas.oauth import OAuthAccountCreate, OAuthStateCreate
from app.services.oauth_service import OAUTH_PROVIDERS, OAuthService


class TestGetEnabledProviders:
    """Tests for get_enabled_providers method."""

    def test_returns_empty_when_disabled(self):
        """Test returns empty providers when OAuth is disabled."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = False
            mock_settings.enabled_oauth_providers = []

            result = OAuthService.get_enabled_providers()

            assert result.enabled is False
            assert result.providers == []

    def test_returns_configured_providers(self):
        """Test returns configured providers when enabled."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True
            mock_settings.enabled_oauth_providers = ["google", "github"]

            result = OAuthService.get_enabled_providers()

            assert result.enabled is True
            assert len(result.providers) == 2
            provider_names = [p.provider for p in result.providers]
            assert "google" in provider_names
            assert "github" in provider_names

    def test_filters_unknown_providers(self):
        """Test filters out unknown providers from list."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True
            mock_settings.enabled_oauth_providers = ["google", "unknown_provider"]

            result = OAuthService.get_enabled_providers()

            assert result.enabled is True
            assert len(result.providers) == 1
            assert result.providers[0].provider == "google"


class TestGetProviderCredentials:
    """Tests for _get_provider_credentials method."""

    def test_returns_google_credentials(self):
        """Test returns Google credentials when configured."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_GOOGLE_CLIENT_ID = "google_client_id"
            mock_settings.OAUTH_GOOGLE_CLIENT_SECRET = "google_secret"

            client_id, secret = OAuthService._get_provider_credentials("google")

            assert client_id == "google_client_id"
            assert secret == "google_secret"

    def test_returns_github_credentials(self):
        """Test returns GitHub credentials when configured."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_GITHUB_CLIENT_ID = "github_client_id"
            mock_settings.OAUTH_GITHUB_CLIENT_SECRET = "github_secret"

            client_id, secret = OAuthService._get_provider_credentials("github")

            assert client_id == "github_client_id"
            assert secret == "github_secret"

    def test_raises_for_unknown_provider(self):
        """Test raises error for unknown provider."""
        with pytest.raises(AuthenticationError, match="Unknown OAuth provider"):
            OAuthService._get_provider_credentials("unknown")

    def test_raises_when_credentials_not_configured(self):
        """Test raises error when credentials are not configured."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_GOOGLE_CLIENT_ID = None
            mock_settings.OAUTH_GOOGLE_CLIENT_SECRET = "secret"

            with pytest.raises(AuthenticationError, match="not configured"):
                OAuthService._get_provider_credentials("google")


class TestCreateAuthorizationUrl:
    """Tests for create_authorization_url method."""

    @pytest.mark.asyncio
    async def test_raises_when_oauth_disabled(self, async_test_db):
        """Test raises error when OAuth is disabled."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with patch("app.services.oauth_service.settings") as mock_settings:
                mock_settings.OAUTH_ENABLED = False

                with pytest.raises(AuthenticationError, match="not enabled"):
                    await OAuthService.create_authorization_url(
                        session,
                        provider="google",
                        redirect_uri="http://localhost:3000/callback",
                    )

    @pytest.mark.asyncio
    async def test_raises_for_unknown_provider(self, async_test_db):
        """Test raises error for unknown provider."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with patch("app.services.oauth_service.settings") as mock_settings:
                mock_settings.OAUTH_ENABLED = True

                with pytest.raises(AuthenticationError, match="Unknown OAuth provider"):
                    await OAuthService.create_authorization_url(
                        session,
                        provider="unknown",
                        redirect_uri="http://localhost:3000/callback",
                    )

    @pytest.mark.asyncio
    async def test_raises_when_provider_not_enabled(self, async_test_db):
        """Test raises error when provider is not in enabled list."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with patch("app.services.oauth_service.settings") as mock_settings:
                mock_settings.OAUTH_ENABLED = True
                mock_settings.enabled_oauth_providers = ["github"]  # google not enabled

                with pytest.raises(AuthenticationError, match="not enabled"):
                    await OAuthService.create_authorization_url(
                        session,
                        provider="google",
                        redirect_uri="http://localhost:3000/callback",
                    )

    @pytest.mark.asyncio
    async def test_creates_authorization_url_for_google(self, async_test_db):
        """Test creates authorization URL for Google with PKCE."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with patch("app.services.oauth_service.settings") as mock_settings:
                mock_settings.OAUTH_ENABLED = True
                mock_settings.enabled_oauth_providers = ["google"]
                mock_settings.OAUTH_GOOGLE_CLIENT_ID = "google_client_id"
                mock_settings.OAUTH_GOOGLE_CLIENT_SECRET = "google_secret"
                mock_settings.OAUTH_STATE_EXPIRE_MINUTES = 10

                url, state = await OAuthService.create_authorization_url(
                    session,
                    provider="google",
                    redirect_uri="http://localhost:3000/callback",
                )

                assert url is not None
                assert "accounts.google.com" in url
                assert state is not None
                assert len(state) > 20

    @pytest.mark.asyncio
    async def test_creates_authorization_url_for_github(self, async_test_db):
        """Test creates authorization URL for GitHub."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with patch("app.services.oauth_service.settings") as mock_settings:
                mock_settings.OAUTH_ENABLED = True
                mock_settings.enabled_oauth_providers = ["github"]
                mock_settings.OAUTH_GITHUB_CLIENT_ID = "github_client_id"
                mock_settings.OAUTH_GITHUB_CLIENT_SECRET = "github_secret"
                mock_settings.OAUTH_STATE_EXPIRE_MINUTES = 10

                url, state = await OAuthService.create_authorization_url(
                    session,
                    provider="github",
                    redirect_uri="http://localhost:3000/callback",
                )

                assert url is not None
                assert "github.com/login/oauth/authorize" in url
                assert state is not None


class TestHandleCallback:
    """Tests for handle_callback method."""

    @pytest.mark.asyncio
    async def test_raises_for_invalid_state(self, async_test_db):
        """Test raises error for invalid/expired state."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(AuthenticationError, match="Invalid or expired"):
                await OAuthService.handle_callback(
                    session,
                    code="auth_code",
                    state="invalid_state",
                    redirect_uri="http://localhost:3000/callback",
                )


class TestUnlinkProvider:
    """Tests for unlink_provider method."""

    @pytest.mark.asyncio
    async def test_unlink_with_password_succeeds(self, async_test_db, async_test_user):
        """Test unlinking succeeds when user has password."""
        _engine, AsyncTestingSessionLocal = async_test_db

        # Create OAuth account
        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_123",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        # Unlink (user has password)
        async with AsyncTestingSessionLocal() as session:
            # Need to get fresh user instance
            from sqlalchemy import select

            from app.models.user import User

            result = await session.execute(
                select(User).where(User.id == async_test_user.id)
            )
            user = result.scalar_one()

            success = await OAuthService.unlink_provider(
                session, user=user, provider="google"
            )
            assert success is True

        # Verify unlinked
        async with AsyncTestingSessionLocal() as session:
            account = await oauth_account.get_user_account_by_provider(
                session, user_id=async_test_user.id, provider="google"
            )
            assert account is None

    @pytest.mark.asyncio
    async def test_unlink_not_found_raises(self, async_test_db, async_test_user):
        """Test unlinking non-existent provider raises error."""
        _engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            from sqlalchemy import select

            from app.models.user import User

            result = await session.execute(
                select(User).where(User.id == async_test_user.id)
            )
            user = result.scalar_one()

            with pytest.raises(AuthenticationError, match="No google account found"):
                await OAuthService.unlink_provider(
                    session, user=user, provider="google"
                )

    @pytest.mark.asyncio
    async def test_unlink_oauth_only_user_blocked(self, async_test_db):
        """Test unlinking fails for OAuth-only user with single provider."""
        _engine, AsyncTestingSessionLocal = async_test_db

        # Create OAuth-only user
        from app.models.user import User

        async with AsyncTestingSessionLocal() as session:
            oauth_user = User(
                id=uuid4(),
                email="oauthonly@example.com",
                password_hash=None,  # No password
                first_name="OAuth",
                is_active=True,
            )
            session.add(oauth_user)
            await session.commit()

            # Link single OAuth account
            account_data = OAuthAccountCreate(
                user_id=oauth_user.id,
                provider="google",
                provider_user_id="google_only",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        # Try to unlink
        async with AsyncTestingSessionLocal() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.email == "oauthonly@example.com")
            )
            user = result.scalar_one()

            with pytest.raises(AuthenticationError, match="Cannot unlink"):
                await OAuthService.unlink_provider(
                    session, user=user, provider="google"
                )

    @pytest.mark.asyncio
    async def test_unlink_with_multiple_providers_succeeds(self, async_test_db):
        """Test unlinking succeeds when user has multiple providers."""
        _engine, AsyncTestingSessionLocal = async_test_db

        from app.models.user import User

        # Create OAuth-only user with multiple providers
        async with AsyncTestingSessionLocal() as session:
            oauth_user = User(
                id=uuid4(),
                email="multiauth@example.com",
                password_hash=None,
                first_name="Multi",
                is_active=True,
            )
            session.add(oauth_user)
            await session.commit()

            # Link multiple OAuth accounts
            for provider in ["google", "github"]:
                account_data = OAuthAccountCreate(
                    user_id=oauth_user.id,
                    provider=provider,
                    provider_user_id=f"{provider}_user",
                )
                await oauth_account.create_account(session, obj_in=account_data)

        # Unlink one provider (should succeed)
        async with AsyncTestingSessionLocal() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.email == "multiauth@example.com")
            )
            user = result.scalar_one()

            success = await OAuthService.unlink_provider(
                session, user=user, provider="google"
            )
            assert success is True


class TestCleanupExpiredStates:
    """Tests for cleanup_expired_states method."""

    @pytest.mark.asyncio
    async def test_cleanup_removes_expired_states(self, async_test_db):
        """Test cleanup removes expired states."""
        _engine, AsyncTestingSessionLocal = async_test_db

        # Create expired state
        async with AsyncTestingSessionLocal() as session:
            expired_state = OAuthStateCreate(
                state="expired_cleanup_test",
                provider="google",
                expires_at=datetime.now(UTC) - timedelta(minutes=5),
            )
            await oauth_state.create_state(session, obj_in=expired_state)

        # Run cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await OAuthService.cleanup_expired_states(session)
            assert count >= 1


class TestProviderConfigs:
    """Tests for provider configuration constants."""

    def test_google_provider_config(self):
        """Test Google provider configuration is correct."""
        config = OAUTH_PROVIDERS.get("google")
        assert config is not None
        assert config["name"] == "Google"
        assert "accounts.google.com" in config["authorize_url"]
        assert config["supports_pkce"] is True

    def test_github_provider_config(self):
        """Test GitHub provider configuration is correct."""
        config = OAUTH_PROVIDERS.get("github")
        assert config is not None
        assert config["name"] == "GitHub"
        assert "github.com" in config["authorize_url"]
        assert config["supports_pkce"] is False
