# tests/api/test_auth.py
"""
Tests for authentication endpoints.
"""

import pytest
import pytest_asyncio
from fastapi import status


class TestRegisterEndpoint:
    """Tests for POST /auth/register endpoint."""

    @pytest.mark.asyncio
    async def test_register_success(self, client):
        """Test successful user registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "NewPassword123!",
                "first_name": "New",
                "last_name": "User",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client, async_test_user):
        """Test registration with duplicate email."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": async_test_user.email,
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client):
        """Test registration with weak password."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "weak",
                "first_name": "Test",
                "last_name": "User",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLoginEndpoint:
    """Tests for POST /auth/login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, client, async_test_user):
        """Test successful login."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client, async_test_user):
        """Test login with invalid password."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "WrongPassword123!"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client, async_test_db):
        """Test login with inactive user."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            from app.core.auth import get_password_hash
            from app.models.user import User

            inactive_user = User(
                email="inactive@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="Inactive",
                last_name="User",
                is_active=False,
            )
            session.add(inactive_user)
            await session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@example.com", "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRefreshTokenEndpoint:
    """Tests for POST /auth/refresh endpoint."""

    @pytest_asyncio.fixture
    async def refresh_token(self, client, async_test_user):
        """Get a refresh token for testing."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        return response.json()["refresh_token"]

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client, refresh_token):
        """Test successful token refresh."""
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "invalid.token.here"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogoutEndpoint:
    """Tests for POST /auth/logout endpoint."""

    @pytest_asyncio.fixture
    async def tokens(self, client, async_test_user):
        """Get tokens for testing."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        data = response.json()
        return {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
        }

    @pytest.mark.asyncio
    async def test_logout_success(self, client, tokens):
        """Test successful logout."""
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]},
        )

        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_logout_without_auth(self, client):
        """Test logout without authentication."""
        response = await client.post(
            "/api/v1/auth/logout", json={"refresh_token": "some.token"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPasswordResetRequest:
    """Tests for POST /auth/password-reset/request endpoint."""

    @pytest.mark.asyncio
    async def test_password_reset_request_success(self, client, async_test_user):
        """Test password reset request with existing user."""
        response = await client.post(
            "/api/v1/auth/password-reset/request", json={"email": async_test_user.email}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_password_reset_request_nonexistent_email(self, client):
        """Test password reset request with non-existent email."""
        response = await client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "nonexistent@example.com"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestPasswordResetConfirm:
    """Tests for POST /auth/password-reset/confirm endpoint."""

    @pytest.mark.asyncio
    async def test_password_reset_confirm_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": "invalid.token.here", "new_password": "NewPassword123!"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLogoutAll:
    """Tests for POST /auth/logout-all endpoint."""

    @pytest_asyncio.fixture
    async def tokens(self, client, async_test_user):
        """Get tokens for testing."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        data = response.json()
        return {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
        }

    @pytest.mark.asyncio
    async def test_logout_all_success(self, client, tokens):
        """Test logout from all devices."""
        response = await client.post(
            "/api/v1/auth/logout-all",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "sessions terminated" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_logout_all_unauthorized(self, client):
        """Test logout-all without authentication."""
        response = await client.post("/api/v1/auth/logout-all")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestOAuthLogin:
    """Tests for POST /auth/login/oauth endpoint."""

    @pytest.mark.asyncio
    async def test_oauth_login_success(self, client, async_test_user):
        """Test successful OAuth login."""
        response = await client.post(
            "/api/v1/auth/login/oauth",
            data={"username": "testuser@example.com", "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_oauth_login_invalid_credentials(self, client, async_test_user):
        """Test OAuth login with invalid credentials."""
        response = await client.post(
            "/api/v1/auth/login/oauth",
            data={"username": "testuser@example.com", "password": "WrongPassword"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
