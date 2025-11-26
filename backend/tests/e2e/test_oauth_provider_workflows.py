"""
E2E Tests for OAuth Provider (Authorization Server) Workflows.

Tests the complete OAuth 2.0 Authorization Server functionality using
real PostgreSQL containers via Testcontainers.

Requirements:
    - Docker must be running
    - E2E dependencies: make install-e2e

Run with:
    make test-e2e
    # or specific file:
    TESTCONTAINERS_RYUK_DISABLED=true IS_TEST=True uv run pytest tests/e2e/test_oauth_provider_workflows.py -v
"""

import base64
import hashlib
import secrets
from unittest.mock import patch

import pytest
import pytest_asyncio

from app.core.config import settings


def generate_pkce_pair():
    """Generate PKCE code_verifier and code_challenge pair."""
    code_verifier = secrets.token_urlsafe(64)
    # S256: SHA256(code_verifier) then base64url encode
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


def get_error_message(response_json: dict) -> str:
    """Extract error message from API response (supports both formats)."""
    # New standardized format with errors array
    if response_json.get("errors"):
        return response_json["errors"][0].get("message", "")
    # Legacy format with detail
    return response_json.get("detail", "")


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderServerMetadata:
    """Test OAuth Provider server metadata endpoint."""

    @pytest.mark.asyncio
    async def test_server_metadata_endpoint(self, e2e_client):
        """Test RFC 8414 well-known endpoint returns correct metadata."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "https://api.example.com"):
                response = await e2e_client.get(
                    "/.well-known/oauth-authorization-server"
                )

                assert response.status_code == 200
                data = response.json()

                # Verify required metadata fields
                assert data["issuer"] == "https://api.example.com"
                assert "authorization_endpoint" in data
                assert "token_endpoint" in data
                assert "revocation_endpoint" in data
                assert "introspection_endpoint" in data

                # Verify supported features
                assert "code" in data["response_types_supported"]
                assert "authorization_code" in data["grant_types_supported"]
                assert "refresh_token" in data["grant_types_supported"]
                assert "S256" in data["code_challenge_methods_supported"]

    @pytest.mark.asyncio
    async def test_server_metadata_disabled(self, e2e_client):
        """Test server metadata returns 404 when provider mode is disabled."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", False):
            response = await e2e_client.get("/.well-known/oauth-authorization-server")
            assert response.status_code == 404


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderClientManagement:
    """Test OAuth client registration and management."""

    @pytest.mark.asyncio
    async def test_register_public_client(self, e2e_client, e2e_superuser):
        """Test registering a public OAuth client."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Test MCP Client",
                    "redirect_uris": "http://localhost:3000/callback",
                    "client_type": "public",
                    "scopes": "openid profile email",
                },
            )

            assert response.status_code == 200
            data = response.json()

            assert "client_id" in data
            assert data["client_name"] == "Test MCP Client"
            assert data["client_type"] == "public"
            # Public clients don't get a secret
            assert "client_secret" not in data

    @pytest.mark.asyncio
    async def test_register_confidential_client(self, e2e_client, e2e_superuser):
        """Test registering a confidential OAuth client."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Confidential App",
                    "redirect_uris": "http://localhost:8080/callback",
                    "client_type": "confidential",
                    "scopes": "openid profile email read:users",
                },
            )

            assert response.status_code == 200
            data = response.json()

            assert "client_id" in data
            assert "client_secret" in data
            assert data["client_type"] == "confidential"
            assert "warning" in data  # Security warning about storing secret

    @pytest.mark.asyncio
    async def test_list_clients(self, e2e_client, e2e_superuser):
        """Test listing all OAuth clients."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # First create a client
            await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "List Test Client",
                    "redirect_uris": "http://localhost:3000/callback",
                    "client_type": "public",
                    "scopes": "openid",
                },
            )

            # Then list all
            response = await e2e_client.get(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_delete_client(self, e2e_client, e2e_superuser):
        """Test deleting an OAuth client."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # Create a client
            create_response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Delete Test Client",
                    "redirect_uris": "http://localhost:3000/callback",
                    "client_type": "public",
                    "scopes": "openid",
                },
            )
            client_id = create_response.json()["client_id"]

            # Delete it
            delete_response = await e2e_client.delete(
                f"/api/v1/oauth/provider/clients/{client_id}",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
            )
            assert delete_response.status_code == 204

            # Verify it's gone
            list_response = await e2e_client.get(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
            )
            clients = list_response.json()
            assert not any(c["client_id"] == client_id for c in clients)


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderAuthorizationFlow:
    """Test OAuth authorization code flow."""

    @pytest_asyncio.fixture
    async def oauth_client(self, e2e_client, e2e_superuser):
        """Create a test OAuth client for authorization tests."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Auth Flow Test Client",
                    "redirect_uris": "http://localhost:3000/callback,http://localhost:3000/oauth/callback",
                    "client_type": "public",
                    "scopes": "openid profile email read:users",
                },
            )
            return response.json()

    @pytest.mark.asyncio
    async def test_authorize_requires_pkce_for_public_client(
        self, e2e_client, oauth_client
    ):
        """Test that public clients must use PKCE."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "FRONTEND_URL", "http://localhost:3000"):
                response = await e2e_client.get(
                    "/api/v1/oauth/provider/authorize",
                    params={
                        "response_type": "code",
                        "client_id": oauth_client["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile",
                        "state": "test_state_123",
                    },
                    follow_redirects=False,
                )

                # Should redirect with error
                assert response.status_code == 302
                location = response.headers.get("location", "")
                assert "error=invalid_request" in location
                assert "PKCE" in location

    @pytest.mark.asyncio
    async def test_authorize_redirects_unauthenticated_to_login(
        self, e2e_client, oauth_client
    ):
        """Test that unauthenticated users are redirected to login."""
        _code_verifier, code_challenge = generate_pkce_pair()

        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "FRONTEND_URL", "http://localhost:3000"):
                response = await e2e_client.get(
                    "/api/v1/oauth/provider/authorize",
                    params={
                        "response_type": "code",
                        "client_id": oauth_client["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile",
                        "state": "test_state_123",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                # Should redirect to login
                assert response.status_code == 302
                location = response.headers.get("location", "")
                assert "/login" in location
                assert "return_to" in location

    @pytest.mark.asyncio
    async def test_authorize_redirects_to_consent_for_authenticated_user(
        self, e2e_client, oauth_client, e2e_superuser
    ):
        """Test that authenticated users without consent are redirected to consent page."""
        _code_verifier, code_challenge = generate_pkce_pair()

        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "FRONTEND_URL", "http://localhost:3000"):
                response = await e2e_client.get(
                    "/api/v1/oauth/provider/authorize",
                    params={
                        "response_type": "code",
                        "client_id": oauth_client["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile",
                        "state": "test_state_123",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    headers={
                        "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                    },
                    follow_redirects=False,
                )

                # Should redirect to consent page
                assert response.status_code == 302
                location = response.headers.get("location", "")
                assert "/auth/consent" in location


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderCompleteFlow:
    """Test complete OAuth authorization code flow with token exchange."""

    @pytest_asyncio.fixture
    async def oauth_setup(self, e2e_client, e2e_superuser):
        """Create OAuth client and prepare for authorization flow."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # Create a public client
            response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Complete Flow Test Client",
                    "redirect_uris": "http://localhost:3000/callback",
                    "client_type": "public",
                    "scopes": "openid profile email",
                },
            )
            client_data = response.json()

            # Generate PKCE pair
            code_verifier, code_challenge = generate_pkce_pair()

            return {
                "client": client_data,
                "code_verifier": code_verifier,
                "code_challenge": code_challenge,
                "user": e2e_superuser,
            }

    @pytest.mark.asyncio
    async def test_consent_submission_generates_code(self, e2e_client, oauth_setup):
        """Test that submitting consent generates an authorization code."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/authorize/consent",
                headers={
                    "Authorization": f"Bearer {oauth_setup['user']['tokens']['access_token']}"
                },
                data={
                    "approved": "true",
                    "client_id": oauth_setup["client"]["client_id"],
                    "redirect_uri": "http://localhost:3000/callback",
                    "scope": "openid profile email",
                    "state": "test_state_456",
                    "code_challenge": oauth_setup["code_challenge"],
                    "code_challenge_method": "S256",
                },
                follow_redirects=False,
            )

            # Should redirect with code
            assert response.status_code == 302
            location = response.headers.get("location", "")
            assert "code=" in location
            assert "state=test_state_456" in location
            assert "error" not in location

    @pytest.mark.asyncio
    async def test_consent_denial_returns_error(self, e2e_client, oauth_setup):
        """Test that denying consent returns access_denied error."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/authorize/consent",
                headers={
                    "Authorization": f"Bearer {oauth_setup['user']['tokens']['access_token']}"
                },
                data={
                    "approved": "false",
                    "client_id": oauth_setup["client"]["client_id"],
                    "redirect_uri": "http://localhost:3000/callback",
                    "scope": "openid profile",
                    "state": "test_state_789",
                },
                follow_redirects=False,
            )

            # Should redirect with error
            assert response.status_code == 302
            location = response.headers.get("location", "")
            assert "error=access_denied" in location
            assert "state=test_state_789" in location

    @pytest.mark.asyncio
    async def test_complete_authorization_code_flow(self, e2e_client, oauth_setup):
        """Test complete flow: consent -> code -> token exchange."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                # Step 1: Submit consent
                consent_response = await e2e_client.post(
                    "/api/v1/oauth/provider/authorize/consent",
                    headers={
                        "Authorization": f"Bearer {oauth_setup['user']['tokens']['access_token']}"
                    },
                    data={
                        "approved": "true",
                        "client_id": oauth_setup["client"]["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile email",
                        "state": "flow_test_state",
                        "code_challenge": oauth_setup["code_challenge"],
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                assert consent_response.status_code == 302
                location = consent_response.headers.get("location", "")

                # Extract code from redirect URL
                from urllib.parse import parse_qs, urlparse

                parsed = urlparse(location)
                params = parse_qs(parsed.query)
                assert "code" in params
                auth_code = params["code"][0]

                # Step 2: Exchange code for tokens
                token_response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": "http://localhost:3000/callback",
                        "client_id": oauth_setup["client"]["client_id"],
                        "code_verifier": oauth_setup["code_verifier"],
                    },
                )

                assert token_response.status_code == 200
                tokens = token_response.json()

                assert "access_token" in tokens
                assert "refresh_token" in tokens
                assert tokens["token_type"] == "Bearer"
                assert "expires_in" in tokens
                assert "scope" in tokens


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderTokenOperations:
    """Test token refresh, revocation, and introspection."""

    @pytest_asyncio.fixture
    async def tokens_setup(self, e2e_client, e2e_superuser):
        """Get tokens through complete OAuth flow for testing."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                # Create client
                client_response = await e2e_client.post(
                    "/api/v1/oauth/provider/clients",
                    headers={
                        "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                    },
                    data={
                        "client_name": "Token Ops Test Client",
                        "redirect_uris": "http://localhost:3000/callback",
                        "client_type": "public",
                        "scopes": "openid profile email",
                    },
                )
                client_data = client_response.json()

                # Generate PKCE
                code_verifier, code_challenge = generate_pkce_pair()

                # Submit consent
                consent_response = await e2e_client.post(
                    "/api/v1/oauth/provider/authorize/consent",
                    headers={
                        "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                    },
                    data={
                        "approved": "true",
                        "client_id": client_data["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile email",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                # Extract code
                from urllib.parse import parse_qs, urlparse

                location = consent_response.headers.get("location", "")
                parsed = urlparse(location)
                params = parse_qs(parsed.query)
                auth_code = params["code"][0]

                # Exchange for tokens
                token_response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": "http://localhost:3000/callback",
                        "client_id": client_data["client_id"],
                        "code_verifier": code_verifier,
                    },
                )

                return {
                    "tokens": token_response.json(),
                    "client": client_data,
                    "user": e2e_superuser,
                }

    @pytest.mark.asyncio
    async def test_token_introspection_active(self, e2e_client, tokens_setup):
        """Test introspecting an active access token."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                response = await e2e_client.post(
                    "/api/v1/oauth/provider/introspect",
                    data={
                        "token": tokens_setup["tokens"]["access_token"],
                        "token_type_hint": "access_token",
                    },
                )

                assert response.status_code == 200
                data = response.json()
                assert data["active"] is True
                assert "scope" in data
                assert data["client_id"] == tokens_setup["client"]["client_id"]

    @pytest.mark.asyncio
    async def test_token_introspection_refresh_token(self, e2e_client, tokens_setup):
        """Test introspecting a refresh token."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/introspect",
                data={
                    "token": tokens_setup["tokens"]["refresh_token"],
                    "token_type_hint": "refresh_token",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["active"] is True
            assert data["token_type"] == "refresh_token"

    @pytest.mark.asyncio
    async def test_token_refresh(self, e2e_client, tokens_setup):
        """Test refreshing an access token."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": tokens_setup["tokens"]["refresh_token"],
                        "client_id": tokens_setup["client"]["client_id"],
                    },
                )

                assert response.status_code == 200
                data = response.json()
                assert "access_token" in data
                assert "refresh_token" in data
                # New tokens should be different (token rotation)
                assert data["access_token"] != tokens_setup["tokens"]["access_token"]
                assert data["refresh_token"] != tokens_setup["tokens"]["refresh_token"]

    @pytest.mark.asyncio
    async def test_token_revocation(self, e2e_client, tokens_setup):
        """Test revoking a refresh token."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # Revoke refresh token
            revoke_response = await e2e_client.post(
                "/api/v1/oauth/provider/revoke",
                data={
                    "token": tokens_setup["tokens"]["refresh_token"],
                    "token_type_hint": "refresh_token",
                },
            )

            # Per RFC 7009, always returns 200
            assert revoke_response.status_code == 200

            # Verify token is no longer active
            introspect_response = await e2e_client.post(
                "/api/v1/oauth/provider/introspect",
                data={
                    "token": tokens_setup["tokens"]["refresh_token"],
                    "token_type_hint": "refresh_token",
                },
            )

            assert introspect_response.status_code == 200
            assert introspect_response.json()["active"] is False

    @pytest.mark.asyncio
    async def test_revoked_refresh_token_cannot_be_used(self, e2e_client, tokens_setup):
        """Test that a revoked refresh token cannot be used for refresh."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # Revoke first
            await e2e_client.post(
                "/api/v1/oauth/provider/revoke",
                data={
                    "token": tokens_setup["tokens"]["refresh_token"],
                },
            )

            # Try to use revoked token
            refresh_response = await e2e_client.post(
                "/api/v1/oauth/provider/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": tokens_setup["tokens"]["refresh_token"],
                    "client_id": tokens_setup["client"]["client_id"],
                },
            )

            assert refresh_response.status_code == 400
            assert "invalid_grant" in get_error_message(refresh_response.json())


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderConsentManagement:
    """Test user consent listing and revocation."""

    @pytest_asyncio.fixture
    async def consent_setup(self, e2e_client, e2e_superuser):
        """Create OAuth client and grant consent for testing."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                # Create client
                client_response = await e2e_client.post(
                    "/api/v1/oauth/provider/clients",
                    headers={
                        "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                    },
                    data={
                        "client_name": "Consent Test Client",
                        "redirect_uris": "http://localhost:3000/callback",
                        "client_type": "public",
                        "scopes": "openid profile email",
                    },
                )
                client_data = client_response.json()

                # Generate PKCE and grant consent
                _code_verifier, code_challenge = generate_pkce_pair()

                await e2e_client.post(
                    "/api/v1/oauth/provider/authorize/consent",
                    headers={
                        "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                    },
                    data={
                        "approved": "true",
                        "client_id": client_data["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile email",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                return {
                    "client": client_data,
                    "user": e2e_superuser,
                }

    @pytest.mark.asyncio
    async def test_list_my_consents(self, e2e_client, consent_setup):
        """Test listing user's OAuth consents."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.get(
                "/api/v1/oauth/provider/consents",
                headers={
                    "Authorization": f"Bearer {consent_setup['user']['tokens']['access_token']}"
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 1

            # Find our consent
            consent = next(
                (
                    c
                    for c in data
                    if c["client_id"] == consent_setup["client"]["client_id"]
                ),
                None,
            )
            assert consent is not None
            assert consent["client_name"] == "Consent Test Client"
            assert "granted_scopes" in consent
            assert "granted_at" in consent

    @pytest.mark.asyncio
    async def test_revoke_my_consent(self, e2e_client, consent_setup):
        """Test revoking user's OAuth consent."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            # Revoke consent
            revoke_response = await e2e_client.delete(
                f"/api/v1/oauth/provider/consents/{consent_setup['client']['client_id']}",
                headers={
                    "Authorization": f"Bearer {consent_setup['user']['tokens']['access_token']}"
                },
            )

            assert revoke_response.status_code == 204

            # Verify consent is gone
            list_response = await e2e_client.get(
                "/api/v1/oauth/provider/consents",
                headers={
                    "Authorization": f"Bearer {consent_setup['user']['tokens']['access_token']}"
                },
            )

            consents = list_response.json()
            assert not any(
                c["client_id"] == consent_setup["client"]["client_id"] for c in consents
            )


@pytest.mark.e2e
@pytest.mark.postgres
class TestOAuthProviderSecurityChecks:
    """Test OAuth Provider security features."""

    @pytest_asyncio.fixture
    async def security_setup(self, e2e_client, e2e_superuser):
        """Create OAuth client for security tests."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/clients",
                headers={
                    "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
                },
                data={
                    "client_name": "Security Test Client",
                    "redirect_uris": "http://localhost:3000/callback",
                    "client_type": "public",
                    "scopes": "openid profile email",
                },
            )
            return {
                "client": response.json(),
                "user": e2e_superuser,
            }

    @pytest.mark.asyncio
    async def test_invalid_redirect_uri_rejected(self, e2e_client, security_setup):
        """Test that unregistered redirect_uri is rejected."""
        _code_verifier, code_challenge = generate_pkce_pair()

        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.get(
                "/api/v1/oauth/provider/authorize",
                params={
                    "response_type": "code",
                    "client_id": security_setup["client"]["client_id"],
                    "redirect_uri": "http://evil.com/callback",  # Not registered
                    "scope": "openid",
                    "code_challenge": code_challenge,
                    "code_challenge_method": "S256",
                },
                headers={
                    "Authorization": f"Bearer {security_setup['user']['tokens']['access_token']}"
                },
            )

            # Should return 400, not redirect
            assert response.status_code == 400
            assert "Invalid redirect_uri" in get_error_message(response.json())

    @pytest.mark.asyncio
    async def test_plain_pkce_method_rejected(self, e2e_client, security_setup):
        """Test that 'plain' PKCE method is rejected (security requirement)."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "FRONTEND_URL", "http://localhost:3000"):
                response = await e2e_client.get(
                    "/api/v1/oauth/provider/authorize",
                    params={
                        "response_type": "code",
                        "client_id": security_setup["client"]["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid",
                        "code_challenge": "some_challenge",
                        "code_challenge_method": "plain",  # Should be rejected
                    },
                    headers={
                        "Authorization": f"Bearer {security_setup['user']['tokens']['access_token']}"
                    },
                )

                assert response.status_code == 400
                assert "S256" in get_error_message(response.json())

    @pytest.mark.asyncio
    async def test_authorization_code_single_use(self, e2e_client, security_setup):
        """Test that authorization codes can only be used once."""
        code_verifier, code_challenge = generate_pkce_pair()

        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                # Get an authorization code
                consent_response = await e2e_client.post(
                    "/api/v1/oauth/provider/authorize/consent",
                    headers={
                        "Authorization": f"Bearer {security_setup['user']['tokens']['access_token']}"
                    },
                    data={
                        "approved": "true",
                        "client_id": security_setup["client"]["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                from urllib.parse import parse_qs, urlparse

                location = consent_response.headers.get("location", "")
                parsed = urlparse(location)
                params = parse_qs(parsed.query)
                auth_code = params["code"][0]

                # First use - should succeed
                first_response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": "http://localhost:3000/callback",
                        "client_id": security_setup["client"]["client_id"],
                        "code_verifier": code_verifier,
                    },
                )
                assert first_response.status_code == 200

                # Second use - should fail
                second_response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": "http://localhost:3000/callback",
                        "client_id": security_setup["client"]["client_id"],
                        "code_verifier": code_verifier,
                    },
                )
                assert second_response.status_code == 400
                assert "already been used" in get_error_message(second_response.json())

    @pytest.mark.asyncio
    async def test_invalid_pkce_verifier_rejected(self, e2e_client, security_setup):
        """Test that wrong code_verifier is rejected."""
        _code_verifier, code_challenge = generate_pkce_pair()

        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            with patch.object(settings, "OAUTH_ISSUER", "http://e2e-test"):
                # Get an authorization code
                consent_response = await e2e_client.post(
                    "/api/v1/oauth/provider/authorize/consent",
                    headers={
                        "Authorization": f"Bearer {security_setup['user']['tokens']['access_token']}"
                    },
                    data={
                        "approved": "true",
                        "client_id": security_setup["client"]["client_id"],
                        "redirect_uri": "http://localhost:3000/callback",
                        "scope": "openid profile",
                        "code_challenge": code_challenge,
                        "code_challenge_method": "S256",
                    },
                    follow_redirects=False,
                )

                from urllib.parse import parse_qs, urlparse

                location = consent_response.headers.get("location", "")
                parsed = urlparse(location)
                params = parse_qs(parsed.query)
                auth_code = params["code"][0]

                # Use wrong verifier
                response = await e2e_client.post(
                    "/api/v1/oauth/provider/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": auth_code,
                        "redirect_uri": "http://localhost:3000/callback",
                        "client_id": security_setup["client"]["client_id"],
                        "code_verifier": "wrong_verifier_value",
                    },
                )

                assert response.status_code == 400
                assert "code_verifier" in get_error_message(response.json()).lower()

    @pytest.mark.asyncio
    async def test_introspect_invalid_token(self, e2e_client):
        """Test that introspecting an invalid token returns active=false."""
        with patch.object(settings, "OAUTH_PROVIDER_ENABLED", True):
            response = await e2e_client.post(
                "/api/v1/oauth/provider/introspect",
                data={
                    "token": "invalid_token_that_does_not_exist",
                },
            )

            assert response.status_code == 200
            assert response.json()["active"] is False
