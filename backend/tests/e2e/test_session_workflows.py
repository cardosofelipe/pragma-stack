"""
Session management E2E workflow tests with real PostgreSQL.

These tests validate complete session management workflows including:
- Listing active sessions
- Session revocation
- Session cleanup
- Multi-device session handling

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


async def register_and_login(
    client, email: str, password: str = "SecurePassword123!", user_agent: str = None
):
    """Helper to register a user and get tokens."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": "User",
        },
    )

    headers = {}
    if user_agent:
        headers["User-Agent"] = user_agent

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )
    return login_resp.json()


class TestSessionListingWorkflows:
    """Test session listing workflows."""

    async def test_list_sessions_after_login(self, e2e_client):
        """Users can list their active sessions after login."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data
        assert data["total"] >= 1
        assert len(data["sessions"]) >= 1

    async def test_session_contains_expected_fields(self, e2e_client):
        """Session response contains expected fields."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        data = response.json()
        session = data["sessions"][0]

        # Check required fields
        assert "id" in session
        assert "created_at" in session
        assert "last_used_at" in session
        assert "is_current" in session

    async def test_list_sessions_requires_auth(self, e2e_client):
        """Sessions endpoint requires authentication."""
        response = await e2e_client.get("/api/v1/sessions/me")
        assert response.status_code == 401

    async def test_multiple_logins_create_multiple_sessions(self, e2e_client):
        """Multiple logins create multiple sessions."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # Register
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": "Test",
                "last_name": "User",
            },
        )

        # Login multiple times with different user agents
        tokens1 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            )
        ).json()

        tokens2 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
                headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)"},
            )
        ).json()

        # Check sessions using first token
        response = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )

        data = response.json()
        assert data["total"] >= 2


class TestSessionRevocationWorkflows:
    """Test session revocation workflows."""

    async def test_revoke_own_session(self, e2e_client):
        """Users can revoke their own sessions."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # Register
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": "Test",
                "last_name": "User",
            },
        )

        # Create two sessions
        tokens1 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
        ).json()

        tokens2 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
        ).json()

        # Get sessions
        sessions_resp = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )
        sessions = sessions_resp.json()["sessions"]
        initial_count = len(sessions)

        # Revoke one session (not the current one)
        session_to_revoke = sessions[-1]["id"]
        revoke_resp = await e2e_client.delete(
            f"/api/v1/sessions/{session_to_revoke}",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )

        assert revoke_resp.status_code == 200
        assert revoke_resp.json()["success"] is True

        # Verify session count decreased
        updated_sessions_resp = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )
        updated_count = updated_sessions_resp.json()["total"]
        assert updated_count == initial_count - 1

    async def test_cannot_revoke_nonexistent_session(self, e2e_client):
        """Cannot revoke a session that doesn't exist."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        fake_session_id = str(uuid4())
        response = await e2e_client.delete(
            f"/api/v1/sessions/{fake_session_id}",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 404

    async def test_cannot_revoke_other_user_session(self, e2e_client):
        """Users cannot revoke other users' sessions."""
        user1_email = f"e2e-user1-{uuid4().hex[:8]}@example.com"
        user2_email = f"e2e-user2-{uuid4().hex[:8]}@example.com"

        tokens1 = await register_and_login(e2e_client, user1_email)
        tokens2 = await register_and_login(e2e_client, user2_email)

        # Get user1's session ID
        sessions_resp = await e2e_client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )
        user1_session_id = sessions_resp.json()["sessions"][0]["id"]

        # User2 tries to revoke user1's session
        response = await e2e_client.delete(
            f"/api/v1/sessions/{user1_session_id}",
            headers={"Authorization": f"Bearer {tokens2['access_token']}"},
        )

        assert response.status_code == 403


class TestSessionCleanupWorkflows:
    """Test session cleanup workflows."""

    async def test_cleanup_expired_sessions(self, e2e_client):
        """Users can cleanup their expired sessions."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.delete(
            "/api/v1/sessions/me/expired",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Cleaned up" in data["message"]

    async def test_cleanup_requires_auth(self, e2e_client):
        """Session cleanup requires authentication."""
        response = await e2e_client.delete("/api/v1/sessions/me/expired")
        assert response.status_code == 401


class TestLogoutWorkflows:
    """Test logout workflows."""

    async def test_logout_invalidates_session(self, e2e_client):
        """Logout should invalidate the session."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        # Logout
        logout_resp = await e2e_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]},
        )

        assert logout_resp.status_code == 200

        # Refresh token should no longer work
        refresh_resp = await e2e_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )

        # May be 401 or 400 depending on implementation
        assert refresh_resp.status_code in [400, 401]

    async def test_logout_all_revokes_all_sessions(self, e2e_client):
        """Logout all should revoke all sessions."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # Register
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": "Test",
                "last_name": "User",
            },
        )

        # Create multiple sessions
        tokens1 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
        ).json()

        tokens2 = (
            await e2e_client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
        ).json()

        # Logout all
        logout_resp = await e2e_client.post(
            "/api/v1/auth/logout-all",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )

        assert logout_resp.status_code == 200

        # Second token's refresh should no longer work
        refresh_resp = await e2e_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens2["refresh_token"]},
        )

        assert refresh_resp.status_code in [400, 401]
