"""
Integration tests for session management.

Tests the critical per-device logout functionality.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.user import User
from app.core.auth import get_password_hash
from app.utils.test_utils import setup_test_db, teardown_test_db
import uuid


@pytest.fixture(scope="function")
def test_db_session():
    """Create test database session."""
    test_engine, TestingSessionLocal = setup_test_db()
    with TestingSessionLocal() as session:
        yield session
    teardown_test_db(test_engine)


@pytest.fixture(scope="function")
def client(test_db_session):
    """Create test client with test database."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db_session):
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="sessiontest@example.com",
        password_hash=get_password_hash("TestPassword123"),
        first_name="Session",
        last_name="Test",
        phone_number="+1234567890",
        is_active=True,
        is_superuser=False,
        preferences=None,
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


class TestMultiDeviceLogin:
    """Test multi-device login scenarios."""

    def test_login_from_multiple_devices(self, client, test_user):
        """Test that user can login from multiple devices simultaneously."""
        # Login from PC
        pc_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "pc-device-001"}
        )
        assert pc_response.status_code == 200
        pc_tokens = pc_response.json()
        assert "access_token" in pc_tokens
        assert "refresh_token" in pc_tokens
        pc_refresh = pc_tokens["refresh_token"]

        # Login from Phone
        phone_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "phone-device-001"}
        )
        assert phone_response.status_code == 200
        phone_tokens = phone_response.json()
        assert "access_token" in phone_tokens
        assert "refresh_token" in phone_tokens
        phone_refresh = phone_tokens["refresh_token"]

        # Verify both tokens are different
        assert pc_refresh != phone_refresh

        # Both should be able to access protected endpoints
        pc_me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {pc_tokens['access_token']}"}
        )
        assert pc_me.status_code == 200

        phone_me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {phone_tokens['access_token']}"}
        )
        assert phone_me.status_code == 200

    def test_logout_from_one_device_does_not_affect_other(self, client, test_user):
        """
        CRITICAL TEST: Logout from PC should NOT logout from Phone.

        This is the main requirement for session management.
        """
        # Login from PC
        pc_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "pc-device-001"}
        )
        assert pc_response.status_code == 200
        pc_tokens = pc_response.json()
        pc_access = pc_tokens["access_token"]
        pc_refresh = pc_tokens["refresh_token"]

        # Login from Phone
        phone_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "phone-device-001"}
        )
        assert phone_response.status_code == 200
        phone_tokens = phone_response.json()
        phone_access = phone_tokens["access_token"]
        phone_refresh = phone_tokens["refresh_token"]

        # Logout from PC
        logout_response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": pc_refresh},
            headers={"Authorization": f"Bearer {pc_access}"}
        )
        assert logout_response.status_code == 200
        assert logout_response.json()["success"] == True

        # PC refresh should fail (logged out)
        pc_refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": pc_refresh}
        )
        assert pc_refresh_response.status_code == 401
        response_data = pc_refresh_response.json()
        assert "revoked" in response_data["errors"][0]["message"].lower()

        # Phone refresh should still work ✅ THIS IS THE CRITICAL ASSERTION
        phone_refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": phone_refresh}
        )
        assert phone_refresh_response.status_code == 200
        new_phone_tokens = phone_refresh_response.json()
        assert "access_token" in new_phone_tokens

        # Phone can still access protected endpoints
        phone_me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {new_phone_tokens['access_token']}"}
        )
        assert phone_me.status_code == 200
        assert phone_me.json()["email"] == "sessiontest@example.com"

    def test_logout_all_devices(self, client, test_user):
        """Test logging out from all devices simultaneously."""
        # Login from 3 devices
        devices = []
        for i, device_name in enumerate(["pc", "phone", "tablet"]):
            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": "sessiontest@example.com",
                    "password": "TestPassword123"
                },
                headers={"X-Device-Id": f"{device_name}-device-00{i}"}
            )
            assert response.status_code == 200
            tokens = response.json()
            devices.append({
                "name": device_name,
                "access": tokens["access_token"],
                "refresh": tokens["refresh_token"]
            })

        # Logout from all devices using first device's access token
        logout_all_response = client.post(
            "/api/v1/auth/logout-all",
            headers={"Authorization": f"Bearer {devices[0]['access']}"}
        )
        assert logout_all_response.status_code == 200
        assert "3" in logout_all_response.json()["message"]  # 3 sessions terminated

        # All refresh tokens should now fail
        for device in devices:
            refresh_response = client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": device["refresh"]}
            )
            assert refresh_response.status_code == 401

    def test_list_active_sessions(self, client, test_user):
        """Test listing active sessions."""
        # Login from 2 devices
        pc_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "pc-device-001"}
        )
        pc_tokens = pc_response.json()

        phone_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "phone-device-001"}
        )

        # List sessions
        sessions_response = client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {pc_tokens['access_token']}"}
        )
        assert sessions_response.status_code == 200
        sessions_data = sessions_response.json()
        assert sessions_data["total"] == 2
        assert len(sessions_data["sessions"]) == 2

        # Check session details
        session = sessions_data["sessions"][0]
        assert "device_name" in session
        assert "ip_address" in session
        assert "last_used_at" in session
        assert "created_at" in session

    def test_revoke_specific_session(self, client, test_user):
        """Test revoking a specific session by ID."""
        # Login from 2 devices
        pc_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "pc-device-001"}
        )
        pc_tokens = pc_response.json()

        phone_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            },
            headers={"X-Device-Id": "phone-device-001"}
        )
        phone_tokens = phone_response.json()

        # List sessions to get IDs
        sessions_response = client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {pc_tokens['access_token']}"}
        )
        sessions = sessions_response.json()["sessions"]

        # Find the phone session by device_id
        phone_session = next((s for s in sessions if s["device_id"] == "phone-device-001"), None)
        assert phone_session is not None, "Phone session not found in session list"
        session_id_to_revoke = phone_session["id"]
        revoke_response = client.delete(
            f"/api/v1/sessions/{session_id_to_revoke}",
            headers={"Authorization": f"Bearer {pc_tokens['access_token']}"}
        )
        assert revoke_response.status_code == 200

        # Phone refresh should fail
        phone_refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": phone_tokens["refresh_token"]}
        )
        assert phone_refresh_response.status_code == 401

        # PC refresh should still work
        pc_refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": pc_tokens["refresh_token"]}
        )
        assert pc_refresh_response.status_code == 200


