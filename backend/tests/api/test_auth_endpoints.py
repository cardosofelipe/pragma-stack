# tests/api/test_auth_endpoints.py
"""
Tests for authentication endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import status

from app.models.user import User
from app.schemas.users import UserCreate


# Disable rate limiting for tests
@pytest.fixture(autouse=True)
def disable_rate_limit():
    """Disable rate limiting for all tests in this module."""
    with patch('app.api.routes.auth.limiter.enabled', False):
        yield


class TestRegisterEndpoint:
    """Tests for POST /auth/register endpoint."""

    def test_register_success(self, client, test_db):
        """Test successful user registration."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePassword123",
                "first_name": "New",
                "last_name": "User"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert "password" not in data

    def test_register_duplicate_email(self, client, test_user):
        """Test registering with existing email."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "SecurePassword123",
                "first_name": "Duplicate",
                "last_name": "User"
            }
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        data = response.json()
        assert data["success"] is False

    def test_register_weak_password(self, client):
        """Test registration with weak password."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weakpass@example.com",
                "password": "weak",
                "first_name": "Weak",
                "last_name": "Pass"
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_unexpected_error(self, client, test_db):
        """Test registration with unexpected error."""
        with patch('app.services.auth_service.AuthService.create_user') as mock_create:
            mock_create.side_effect = Exception("Unexpected error")

            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "error@example.com",
                    "password": "SecurePassword123",
                    "first_name": "Error",
                    "last_name": "User"
                }
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestLoginEndpoint:
    """Tests for POST /auth/login endpoint."""

    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword123"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent email."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "Password123"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, client, test_user, test_db):
        """Test login with inactive user."""
        test_user.is_active = False
        test_db.add(test_user)
        test_db.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_unexpected_error(self, client, test_user):
        """Test login with unexpected error."""
        with patch('app.services.auth_service.AuthService.authenticate_user') as mock_auth:
            mock_auth.side_effect = Exception("Database error")

            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": test_user.email,
                    "password": "TestPassword123"
                }
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestOAuthLoginEndpoint:
    """Tests for POST /auth/login/oauth endpoint."""

    def test_oauth_login_success(self, client, test_user):
        """Test successful OAuth login."""
        response = client.post(
            "/api/v1/auth/login/oauth",
            data={
                "username": test_user.email,
                "password": "TestPassword123"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_oauth_login_wrong_credentials(self, client, test_user):
        """Test OAuth login with wrong credentials."""
        response = client.post(
            "/api/v1/auth/login/oauth",
            data={
                "username": test_user.email,
                "password": "WrongPassword"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_oauth_login_inactive_user(self, client, test_user, test_db):
        """Test OAuth login with inactive user."""
        test_user.is_active = False
        test_db.add(test_user)
        test_db.commit()

        response = client.post(
            "/api/v1/auth/login/oauth",
            data={
                "username": test_user.email,
                "password": "TestPassword123"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_oauth_login_unexpected_error(self, client, test_user):
        """Test OAuth login with unexpected error."""
        with patch('app.services.auth_service.AuthService.authenticate_user') as mock_auth:
            mock_auth.side_effect = Exception("Unexpected error")

            response = client.post(
                "/api/v1/auth/login/oauth",
                data={
                    "username": test_user.email,
                    "password": "TestPassword123"
                }
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestRefreshTokenEndpoint:
    """Tests for POST /auth/refresh endpoint."""

    def test_refresh_token_success(self, client, test_user):
        """Test successful token refresh."""
        # First, login to get a refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )
        refresh_token = login_response.json()["refresh_token"]

        # Now refresh the token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_expired(self, client):
        """Test refresh with expired token."""
        from app.core.auth import TokenExpiredError

        with patch('app.services.auth_service.AuthService.refresh_tokens') as mock_refresh:
            mock_refresh.side_effect = TokenExpiredError("Token expired")

            response = client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": "some_token"}
            )

            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_unexpected_error(self, client, test_user):
        """Test refresh with unexpected error."""
        # Get a valid refresh token first
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )
        refresh_token = login_response.json()["refresh_token"]

        with patch('app.services.auth_service.AuthService.refresh_tokens') as mock_refresh:
            mock_refresh.side_effect = Exception("Unexpected error")

            response = client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token}
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestGetCurrentUserEndpoint:
    """Tests for GET /auth/me endpoint."""

    def test_get_current_user_success(self, client, test_user):
        """Test getting current user info."""
        # First, login to get an access token
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPassword123"
            }
        )
        access_token = login_response.json()["access_token"]

        # Get current user info
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user.email
        assert data["first_name"] == test_user.first_name

    def test_get_current_user_no_token(self, client):
        """Test getting current user without token."""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_expired_token(self, client):
        """Test getting current user with expired token."""
        # Use a clearly invalid/malformed token
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
