# tests/services/test_oauth_provider_service.py
"""
Tests for OAuth Provider Service (Authorization Server mode for MCP).

Covers:
- Authorization code creation and exchange
- Token generation, refresh, and revocation
- PKCE verification
- Token introspection (RFC 7662)
- Consent management
- Error handling
"""

import base64
import hashlib
import secrets
from unittest.mock import patch
from uuid import uuid4

import pytest
import pytest_asyncio

from app.models.oauth_client import OAuthClient
from app.models.user import User
from app.services import oauth_provider_service as service
from app.utils.test_utils import setup_async_test_db, teardown_async_test_db


@pytest_asyncio.fixture(scope="function")
async def db():
    """Fixture provides testing engine and session for each test."""
    test_engine, AsyncTestingSessionLocal = await setup_async_test_db()
    async with AsyncTestingSessionLocal() as session:
        yield session
    await teardown_async_test_db(test_engine)


@pytest_asyncio.fixture
async def test_user(db):
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="testuser@example.com",
        password_hash="$2b$12$test",
        first_name="Test",
        last_name="User",
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def public_client(db):
    """Create a test public OAuth client."""
    client = OAuthClient(
        id=uuid4(),
        client_id="test_public_client",
        client_name="Test Public Client",
        client_type="public",
        redirect_uris=["http://localhost:3000/callback"],
        allowed_scopes=["openid", "profile", "email", "read:users"],
        is_active=True,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@pytest_asyncio.fixture
async def confidential_client(db):
    """Create a test confidential OAuth client."""
    secret = "test_client_secret"
    secret_hash = hashlib.sha256(secret.encode()).hexdigest()
    client = OAuthClient(
        id=uuid4(),
        client_id="test_confidential_client",
        client_name="Test Confidential Client",
        client_type="confidential",
        client_secret_hash=secret_hash,
        redirect_uris=["http://localhost:3000/callback"],
        allowed_scopes=["openid", "profile", "email"],
        is_active=True,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client, secret


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_generate_code_length(self):
        """Test authorization code generation has proper length."""
        code = service.generate_code()
        assert len(code) > 64  # Base64 encoding of 64 bytes

    def test_generate_code_unique(self):
        """Test authorization codes are unique."""
        codes = [service.generate_code() for _ in range(100)]
        assert len(set(codes)) == 100

    def test_generate_token(self):
        """Test token generation."""
        token = service.generate_token()
        assert len(token) > 32

    def test_generate_jti(self):
        """Test JTI generation."""
        jti = service.generate_jti()
        assert len(jti) > 20

    def test_hash_token(self):
        """Test token hashing."""
        token = "test_token"
        hashed = service.hash_token(token)
        assert len(hashed) == 64  # SHA-256 hex digest

    def test_hash_token_deterministic(self):
        """Test same token produces same hash."""
        token = "test_token"
        hash1 = service.hash_token(token)
        hash2 = service.hash_token(token)
        assert hash1 == hash2

    def test_parse_scope(self):
        """Test scope parsing."""
        assert service.parse_scope("openid profile email") == [
            "openid",
            "profile",
            "email",
        ]
        assert service.parse_scope("") == []
        assert service.parse_scope("  openid   profile  ") == ["openid", "profile"]

    def test_join_scope(self):
        """Test scope joining."""
        # Result is sorted and deduplicated
        result = service.join_scope(["profile", "openid", "profile"])
        assert "openid" in result
        assert "profile" in result


class TestPKCEVerification:
    """Tests for PKCE verification."""

    def test_verify_pkce_s256_valid(self):
        """Test PKCE verification with S256 method."""
        # Generate code_verifier
        code_verifier = secrets.token_urlsafe(64)

        # Generate code_challenge using S256
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        assert service.verify_pkce(code_verifier, code_challenge, "S256") is True

    def test_verify_pkce_s256_invalid(self):
        """Test PKCE verification fails with wrong verifier."""
        code_verifier = secrets.token_urlsafe(64)
        wrong_verifier = secrets.token_urlsafe(64)

        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        assert service.verify_pkce(wrong_verifier, code_challenge, "S256") is False

    def test_verify_pkce_plain(self):
        """Test PKCE verification with plain method."""
        code_verifier = "test_verifier"
        assert service.verify_pkce(code_verifier, code_verifier, "plain") is True
        assert service.verify_pkce(code_verifier, "wrong", "plain") is False

    def test_verify_pkce_unknown_method(self):
        """Test PKCE verification with unknown method returns False."""
        assert service.verify_pkce("verifier", "challenge", "unknown") is False


class TestClientValidation:
    """Tests for client validation."""

    @pytest.mark.asyncio
    async def test_get_client_success(self, db, public_client):
        """Test getting a valid client."""
        client = await service.get_client(db, public_client.client_id)
        assert client is not None
        assert client.client_id == public_client.client_id

    @pytest.mark.asyncio
    async def test_get_client_not_found(self, db):
        """Test getting a non-existent client."""
        client = await service.get_client(db, "nonexistent")
        assert client is None

    @pytest.mark.asyncio
    async def test_get_client_inactive(self, db, public_client):
        """Test getting an inactive client returns None."""
        public_client.is_active = False
        await db.commit()

        client = await service.get_client(db, public_client.client_id)
        assert client is None

    @pytest.mark.asyncio
    async def test_validate_client_public(self, db, public_client):
        """Test validating a public client."""
        client = await service.validate_client(db, public_client.client_id)
        assert client.client_id == public_client.client_id

    @pytest.mark.asyncio
    async def test_validate_client_confidential_with_secret(
        self, db, confidential_client
    ):
        """Test validating a confidential client with correct secret."""
        client, secret = confidential_client
        validated = await service.validate_client(db, client.client_id, secret)
        assert validated.client_id == client.client_id

    @pytest.mark.asyncio
    async def test_validate_client_confidential_wrong_secret(
        self, db, confidential_client
    ):
        """Test validating a confidential client with wrong secret."""
        client, _ = confidential_client
        with pytest.raises(service.InvalidClientError, match="Invalid client secret"):
            await service.validate_client(db, client.client_id, "wrong_secret")

    @pytest.mark.asyncio
    async def test_validate_client_confidential_no_secret(self, db, confidential_client):
        """Test validating a confidential client without secret."""
        client, _ = confidential_client
        with pytest.raises(service.InvalidClientError, match="Client secret required"):
            await service.validate_client(db, client.client_id)

    def test_validate_redirect_uri_success(self, public_client):
        """Test validating a registered redirect URI."""
        # Should not raise
        service.validate_redirect_uri(public_client, "http://localhost:3000/callback")

    def test_validate_redirect_uri_invalid(self, public_client):
        """Test validating an unregistered redirect URI."""
        with pytest.raises(service.InvalidRequestError, match="Invalid redirect_uri"):
            service.validate_redirect_uri(public_client, "http://evil.com/callback")

    def test_validate_redirect_uri_no_uris(self, public_client):
        """Test validating when client has no URIs."""
        public_client.redirect_uris = []
        with pytest.raises(service.InvalidRequestError, match="no registered"):
            service.validate_redirect_uri(public_client, "http://localhost:3000")


class TestScopeValidation:
    """Tests for scope validation."""

    def test_validate_scopes_all_valid(self, public_client):
        """Test validating all valid scopes."""
        scopes = service.validate_scopes(public_client, ["openid", "profile"])
        assert "openid" in scopes
        assert "profile" in scopes

    def test_validate_scopes_partial_valid(self, public_client):
        """Test validating with some invalid scopes - filters them out."""
        scopes = service.validate_scopes(public_client, ["openid", "invalid_scope"])
        assert "openid" in scopes
        assert "invalid_scope" not in scopes

    def test_validate_scopes_empty_uses_all_allowed(self, public_client):
        """Test empty scope request uses all allowed scopes."""
        scopes = service.validate_scopes(public_client, [])
        assert set(scopes) == set(public_client.allowed_scopes)

    def test_validate_scopes_none_valid(self, public_client):
        """Test validating with no valid scopes raises error."""
        with pytest.raises(service.InvalidScopeError):
            service.validate_scopes(public_client, ["invalid1", "invalid2"])


class TestAuthorizationCode:
    """Tests for authorization code creation and exchange."""

    @pytest.mark.asyncio
    async def test_create_authorization_code_public_with_pkce(
        self, db, public_client, test_user
    ):
        """Test creating authorization code for public client with PKCE."""
        code_verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        code = await service.create_authorization_code(
            db=db,
            client=public_client,
            user=test_user,
            redirect_uri="http://localhost:3000/callback",
            scope="openid profile",
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )

        assert code is not None
        assert len(code) > 64

    @pytest.mark.asyncio
    async def test_create_authorization_code_public_without_pkce_fails(
        self, db, public_client, test_user
    ):
        """Test creating authorization code for public client without PKCE fails."""
        with pytest.raises(service.InvalidRequestError, match="PKCE"):
            await service.create_authorization_code(
                db=db,
                client=public_client,
                user=test_user,
                redirect_uri="http://localhost:3000/callback",
                scope="openid",
            )

    @pytest.mark.asyncio
    async def test_exchange_authorization_code_success(
        self, db, public_client, test_user
    ):
        """Test exchanging valid authorization code for tokens."""
        # Create PKCE challenge
        code_verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        # Create auth code
        code = await service.create_authorization_code(
            db=db,
            client=public_client,
            user=test_user,
            redirect_uri="http://localhost:3000/callback",
            scope="openid profile",
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )

        # Exchange code
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.exchange_authorization_code(
                db=db,
                code=code,
                client_id=public_client.client_id,
                redirect_uri="http://localhost:3000/callback",
                code_verifier=code_verifier,
            )

        assert "access_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "Bearer"
        assert "expires_in" in result

    @pytest.mark.asyncio
    async def test_exchange_authorization_code_invalid_code(self, db, public_client):
        """Test exchanging invalid code fails."""
        with pytest.raises(service.InvalidGrantError, match="Invalid authorization"):
            await service.exchange_authorization_code(
                db=db,
                code="invalid_code",
                client_id=public_client.client_id,
                redirect_uri="http://localhost:3000/callback",
            )

    @pytest.mark.asyncio
    async def test_exchange_authorization_code_wrong_redirect_uri(
        self, db, public_client, test_user
    ):
        """Test exchanging code with wrong redirect_uri fails."""
        code_verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        code = await service.create_authorization_code(
            db=db,
            client=public_client,
            user=test_user,
            redirect_uri="http://localhost:3000/callback",
            scope="openid",
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )

        with pytest.raises(service.InvalidGrantError, match="redirect_uri mismatch"):
            await service.exchange_authorization_code(
                db=db,
                code=code,
                client_id=public_client.client_id,
                redirect_uri="http://different.com/callback",
                code_verifier=code_verifier,
            )

    @pytest.mark.asyncio
    async def test_exchange_authorization_code_invalid_pkce(
        self, db, public_client, test_user
    ):
        """Test exchanging code with invalid PKCE verifier fails."""
        code_verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

        code = await service.create_authorization_code(
            db=db,
            client=public_client,
            user=test_user,
            redirect_uri="http://localhost:3000/callback",
            scope="openid",
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )

        with pytest.raises(service.InvalidGrantError, match="Invalid code_verifier"):
            await service.exchange_authorization_code(
                db=db,
                code=code,
                client_id=public_client.client_id,
                redirect_uri="http://localhost:3000/callback",
                code_verifier="wrong_verifier",
            )


class TestTokenRefresh:
    """Tests for token refresh."""

    @pytest.mark.asyncio
    async def test_refresh_tokens_success(self, db, public_client, test_user):
        """Test refreshing tokens successfully."""
        # Create initial tokens
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid profile",
            )

            refresh_token = result["refresh_token"]

            # Refresh the tokens
            new_result = await service.refresh_tokens(
                db=db,
                refresh_token=refresh_token,
                client_id=public_client.client_id,
            )

        assert "access_token" in new_result
        assert "refresh_token" in new_result
        assert new_result["refresh_token"] != refresh_token  # Token rotation

    @pytest.mark.asyncio
    async def test_refresh_tokens_invalid_token(self, db, public_client):
        """Test refreshing with invalid token fails."""
        with pytest.raises(service.InvalidGrantError, match="Invalid refresh token"):
            await service.refresh_tokens(
                db=db,
                refresh_token="invalid_token",
                client_id=public_client.client_id,
            )

    @pytest.mark.asyncio
    async def test_refresh_tokens_scope_reduction(self, db, public_client, test_user):
        """Test refreshing with reduced scope."""
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid profile email",
            )

            new_result = await service.refresh_tokens(
                db=db,
                refresh_token=result["refresh_token"],
                client_id=public_client.client_id,
                scope="openid",  # Reduced scope
            )

        assert "openid" in new_result["scope"]
        assert "profile" not in new_result["scope"]

    @pytest.mark.asyncio
    async def test_refresh_tokens_scope_expansion_fails(
        self, db, public_client, test_user
    ):
        """Test refreshing with expanded scope fails."""
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid",
            )

            with pytest.raises(service.InvalidScopeError, match="Cannot expand scope"):
                await service.refresh_tokens(
                    db=db,
                    refresh_token=result["refresh_token"],
                    client_id=public_client.client_id,
                    scope="openid profile",  # Expanded scope
                )


