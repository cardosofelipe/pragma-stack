"""
User management E2E workflow tests with real PostgreSQL.

These tests validate complete user management workflows including:
- Profile viewing and updates
- Password changes
- User settings management

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


async def register_and_login(client, email: str, password: str = "SecurePassword123!"):
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

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return login_resp.json()


class TestUserProfileWorkflows:
    """Test user profile management workflows."""

    async def test_get_own_profile(self, e2e_client):
        """Users can view their own profile."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"
        assert "id" in data
        assert "is_active" in data

    async def test_update_own_profile(self, e2e_client):
        """Users can update their own profile."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "first_name": "Updated",
                "last_name": "Name",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"

        # Verify changes persisted
        verify_resp = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert verify_resp.json()["first_name"] == "Updated"

    async def test_profile_requires_auth(self, e2e_client):
        """Profile endpoints require authentication."""
        response = await e2e_client.get("/api/v1/users/me")
        assert response.status_code == 401

    async def test_get_user_by_id_own_profile(self, e2e_client):
        """Users can get their own profile by ID."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        # Get user ID from /me endpoint
        me_resp = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user_id = me_resp.json()["id"]

        # Get by ID
        response = await e2e_client.get(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 200
        assert response.json()["id"] == user_id

    async def test_cannot_get_other_user_profile(self, e2e_client):
        """Regular users cannot view other users' profiles."""
        # Create two users
        user1_email = f"e2e-user1-{uuid4().hex[:8]}@example.com"
        user2_email = f"e2e-user2-{uuid4().hex[:8]}@example.com"

        tokens1 = await register_and_login(e2e_client, user1_email)
        tokens2 = await register_and_login(e2e_client, user2_email)

        # Get user1's ID
        me_resp = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )
        user1_id = me_resp.json()["id"]

        # User2 tries to access user1's profile
        response = await e2e_client.get(
            f"/api/v1/users/{user1_id}",
            headers={"Authorization": f"Bearer {tokens2['access_token']}"},
        )

        assert response.status_code == 403


class TestPasswordChangeWorkflows:
    """Test password change workflows."""

    async def test_change_password_success(self, e2e_client):
        """Users can change their password with correct current password."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        old_password = "OldPassword123!"
        new_password = "NewPassword456!"

        tokens = await register_and_login(e2e_client, email, old_password)

        response = await e2e_client.patch(
            "/api/v1/users/me/password",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "current_password": old_password,
                "new_password": new_password,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify new password works
        login_resp = await e2e_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": new_password},
        )
        assert login_resp.status_code == 200

    async def test_change_password_wrong_current(self, e2e_client):
        """Password change fails with wrong current password."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.patch(
            "/api/v1/users/me/password",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewPassword456!",
            },
        )

        assert response.status_code == 403

    async def test_change_password_weak_new_password(self, e2e_client):
        """Password change fails with weak new password."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"
        tokens = await register_and_login(e2e_client, email, password)

        response = await e2e_client.patch(
            "/api/v1/users/me/password",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "current_password": password,
                "new_password": "weak",  # Too weak
            },
        )

        assert response.status_code == 422  # Validation error

    async def test_old_password_invalid_after_change(self, e2e_client):
        """Old password no longer works after password change."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        old_password = "OldPassword123!"
        new_password = "NewPassword456!"

        tokens = await register_and_login(e2e_client, email, old_password)

        # Change password
        await e2e_client.patch(
            "/api/v1/users/me/password",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "current_password": old_password,
                "new_password": new_password,
            },
        )

        # Old password should fail
        login_resp = await e2e_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": old_password},
        )
        assert login_resp.status_code == 401


class TestUserUpdateWorkflows:
    """Test user update edge cases."""

    async def test_cannot_elevate_own_privileges(self, e2e_client):
        """Users cannot make themselves superusers."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        # Try to make self superuser - should be silently ignored or rejected
        response = await e2e_client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"is_superuser": True},
        )

        # The request may succeed but is_superuser should not change
        if response.status_code == 200:
            data = response.json()
            assert data.get("is_superuser") is False
        else:
            # Or it may be rejected outright
            assert response.status_code in [400, 403, 422]

    async def test_cannot_update_other_user_profile(self, e2e_client):
        """Regular users cannot update other users' profiles."""
        user1_email = f"e2e-user1-{uuid4().hex[:8]}@example.com"
        user2_email = f"e2e-user2-{uuid4().hex[:8]}@example.com"

        tokens1 = await register_and_login(e2e_client, user1_email)
        tokens2 = await register_and_login(e2e_client, user2_email)

        # Get user1's ID
        me_resp = await e2e_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tokens1['access_token']}"},
        )
        user1_id = me_resp.json()["id"]

        # User2 tries to update user1
        response = await e2e_client.patch(
            f"/api/v1/users/{user1_id}",
            headers={"Authorization": f"Bearer {tokens2['access_token']}"},
            json={"first_name": "Hacked"},
        )

        assert response.status_code == 403
