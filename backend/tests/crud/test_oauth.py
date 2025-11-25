# tests/crud/test_oauth.py
"""
Comprehensive tests for OAuth CRUD operations.
"""

from datetime import UTC, datetime, timedelta

import pytest

from app.crud.oauth import oauth_account, oauth_client, oauth_state
from app.schemas.oauth import OAuthAccountCreate, OAuthClientCreate, OAuthStateCreate


class TestOAuthAccountCRUD:
    """Tests for OAuth account CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_account(self, async_test_db, async_test_user):
        """Test creating an OAuth account link."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_123456",
                provider_email="user@gmail.com",
            )
            account = await oauth_account.create_account(session, obj_in=account_data)

            assert account is not None
            assert account.provider == "google"
            assert account.provider_user_id == "google_123456"
            assert account.user_id == async_test_user.id

    @pytest.mark.asyncio
    async def test_create_account_same_provider_twice_fails(
        self, async_test_db, async_test_user
    ):
        """Test creating same OAuth account for same user twice raises error."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_dup_123",
                provider_email="user@gmail.com",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        # Try to create same account again (same provider + provider_user_id)
        async with AsyncTestingSessionLocal() as session:
            account_data2 = OAuthAccountCreate(
                user_id=async_test_user.id,  # Same user
                provider="google",
                provider_user_id="google_dup_123",  # Same provider_user_id
                provider_email="user@gmail.com",
            )

            # SQLite returns different error message than PostgreSQL
            with pytest.raises(
                ValueError, match="(already linked|UNIQUE constraint failed)"
            ):
                await oauth_account.create_account(session, obj_in=account_data2)

    @pytest.mark.asyncio
    async def test_get_by_provider_id(self, async_test_db, async_test_user):
        """Test getting OAuth account by provider and provider user ID."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="github",
                provider_user_id="github_789",
                provider_email="user@github.com",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_account.get_by_provider_id(
                session,
                provider="github",
                provider_user_id="github_789",
            )
            assert result is not None
            assert result.provider == "github"
            assert result.user is not None  # Eager loaded

    @pytest.mark.asyncio
    async def test_get_by_provider_id_not_found(self, async_test_db):
        """Test getting non-existent OAuth account returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_account.get_by_provider_id(
                session,
                provider="google",
                provider_user_id="nonexistent",
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_get_user_accounts(self, async_test_db, async_test_user):
        """Test getting all OAuth accounts for a user."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # Create two accounts for the same user
            for provider in ["google", "github"]:
                account_data = OAuthAccountCreate(
                    user_id=async_test_user.id,
                    provider=provider,
                    provider_user_id=f"{provider}_user_123",
                    provider_email=f"user@{provider}.com",
                )
                await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            accounts = await oauth_account.get_user_accounts(
                session, user_id=async_test_user.id
            )
            assert len(accounts) == 2
            providers = {a.provider for a in accounts}
            assert providers == {"google", "github"}

    @pytest.mark.asyncio
    async def test_get_user_account_by_provider(self, async_test_db, async_test_user):
        """Test getting specific OAuth account for user and provider."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_specific",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_account.get_user_account_by_provider(
                session,
                user_id=async_test_user.id,
                provider="google",
            )
            assert result is not None
            assert result.provider == "google"

            # Test not found
            result2 = await oauth_account.get_user_account_by_provider(
                session,
                user_id=async_test_user.id,
                provider="github",  # Not linked
            )
            assert result2 is None

    @pytest.mark.asyncio
    async def test_delete_account(self, async_test_db, async_test_user):
        """Test deleting an OAuth account link."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_to_delete",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            deleted = await oauth_account.delete_account(
                session,
                user_id=async_test_user.id,
                provider="google",
            )
            assert deleted is True

        # Verify deletion
        async with AsyncTestingSessionLocal() as session:
            result = await oauth_account.get_user_account_by_provider(
                session,
                user_id=async_test_user.id,
                provider="google",
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_delete_account_not_found(self, async_test_db, async_test_user):
        """Test deleting non-existent account returns False."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            deleted = await oauth_account.delete_account(
                session,
                user_id=async_test_user.id,
                provider="nonexistent",
            )
            assert deleted is False

    @pytest.mark.asyncio
    async def test_get_by_provider_email(self, async_test_db, async_test_user):
        """Test getting OAuth account by provider and email."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_email_test",
                provider_email="unique@gmail.com",
            )
            await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_account.get_by_provider_email(
                session,
                provider="google",
                email="unique@gmail.com",
            )
            assert result is not None
            assert result.provider_email == "unique@gmail.com"

            # Test not found
            result2 = await oauth_account.get_by_provider_email(
                session,
                provider="google",
                email="nonexistent@gmail.com",
            )
            assert result2 is None

    @pytest.mark.asyncio
    async def test_update_tokens(self, async_test_db, async_test_user):
        """Test updating OAuth tokens."""
        from datetime import UTC, datetime, timedelta

        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            account_data = OAuthAccountCreate(
                user_id=async_test_user.id,
                provider="google",
                provider_user_id="google_token_test",
            )
            account = await oauth_account.create_account(session, obj_in=account_data)

        async with AsyncTestingSessionLocal() as session:
            # Get the account first
            account = await oauth_account.get_by_provider_id(
                session, provider="google", provider_user_id="google_token_test"
            )
            assert account is not None

            # Update tokens
            new_expires = datetime.now(UTC) + timedelta(hours=1)
            updated = await oauth_account.update_tokens(
                session,
                account=account,
                access_token_encrypted="new_access_token",
                refresh_token_encrypted="new_refresh_token",
                token_expires_at=new_expires,
            )

            assert updated.access_token_encrypted == "new_access_token"
            assert updated.refresh_token_encrypted == "new_refresh_token"


