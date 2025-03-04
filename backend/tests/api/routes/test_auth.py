# tests/api/routes/test_auth.py
import json
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock, Mock

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.routes.auth import router as auth_router
from app.core.auth import get_password_hash
from app.core.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService, AuthenticationError
from app.core.auth import TokenExpiredError, TokenInvalidError


# Mock the get_db dependency
@pytest.fixture
def override_get_db(db_session):
    """Override get_db dependency for testing."""
    return db_session


@pytest.fixture
def app(override_get_db):
    """Create a FastAPI test application with overridden dependencies."""
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth", tags=["auth"])

    # Override the get_db dependency
    app.dependency_overrides[get_db] = lambda: override_get_db

    return app


@pytest.fixture
def client(app):
    """Create a FastAPI test client."""
    return TestClient(app)


class TestRegisterUser:
    """Tests for the register_user endpoint."""

    def test_register_user_success(self, client, monkeypatch, db_session):
        """Test successful user registration."""
        # Mock the service method with a valid complete User object
        mock_user = User(
            id=uuid.uuid4(),
            email="newuser@example.com",
            password_hash="hashed_password",
            first_name="New",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Use patch for mocking
        with patch.object(AuthService, 'create_user', return_value=mock_user):
            # Test request
            response = client.post(
                "/auth/register",
                json={
                    "email": "newuser@example.com",
                    "password": "Password123",
                    "first_name": "New",
                    "last_name": "User"
                }
            )

            # Assertions
            assert response.status_code == 201
            data = response.json()
            assert data["email"] == "newuser@example.com"
            assert data["first_name"] == "New"
            assert data["last_name"] == "User"
            assert "password" not in data

    def test_register_user_duplicate_email(self, client, db_session):
        """Test registration with duplicate email."""
        # Use patch for mocking with a side effect
        with patch.object(AuthService, 'create_user',
                          side_effect=AuthenticationError("User with this email already exists")):
            # Test request
            response = client.post(
                "/auth/register",
                json={
                    "email": "existing@example.com",
                    "password": "Password123",
                    "first_name": "Existing",
                    "last_name": "User"
                }
            )

            # Assertions
            assert response.status_code == 409
            assert "already exists" in response.json()["detail"]


class TestLogin:
    """Tests for the login endpoint."""

    def test_login_success(self, client, mock_user, db_session):
        """Test successful login."""
        # Ensure mock_user has required attributes
        if not hasattr(mock_user, 'created_at') or mock_user.created_at is None:
            mock_user.created_at = datetime.now(timezone.utc)
        if not hasattr(mock_user, 'updated_at') or mock_user.updated_at is None:
            mock_user.updated_at = datetime.now(timezone.utc)

        # Create mock tokens
        mock_tokens = MagicMock(
            access_token="mock_access_token",
            refresh_token="mock_refresh_token",
            token_type="bearer"
        )

        # Use context managers for patching
        with patch.object(AuthService, 'authenticate_user', return_value=mock_user), \
                patch.object(AuthService, 'create_tokens', return_value=mock_tokens):

            # Test request
            response = client.post(
                "/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "Password123"
                }
            )

            # Assertions
            assert response.status_code == 200
            data = response.json()
            assert data["access_token"] == "mock_access_token"
            assert data["refresh_token"] == "mock_refresh_token"
            assert data["token_type"] == "bearer"


    def test_login_invalid_credentials_debug(self, client, app):
        """Improved test for login with invalid credentials."""
        # Print response for debugging
        from app.services.auth_service import AuthService

        # Create a complete mock for AuthService
        class MockAuthService:
            @staticmethod
            def authenticate_user(db, email, password):
                print(f"Mock called with: {email}, {password}")
                return None

        # Replace the entire class with our mock
        original_service = AuthService
        try:
            # Replace with our mock
            import sys
            sys.modules['app.services.auth_service'].AuthService = MockAuthService

            # Make the request
            response = client.post(
                "/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "WrongPassword"
                }
            )

            # Print response details for debugging
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")

            # Assertions
            assert response.status_code == 401
            assert "Invalid email or password" in response.json()["detail"]
        finally:
            # Restore original service
            sys.modules['app.services.auth_service'].AuthService = original_service


    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user."""
        # Mock authentication to raise an error
        with patch.object(AuthService, 'authenticate_user',
                          side_effect=AuthenticationError("User account is inactive")):
            # Test request
            response = client.post(
                "/auth/login",
                json={
                    "email": "inactive@example.com",
                    "password": "Password123"
                }
            )

            # Assertions
            assert response.status_code == 401
            assert "inactive" in response.json()["detail"]


class TestRefreshToken:
    """Tests for the refresh_token endpoint."""

    def test_refresh_token_success(self, client, db_session):
        """Test successful token refresh."""
        # Mock refresh to return tokens
        mock_tokens = MagicMock(
            access_token="new_access_token",
            refresh_token="new_refresh_token",
            token_type="bearer"
        )

        with patch.object(AuthService, 'refresh_tokens', return_value=mock_tokens):
            # Test request
            response = client.post(
                "/auth/refresh",
                json={
                    "refresh_token": "valid_refresh_token"
                }
            )

            # Assertions
            assert response.status_code == 200
            data = response.json()
            assert data["access_token"] == "new_access_token"
            assert data["refresh_token"] == "new_refresh_token"
            assert data["token_type"] == "bearer"

    def test_refresh_token_expired(self, client, db_session):
        """Test refresh with expired token."""
        # Mock refresh to raise expired token error
        with patch.object(AuthService, 'refresh_tokens',
                          side_effect=TokenExpiredError("Token expired")):
            # Test request
            response = client.post(
                "/auth/refresh",
                json={
                    "refresh_token": "expired_refresh_token"
                }
            )

            # Assertions
            assert response.status_code == 401
            assert "expired" in response.json()["detail"]

    def test_refresh_token_invalid(self, client, db_session):
        """Test refresh with invalid token."""
        # Mock refresh to raise invalid token error
        with patch.object(AuthService, 'refresh_tokens',
                          side_effect=TokenInvalidError("Invalid token")):
            # Test request
            response = client.post(
                "/auth/refresh",
                json={
                    "refresh_token": "invalid_refresh_token"
                }
            )

            # Assertions
            assert response.status_code == 401
            assert "Invalid" in response.json()["detail"]


class TestChangePassword:
    """Tests for the change_password endpoint."""

    def test_change_password_success(self, client, mock_user, db_session, app):
        """Test successful password change."""
        # Ensure mock_user has required attributes
        if not hasattr(mock_user, 'created_at') or mock_user.created_at is None:
            mock_user.created_at = datetime.now(timezone.utc)
        if not hasattr(mock_user, 'updated_at') or mock_user.updated_at is None:
            mock_user.updated_at = datetime.now(timezone.utc)

        # Override get_current_user dependency
        from app.api.dependencies.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        # Mock password change to return success
        with patch.object(AuthService, 'change_password', return_value=True):
            # Test request
            response = client.post(
                "/auth/change-password",
                json={
                    "current_password": "OldPassword123",
                    "new_password": "NewPassword123"
                }
            )

            # Assertions
            assert response.status_code == 200
            assert "success" in response.json()["message"].lower()

        # Clean up override
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_change_password_incorrect_current_password(self, client, mock_user, db_session, app):
        """Test change password with incorrect current password."""
        # Ensure mock_user has required attributes
        if not hasattr(mock_user, 'created_at') or mock_user.created_at is None:
            mock_user.created_at = datetime.now(timezone.utc)
        if not hasattr(mock_user, 'updated_at') or mock_user.updated_at is None:
            mock_user.updated_at = datetime.now(timezone.utc)

        # Override get_current_user dependency
        from app.api.dependencies.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        # Mock password change to raise error
        with patch.object(AuthService, 'change_password',
                          side_effect=AuthenticationError("Current password is incorrect")):
            # Test request
            response = client.post(
                "/auth/change-password",
                json={
                    "current_password": "WrongPassword",
                    "new_password": "NewPassword123"
                }
            )

            # Assertions
            assert response.status_code == 400
            assert "incorrect" in response.json()["detail"].lower()

        # Clean up override
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


class TestGetCurrentUserInfo:
    """Tests for the get_current_user_info endpoint."""

    def test_get_current_user_info(self, client, mock_user, app):
        """Test getting current user info."""
        # Ensure mock_user has required attributes
        if not hasattr(mock_user, 'created_at') or mock_user.created_at is None:
            mock_user.created_at = datetime.now(timezone.utc)
        if not hasattr(mock_user, 'updated_at') or mock_user.updated_at is None:
            mock_user.updated_at = datetime.now(timezone.utc)

        # Override get_current_user dependency
        from app.api.dependencies.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: mock_user

        # Test request
        response = client.get("/auth/me")

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == mock_user.email
        assert data["first_name"] == mock_user.first_name
        assert data["last_name"] == mock_user.last_name
        assert "password" not in data

        # Clean up override
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_get_current_user_info_unauthorized(self, client):
        """Test getting user info without authentication."""
        # Test request without authentication
        response = client.get("/auth/me")

        # Assertions
        assert response.status_code == 401