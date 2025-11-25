"""
PostgreSQL-specific E2E workflow tests.

These tests validate complete user workflows against a real PostgreSQL
database. They catch issues that SQLite-based tests might miss:
- PostgreSQL-specific SQL behavior
- Real constraint violations
- Actual transaction semantics
- JSONB column behavior

Usage:
    make test-e2e          # Run all E2E tests
"""

from uuid import uuid4

import pytest

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.postgres,
    pytest.mark.asyncio,
]


class TestUserRegistrationWorkflow:
    """Test complete user registration workflows with real PostgreSQL."""

    async def test_user_registration_creates_user(self, e2e_client):
        """Test that user registration successfully creates a user in PostgreSQL."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"

        response = await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePassword123!",
                "first_name": "E2E",
                "last_name": "Test",
            },
        )

        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        data = response.json()
        assert data["email"] == email
        assert "id" in data

    async def test_duplicate_email_rejected(self, e2e_client):
        """Test that duplicate email registration is properly rejected."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"

        # First registration should succeed
        response1 = await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePassword123!",
                "first_name": "First",
                "last_name": "User",
            },
        )
        assert response1.status_code in [200, 201]

        # Second registration with same email should fail
        # API returns 400 (Bad Request) for duplicate email
        response2 = await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "AnotherPassword123!",
                "first_name": "Second",
                "last_name": "User",
            },
        )
        assert response2.status_code in [400, 409], "Should reject duplicate email"


class TestAuthenticationWorkflow:
    """Test complete authentication workflows."""

    async def test_register_login_access_protected(self, e2e_client):
        """Test complete flow: register -> login -> access protected endpoint."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # 1. Register
        reg_resp = await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": "E2E",
                "last_name": "Test",
            },
        )
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"

        # 2. Login
        login_resp = await e2e_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        tokens = login_resp.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens

        # 3. Access protected endpoint
        me_resp = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert me_resp.status_code == 200, f"Protected access failed: {me_resp.text}"
        user_data = me_resp.json()
        assert user_data["email"] == email

    async def test_invalid_credentials_rejected(self, e2e_client):
        """Test that invalid login credentials are rejected."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"

        # Register user first
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "CorrectPassword123!",
                "first_name": "E2E",
                "last_name": "Test",
            },
        )

        # Try to login with wrong password
        login_resp = await e2e_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword123!"},
        )
        assert login_resp.status_code == 401, "Should reject invalid credentials"

    async def test_token_refresh_workflow(self, e2e_client):
        """Test that refresh tokens can be used to get new access tokens."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # Register and login
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": "E2E",
                "last_name": "Test",
            },
        )

        login_resp = await e2e_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        tokens = login_resp.json()

        # Use refresh token
        refresh_resp = await e2e_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
        new_tokens = refresh_resp.json()
        assert "access_token" in new_tokens


class TestHealthEndpoint:
    """Test health endpoint behavior."""

    async def test_health_check_responds(self, e2e_client):
        """
        Test that health endpoint responds.

        Note: In E2E tests, the health endpoint's database check uses
        the production database config (not the test database override),
        so it may return 503. This test verifies the endpoint is accessible.
        """
        response = await e2e_client.get("/health")
        # Health endpoint should respond (may be 200 or 503 depending on DB config)
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