class TestTokenRevocation:
    """Tests for token revocation."""

    @pytest.mark.asyncio
    async def test_revoke_refresh_token(self, db, public_client, test_user):
        """Test revoking a refresh token."""
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid",
            )

            # Revoke the token
            revoked = await service.revoke_token(
                db=db,
                token=result["refresh_token"],
                token_type_hint="refresh_token",
            )

        assert revoked is True

        # Try to use revoked token
        with pytest.raises(service.InvalidGrantError, match="revoked"):
            await service.refresh_tokens(
                db=db,
                refresh_token=result["refresh_token"],
                client_id=public_client.client_id,
            )

    @pytest.mark.asyncio
    async def test_revoke_all_user_tokens(self, db, public_client, test_user):
        """Test revoking all tokens for a user."""
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            # Create multiple tokens (we don't need to capture results)
            await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid",
            )
            await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="profile",
            )

            # Revoke all
            count = await service.revoke_all_user_tokens(db, test_user.id)
            assert count == 2


class TestTokenIntrospection:
    """Tests for token introspection (RFC 7662)."""

    @pytest.mark.asyncio
    async def test_introspect_valid_access_token(self, db, public_client, test_user):
        """Test introspecting a valid access token."""
        with patch("app.services.oauth_provider_service.settings") as mock_settings:
            mock_settings.OAUTH_ISSUER = "http://localhost:8000"
            mock_settings.SECRET_KEY = "test_secret_key_for_jwt_signing_123456"
            mock_settings.ALGORITHM = "HS256"

            result = await service.create_tokens(
                db=db,
                client=public_client,
                user=test_user,
                scope="openid profile",
            )

            introspection = await service.introspect_token(
                db=db,
                token=result["access_token"],
            )

        assert introspection["active"] is True
        assert introspection["client_id"] == public_client.client_id
        assert introspection["sub"] == str(test_user.id)

    @pytest.mark.asyncio
    async def test_introspect_invalid_token(self, db):
        """Test introspecting an invalid token."""
        introspection = await service.introspect_token(
            db=db,
            token="invalid_token",
        )
        assert introspection["active"] is False


