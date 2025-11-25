# tests/api/test_oauth.py
"""
Tests for OAuth API endpoints.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest

from app.crud.oauth import oauth_account
from app.schemas.oauth import OAuthAccountCreate


def get_error_message(response_json: dict) -> str:
    """Extract error message from API error response."""
    if response_json.get("errors"):
        return response_json["errors"][0].get("message", "")
    return response_json.get("detail", "")


class TestOAuthProviders:
    """Tests for OAuth providers endpoint."""

    @pytest.mark.asyncio
    async def test_list_providers_disabled(self, client):
        """Test listing providers when OAuth is disabled."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = False
            mock_settings.enabled_oauth_providers = []

            response = await client.get("/api/v1/oauth/providers")
            assert response.status_code == 200
            data = response.json()
            assert data["enabled"] is False
            assert data["providers"] == []

    @pytest.mark.asyncio
    async def test_list_providers_enabled(self, client):
        """Test listing providers when OAuth is enabled."""
        with patch("app.services.oauth_service.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True
            mock_settings.enabled_oauth_providers = ["google", "github"]

            response = await client.get("/api/v1/oauth/providers")
            assert response.status_code == 200
            data = response.json()
            assert data["enabled"] is True
            assert len(data["providers"]) == 2
            provider_names = [p["provider"] for p in data["providers"]]
            assert "google" in provider_names
            assert "github" in provider_names


class TestOAuthAuthorize:
    """Tests for OAuth authorization endpoint."""

    @pytest.mark.asyncio
    async def test_authorize_oauth_disabled(self, client):
        """Test authorization when OAuth is disabled."""
        with patch("app.api.routes.oauth.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = False

            response = await client.get(
                "/api/v1/oauth/authorize/google",
                params={"redirect_uri": "http://localhost:3000/callback"},
            )
            assert response.status_code == 400
            assert "not enabled" in get_error_message(response.json())

    @pytest.mark.asyncio
    async def test_authorize_invalid_provider(self, client):
        """Test authorization with invalid provider."""
        with patch("app.api.routes.oauth.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True

            response = await client.get(
                "/api/v1/oauth/authorize/invalid_provider",
                params={"redirect_uri": "http://localhost:3000/callback"},
            )
            assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_authorize_provider_not_configured(self, client):
        """Test authorization when provider credentials are not configured."""
        # OAuth is enabled but no providers are configured
        with (
            patch("app.api.routes.oauth.settings") as mock_route_settings,
            patch("app.services.oauth_service.settings") as mock_service_settings,
        ):
            mock_route_settings.OAUTH_ENABLED = True
            mock_service_settings.OAUTH_ENABLED = True
            mock_service_settings.enabled_oauth_providers = []  # No providers configured

            response = await client.get(
                "/api/v1/oauth/authorize/google",
                params={"redirect_uri": "http://localhost:3000/callback"},
            )

            # Should fail because google is not in enabled_oauth_providers
            assert response.status_code == 400


class TestOAuthCallback:
    """Tests for OAuth callback endpoint."""

    @pytest.mark.asyncio
    async def test_callback_oauth_disabled(self, client):
        """Test callback when OAuth is disabled."""
        with patch("app.api.routes.oauth.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = False

            response = await client.post(
                "/api/v1/oauth/callback/google",
                params={"redirect_uri": "http://localhost:3000/callback"},
                json={"code": "auth_code", "state": "state_param"},
            )
            assert response.status_code == 400
            assert "not enabled" in get_error_message(response.json())

    @pytest.mark.asyncio
    async def test_callback_invalid_state(self, client):
        """Test callback with invalid state."""
        with patch("app.api.routes.oauth.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True

            response = await client.post(
                "/api/v1/oauth/callback/google",
                params={"redirect_uri": "http://localhost:3000/callback"},
                json={"code": "auth_code", "state": "invalid_state"},
            )
            assert response.status_code == 401
            assert "Invalid or expired" in get_error_message(response.json())


class TestOAuthAccounts:
    """Tests for OAuth accounts management endpoints."""

    @pytest.mark.asyncio
    async def test_list_accounts_unauthenticated(self, client):
        """Test listing accounts without authentication."""
        response = await client.get("/api/v1/oauth/accounts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_accounts_empty(self, client, user_token):
        """Test listing accounts when user has none."""
        response = await client.get(
            "/api/v1/oauth/accounts",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["accounts"] == []

    @pytest.mark.asyncio
    async def test_list_accounts_with_linked(
        self, client, user_token, async_test_user, async_test_db
    ):
        """Test listing accounts when user has linked accounts."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create OAuth account for the user
        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_test_123",
                provider_email="user@gmail.com",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        response = await client.get(
            "/api/v1/oauth/accounts",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["accounts"]) == 1
        assert data["accounts"][0]["provider"] == "google"

    @pytest.mark.asyncio
    async def test_unlink_account_unauthenticated(self, client):
        """Test unlinking account without authentication."""
        response = await client.delete("/api/v1/oauth/accounts/google")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_unlink_account_not_found(self, client, user_token):
        """Test unlinking non-existent account."""
        response = await client.delete(
            "/api/v1/oauth/accounts/google",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 400
        # Error message contains "No google account found to unlink"
        error_msg = get_error_message(response.json()).lower()
        assert "google" in error_msg and ("found" in error_msg or "unlink" in error_msg)

    @pytest.mark.asyncio
    async def test_unlink_account_oauth_only_user_blocked(self, client, async_test_db):
        """Test that OAuth-only users can't unlink their only provider."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create OAuth-only user (no password)
        from app.core.auth import create_access_token
        from app.models.user import User

        async with AsyncTestingSessionLocal() as session:
            oauth_user = User(
                id=uuid4(),
                email="oauthonly@example.com",
                password_hash=None,  # OAuth-only
                first_name="OAuth",
                is_active=True,
            )
            session.add(oauth_user)
            await session.commit()

            # Link one OAuth account
            account_data = OAuthAccountCreate(
                user_id=oauth_user.id,
                provider="google",
                provider_user_id="google_only_123",
                provider_email="oauthonly@gmail.com",
            )
            await oauth_account.create_account(session, obj_in=account_data)

            # Create token for this user
            token = create_access_token(
                subject=str(oauth_user.id),
                claims={"email": oauth_user.email, "first_name": oauth_user.first_name},
            )

        # Try to unlink - should fail
        response = await client.delete(
            "/api/v1/oauth/accounts/google",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert "Cannot unlink" in get_error_message(response.json())


class TestOAuthLink:
    """Tests for OAuth account linking endpoint."""

    @pytest.mark.asyncio
    async def test_link_unauthenticated(self, client):
        """Test linking without authentication."""
        response = await client.post(
            "/api/v1/oauth/link/google",
            params={"redirect_uri": "http://localhost:3000/callback"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_link_already_linked(
        self, client, user_token, async_test_user, async_test_db
    ):
        """Test linking when provider is already linked."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create existing link
        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_existing",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        # Mock settings to enable OAuth
        with patch("app.api.routes.oauth.settings") as mock_settings:
            mock_settings.OAUTH_ENABLED = True

            response = await client.post(
                "/api/v1/oauth/link/google",
                params={"redirect_uri": "http://localhost:3000/callback"},
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert response.status_code == 400
            assert "already" in get_error_message(response.json()).lower()


class TestOAuthProviderEndpoints:
    """Tests for OAuth provider mode endpoints."""

    @pytest.mark.asyncio
    async def test_server_metadata_disabled(self, client):
        """Test server metadata when provider mode is disabled."""
        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = False

            response = await client.get(
                "/api/v1/oauth/.well-known/oauth-authorization-server"
            )
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_server_metadata_enabled(self, client):
        """Test server metadata when provider mode is enabled."""
        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = True
            mock_settings.OAUTH_ISSUER = "https://api.example.com"

            response = await client.get(
                "/api/v1/oauth/.well-known/oauth-authorization-server"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["issuer"] == "https://api.example.com"
            assert "authorization_endpoint" in data
            assert "token_endpoint" in data

    @pytest.mark.asyncio
    async def test_provider_authorize_disabled(self, client):
        """Test provider authorize endpoint when disabled."""
        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = False

            response = await client.get(
                "/api/v1/oauth/provider/authorize",
                params={
                    "response_type": "code",
                    "client_id": "test_client",
                    "redirect_uri": "http://localhost:3000/callback",
                },
            )
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_provider_token_disabled(self, client):
        """Test provider token endpoint when disabled."""
        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = False

            response = await client.post(
                "/api/v1/oauth/provider/token",
                data={
                    "grant_type": "authorization_code",
                    "code": "test_code",
                },
            )
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_provider_authorize_requires_auth(self, client, async_test_db):
        """Test provider authorize requires authentication."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a test client
        from app.crud.oauth import oauth_client
        from app.schemas.oauth import OAuthClientCreate

        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Test App",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
            )
            test_client, _ = await oauth_client.create_client(
                session, obj_in=client_data
            )
            test_client_id = test_client.client_id

        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = True

            response = await client.get(
                "/api/v1/oauth/provider/authorize",
                params={
                    "response_type": "code",
                    "client_id": test_client_id,
                    "redirect_uri": "http://localhost:3000/callback",
                },
            )
            # Authorize endpoint requires authentication
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_provider_token_requires_client_id(self, client):
        """Test provider token requires client_id."""
        with patch("app.api.routes.oauth_provider.settings") as mock_settings:
            mock_settings.OAUTH_PROVIDER_ENABLED = True

            response = await client.post(
                "/api/v1/oauth/provider/token",
                data={
                    "grant_type": "authorization_code",
                    "code": "test_code",
                },
            )
            # Missing client_id returns 401 (invalid_client)
            assert response.status_code == 401