class TestSessionEdgeCases:
    """Test edge cases and error scenarios."""

    def test_logout_with_invalid_refresh_token(self, client, test_user):
        """Test logout with invalid refresh token."""
        # Login first
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            }
        )
        tokens = login_response.json()

        # Try to logout with invalid refresh token
        logout_response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": "invalid_token"},
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        # Should still return success (idempotent)
        assert logout_response.status_code == 200

    def test_refresh_with_deactivated_session(self, client, test_user):
        """Test refresh after session has been deactivated."""
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sessiontest@example.com",
                "password": "TestPassword123"
            }
        )
        tokens = login_response.json()

        # Logout
        client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh_token"]},
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )

        # Try to refresh with deactivated session
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert refresh_response.status_code == 401
        response_data = refresh_response.json()
        assert "revoked" in response_data["errors"][0]["message"].lower()

    def test_cannot_revoke_other_users_session(self, client, test_db_session):
        """Test that users cannot revoke other users' sessions."""
        # Create two users
        user1 = User(
            id=uuid.uuid4(),
            email="user1@example.com",
            password_hash=get_password_hash("TestPassword123"),
            first_name="User",
            last_name="One",
            is_active=True,
            is_superuser=False,
        )
        user2 = User(
            id=uuid.uuid4(),
            email="user2@example.com",
            password_hash=get_password_hash("TestPassword123"),
            first_name="User",
            last_name="Two",
            is_active=True,
            is_superuser=False,
        )
        test_db_session.add_all([user1, user2])
        test_db_session.commit()

        # User1 login
        user1_login = client.post(
            "/api/v1/auth/login",
            json={"email": "user1@example.com", "password": "TestPassword123"}
        )
        user1_tokens = user1_login.json()

        # User2 login
        user2_login = client.post(
            "/api/v1/auth/login",
            json={"email": "user2@example.com", "password": "TestPassword123"}
        )

        # User1 gets their sessions
        user1_sessions = client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {user1_tokens['access_token']}"}
        )
        user1_session_id = user1_sessions.json()["sessions"][0]["id"]

        # User2 lists their sessions
        user2_sessions = client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {user2_login.json()['access_token']}"}
        )
        user2_session_id = user2_sessions.json()["sessions"][0]["id"]

        # User1 tries to revoke User2's session (should fail)
        revoke_response = client.delete(
            f"/api/v1/sessions/{user2_session_id}",
            headers={"Authorization": f"Bearer {user1_tokens['access_token']}"}
        )
        assert revoke_response.status_code == 403