class TestConsentManagement:
    """Tests for consent management."""

    @pytest.mark.asyncio
    async def test_grant_consent(self, db, public_client, test_user):
        """Test granting consent."""
        consent = await service.grant_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            scopes=["openid", "profile"],
        )

        assert consent is not None
        assert "openid" in consent.granted_scopes
        assert "profile" in consent.granted_scopes

    @pytest.mark.asyncio
    async def test_check_consent_granted(self, db, public_client, test_user):
        """Test checking granted consent."""
        await service.grant_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            scopes=["openid", "profile"],
        )

        has_consent = await service.check_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            requested_scopes=["openid"],
        )
        assert has_consent is True

    @pytest.mark.asyncio
    async def test_check_consent_not_granted(self, db, public_client, test_user):
        """Test checking consent that hasn't been granted."""
        has_consent = await service.check_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            requested_scopes=["openid"],
        )
        assert has_consent is False

    @pytest.mark.asyncio
    async def test_revoke_consent(self, db, public_client, test_user):
        """Test revoking consent."""
        await service.grant_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            scopes=["openid"],
        )

        revoked = await service.revoke_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
        )
        assert revoked is True

        # Check consent is gone
        has_consent = await service.check_consent(
            db=db,
            user_id=test_user.id,
            client_id=public_client.client_id,
            requested_scopes=["openid"],
        )
        assert has_consent is False


class TestOAuthErrors:
    """Tests for OAuth error classes."""

    def test_invalid_client_error(self):
        """Test InvalidClientError."""
        error = service.InvalidClientError("Test description")
        assert error.error == "invalid_client"
        assert error.error_description == "Test description"

    def test_invalid_grant_error(self):
        """Test InvalidGrantError."""
        error = service.InvalidGrantError("Test description")
        assert error.error == "invalid_grant"
        assert error.error_description == "Test description"

    def test_invalid_request_error(self):
        """Test InvalidRequestError."""
        error = service.InvalidRequestError("Test description")
        assert error.error == "invalid_request"
        assert error.error_description == "Test description"

    def test_invalid_scope_error(self):
        """Test InvalidScopeError."""
        error = service.InvalidScopeError("Test description")
        assert error.error == "invalid_scope"
        assert error.error_description == "Test description"

    def test_access_denied_error(self):
        """Test AccessDeniedError."""
        error = service.AccessDeniedError("Test description")
        assert error.error == "access_denied"
        assert error.error_description == "Test description"