class TestOAuthStateCRUD:
    """Tests for OAuth state CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_state(self, async_test_db):
        """Test creating OAuth state."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            state_data = OAuthStateCreate(
                state="random_state_123",
                code_verifier="pkce_verifier",
                nonce="oidc_nonce",
                provider="google",
                redirect_uri="http://localhost:3000/callback",
                expires_at=datetime.now(UTC) + timedelta(minutes=10),
            )
            state = await oauth_state.create_state(session, obj_in=state_data)

            assert state is not None
            assert state.state == "random_state_123"
            assert state.code_verifier == "pkce_verifier"
            assert state.provider == "google"

    @pytest.mark.asyncio
    async def test_get_and_consume_state(self, async_test_db):
        """Test getting and consuming OAuth state."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            state_data = OAuthStateCreate(
                state="consume_state_123",
                provider="github",
                expires_at=datetime.now(UTC) + timedelta(minutes=10),
            )
            await oauth_state.create_state(session, obj_in=state_data)

        # Consume the state
        async with AsyncTestingSessionLocal() as session:
            result = await oauth_state.get_and_consume_state(
                session, state="consume_state_123"
            )
            assert result is not None
            assert result.provider == "github"

        # Try to consume again - should be None (already consumed)
        async with AsyncTestingSessionLocal() as session:
            result2 = await oauth_state.get_and_consume_state(
                session, state="consume_state_123"
            )
            assert result2 is None

    @pytest.mark.asyncio
    async def test_get_and_consume_expired_state(self, async_test_db):
        """Test consuming expired state returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # Create expired state
            state_data = OAuthStateCreate(
                state="expired_state_123",
                provider="google",
                expires_at=datetime.now(UTC) - timedelta(minutes=1),  # Already expired
            )
            await oauth_state.create_state(session, obj_in=state_data)

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_state.get_and_consume_state(
                session, state="expired_state_123"
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_cleanup_expired_states(self, async_test_db):
        """Test cleaning up expired OAuth states."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # Create expired state
            expired_state = OAuthStateCreate(
                state="cleanup_expired",
                provider="google",
                expires_at=datetime.now(UTC) - timedelta(minutes=5),
            )
            await oauth_state.create_state(session, obj_in=expired_state)

            # Create valid state
            valid_state = OAuthStateCreate(
                state="cleanup_valid",
                provider="google",
                expires_at=datetime.now(UTC) + timedelta(minutes=10),
            )
            await oauth_state.create_state(session, obj_in=valid_state)

        # Cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await oauth_state.cleanup_expired(session)
            assert count == 1

        # Verify only expired was deleted
        async with AsyncTestingSessionLocal() as session:
            result = await oauth_state.get_and_consume_state(
                session, state="cleanup_valid"
            )
            assert result is not None


class TestOAuthClientCRUD:
    """Tests for OAuth client CRUD operations (provider mode)."""

    @pytest.mark.asyncio
    async def test_create_public_client(self, async_test_db):
        """Test creating a public OAuth client."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Test MCP App",
                client_description="A test application",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
                client_type="public",
            )
            client, secret = await oauth_client.create_client(
                session, obj_in=client_data
            )

            assert client is not None
            assert client.client_name == "Test MCP App"
            assert client.client_type == "public"
            assert secret is None  # Public clients don't have secrets

    @pytest.mark.asyncio
    async def test_create_confidential_client(self, async_test_db):
        """Test creating a confidential OAuth client."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Confidential App",
                redirect_uris=["http://localhost:8080/callback"],
                allowed_scopes=["read:users", "write:users"],
                client_type="confidential",
            )
            client, secret = await oauth_client.create_client(
                session, obj_in=client_data
            )

            assert client is not None
            assert client.client_type == "confidential"
            assert secret is not None  # Confidential clients have secrets
            assert len(secret) > 20  # Should be a reasonably long secret

    @pytest.mark.asyncio
    async def test_get_by_client_id(self, async_test_db):
        """Test getting OAuth client by client_id."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        created_client_id = None
        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Lookup Test",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
            )
            client, _ = await oauth_client.create_client(session, obj_in=client_data)
            created_client_id = client.client_id

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_client.get_by_client_id(
                session, client_id=created_client_id
            )
            assert result is not None
            assert result.client_name == "Lookup Test"

    @pytest.mark.asyncio
    async def test_get_inactive_client_not_found(self, async_test_db):
        """Test getting inactive OAuth client returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        created_client_id = None
        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Inactive Client",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
            )
            client, _ = await oauth_client.create_client(session, obj_in=client_data)
            created_client_id = client.client_id

            # Deactivate
            await oauth_client.deactivate_client(session, client_id=created_client_id)

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_client.get_by_client_id(
                session, client_id=created_client_id
            )
            assert result is None  # Inactive clients not returned

    @pytest.mark.asyncio
    async def test_validate_redirect_uri(self, async_test_db):
        """Test redirect URI validation."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        created_client_id = None
        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="URI Test",
                redirect_uris=[
                    "http://localhost:3000/callback",
                    "http://localhost:8080/oauth",
                ],
                allowed_scopes=["read:users"],
            )
            client, _ = await oauth_client.create_client(session, obj_in=client_data)
            created_client_id = client.client_id

        async with AsyncTestingSessionLocal() as session:
            # Valid URI
            valid = await oauth_client.validate_redirect_uri(
                session,
                client_id=created_client_id,
                redirect_uri="http://localhost:3000/callback",
            )
            assert valid is True

            # Invalid URI
            invalid = await oauth_client.validate_redirect_uri(
                session,
                client_id=created_client_id,
                redirect_uri="http://evil.com/callback",
            )
            assert invalid is False

    @pytest.mark.asyncio
    async def test_verify_client_secret(self, async_test_db):
        """Test client secret verification."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        created_client_id = None
        created_secret = None
        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Secret Test",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
                client_type="confidential",
            )
            client, secret = await oauth_client.create_client(
                session, obj_in=client_data
            )
            created_client_id = client.client_id
            created_secret = secret

        async with AsyncTestingSessionLocal() as session:
            # Valid secret
            valid = await oauth_client.verify_client_secret(
                session,
                client_id=created_client_id,
                client_secret=created_secret,
            )
            assert valid is True

            # Invalid secret
            invalid = await oauth_client.verify_client_secret(
                session,
                client_id=created_client_id,
                client_secret="wrong_secret",
            )
            assert invalid is False

    @pytest.mark.asyncio
    async def test_deactivate_nonexistent_client(self, async_test_db):
        """Test deactivating non-existent client returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await oauth_client.deactivate_client(
                session, client_id="nonexistent_client_id"
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_validate_redirect_uri_nonexistent_client(self, async_test_db):
        """Test validate_redirect_uri returns False for non-existent client."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            valid = await oauth_client.validate_redirect_uri(
                session,
                client_id="nonexistent_client_id",
                redirect_uri="http://localhost:3000/callback",
            )
            assert valid is False

    @pytest.mark.asyncio
    async def test_verify_secret_nonexistent_client(self, async_test_db):
        """Test verify_client_secret returns False for non-existent client."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            valid = await oauth_client.verify_client_secret(
                session,
                client_id="nonexistent_client_id",
                client_secret="any_secret",
            )
            assert valid is False

    @pytest.mark.asyncio
    async def test_verify_secret_public_client(self, async_test_db):
        """Test verify_client_secret returns False for public client (no secret)."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            client_data = OAuthClientCreate(
                client_name="Public Client",
                redirect_uris=["http://localhost:3000/callback"],
                allowed_scopes=["read:users"],
                client_type="public",  # Public client - no secret
            )
            client, secret = await oauth_client.create_client(
                session, obj_in=client_data
            )
            assert secret is None

        async with AsyncTestingSessionLocal() as session:
            # Public clients don't have secrets, so verification should fail
            valid = await oauth_client.verify_client_secret(
                session,
                client_id=client.client_id,
                client_secret="any_secret",
            )
            assert valid is False
