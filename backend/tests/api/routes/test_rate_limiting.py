# tests/api/routes/test_rate_limiting.py
import os
import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.api.routes.auth import router as auth_router, limiter
from app.api.routes.users import router as users_router
from app.core.database import get_db

# Skip all rate limiting tests when IS_TEST=True (rate limits are disabled in test mode)
pytestmark = pytest.mark.skipif(
    os.getenv("IS_TEST", "False") == "True",
    reason="Rate limits are disabled in test mode (RATE_MULTIPLIER=100)"
)


# Mock the get_db dependency
@pytest.fixture
def override_get_db():
    """Override get_db dependency for testing."""
    mock_db = MagicMock()
    return mock_db


@pytest.fixture
def app(override_get_db):
    """Create a FastAPI test application with rate limiting."""
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded

    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/v1/users", tags=["users"])

    # Override the get_db dependency
    app.dependency_overrides[get_db] = lambda: override_get_db

    return app


@pytest.fixture
def client(app):
    """Create a FastAPI test client."""
    return TestClient(app)


class TestRegisterRateLimiting:
    """Tests for rate limiting on /register endpoint"""

    def test_register_rate_limit_blocks_over_limit(self, client):
        """Test that requests over rate limit are blocked"""
        from app.services.auth_service import AuthService
        from app.models.user import User
        from datetime import datetime, timezone
        import uuid

        mock_user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(AuthService, 'create_user', return_value=mock_user):
            user_data = {
                "email": f"test{uuid.uuid4()}@example.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            }

            # Make 6 requests (limit is 5/minute)
            responses = []
            for i in range(6):
                response = client.post("/auth/register", json=user_data)
                responses.append(response)

            # Last request should be rate limited
            assert responses[-1].status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestLoginRateLimiting:
    """Tests for rate limiting on /login endpoint"""

    def test_login_rate_limit_blocks_over_limit(self, client):
        """Test that login requests over rate limit are blocked"""
        from app.services.auth_service import AuthService

        with patch.object(AuthService, 'authenticate_user', return_value=None):
            login_data = {
                "email": "test@example.com",
                "password": "wrong_password"
            }

            # Make 11 requests (limit is 10/minute)
            responses = []
            for i in range(11):
                response = client.post("/auth/login", json=login_data)
                responses.append(response)

            # Last request should be rate limited
            assert responses[-1].status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestRefreshTokenRateLimiting:
    """Tests for rate limiting on /refresh endpoint"""

    def test_refresh_rate_limit_blocks_over_limit(self, client):
        """Test that refresh requests over rate limit are blocked"""
        from app.services.auth_service import AuthService
        from app.core.auth import TokenInvalidError

        with patch.object(AuthService, 'refresh_tokens', side_effect=TokenInvalidError("Invalid")):
            refresh_data = {
                "refresh_token": "invalid_token"
            }

            # Make 31 requests (limit is 30/minute)
            responses = []
            for i in range(31):
                response = client.post("/auth/refresh", json=refresh_data)
                responses.append(response)

            # Last request should be rate limited
            assert responses[-1].status_code == status.HTTP_429_TOO_MANY_REQUESTS


class TestChangePasswordRateLimiting:
    """Tests for rate limiting on /change-password endpoint"""

    def test_change_password_rate_limit_blocks_over_limit(self, client):
        """Test that change password requests over rate limit are blocked"""
        from app.api.dependencies.auth import get_current_user
        from app.models.user import User
        from app.services.auth_service import AuthService, AuthenticationError
        from datetime import datetime, timezone
        import uuid

        # Mock current user
        mock_user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Override get_current_user dependency in the app
        test_app = client.app
        test_app.dependency_overrides[get_current_user] = lambda: mock_user

        with patch.object(AuthService, 'change_password', side_effect=AuthenticationError("Invalid password")):
            password_data = {
                "current_password": "wrong_password",
                "new_password": "NewPassword123!"
            }

            # Make 6 requests (limit is 5/minute) - using new endpoint
            responses = []
            for i in range(6):
                response = client.patch("/api/v1/users/me/password", json=password_data)
                responses.append(response)

            # Last request should be rate limited
            assert responses[-1].status_code == status.HTTP_429_TOO_MANY_REQUESTS

        # Clean up override
        test_app.dependency_overrides.clear()


class TestRateLimitErrorResponse:
    """Tests for rate limit error response format"""

    def test_rate_limit_error_response_format(self, client):
        """Test that rate limit error has correct format"""
        from app.services.auth_service import AuthService

        with patch.object(AuthService, 'authenticate_user', return_value=None):
            login_data = {
                "email": "test@example.com",
                "password": "password"
            }

            # Exceed rate limit
            for i in range(11):
                response = client.post("/auth/login", json=login_data)

            # Check error response
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
            assert "detail" in response.json() or "error" in response.json()
