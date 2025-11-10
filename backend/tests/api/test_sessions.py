# tests/api/test_sessions.py
"""
Comprehensive tests for session management API endpoints.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import status

from app.models.user_session import UserSession


# Disable rate limiting for tests
@pytest.fixture(autouse=True)
def disable_rate_limit():
    """Disable rate limiting for all tests in this module."""
    with patch("app.api.routes.sessions.limiter.enabled", False):
        yield


@pytest_asyncio.fixture
async def user_token(client, async_test_user):
    """Create and return an access token for async_test_user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "TestPassword123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def async_test_user2(async_test_db):
    """Create a second test user."""
    _test_engine, SessionLocal = async_test_db

    async with SessionLocal() as session:
        from app.crud.user import user as user_crud
        from app.schemas.users import UserCreate

        user_data = UserCreate(
            email="testuser2@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="User2",
        )
        user = await user_crud.create(session, obj_in=user_data)
        await session.commit()
        await session.refresh(user)
        return user


class TestListMySessions:
    """Tests for GET /api/v1/sessions/me endpoint."""

    @pytest.mark.asyncio
    async def test_list_my_sessions_success(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test successfully listing user's active sessions."""
        _test_engine, SessionLocal = async_test_db

        # Create some sessions for the user
        async with SessionLocal() as session:
            # Active session 1
            s1 = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="iPhone 13",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0 (iPhone)",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            # Active session 2
            s2 = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="MacBook Pro",
                ip_address="192.168.1.101",
                user_agent="Mozilla/5.0 (Macintosh)",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC) - timedelta(hours=1),
            )
            # Inactive session (should not appear)
            s3 = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Old Device",
                ip_address="192.168.1.102",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC) - timedelta(days=1),
            )
            session.add_all([s1, s2, s3])
            await session.commit()

        # Make request
        response = await client.get(
            "/api/v1/sessions/me", headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "sessions" in data
        assert "total" in data
        # Note: Login creates a session, so we have 3 total (login + 2 created)
        assert data["total"] == 3
        assert len(data["sessions"]) == 3

        # Check session data
        device_names = {s["device_name"] for s in data["sessions"]}
        assert "iPhone 13" in device_names
        assert "MacBook Pro" in device_names
        assert "Old Device" not in device_names

        # First session should be marked as current
        assert data["sessions"][0]["is_current"] is True

    @pytest.mark.asyncio
    async def test_list_my_sessions_with_login_session(
        self, client, async_test_user, user_token
    ):
        """Test listing sessions shows the login session."""
        response = await client.get(
            "/api/v1/sessions/me", headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Login creates a session, so we should have at least 1
        assert data["total"] >= 1
        assert len(data["sessions"]) >= 1
        assert data["sessions"][0]["is_current"] is True

    @pytest.mark.asyncio
    async def test_list_my_sessions_unauthorized(self, client):
        """Test listing sessions without authentication."""
        response = await client.get("/api/v1/sessions/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRevokeSession:
    """Tests for DELETE /api/v1/sessions/{session_id} endpoint."""

    @pytest.mark.asyncio
    async def test_revoke_session_success(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test successfully revoking a session."""
        _test_engine, SessionLocal = async_test_db

        # Create a session to revoke
        async with SessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="iPad",
                ip_address="192.168.1.103",
                user_agent="Mozilla/5.0 (iPad)",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)
            session_id = user_session.id

        # Revoke the session
        response = await client.delete(
            f"/api/v1/sessions/{session_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert "iPad" in data["message"]

        # Verify session is deactivated
        async with SessionLocal() as session:
            from app.crud.session import session as session_crud

            revoked_session = await session_crud.get(session, id=str(session_id))
            assert revoked_session.is_active is False

    @pytest.mark.asyncio
    async def test_revoke_session_not_found(self, client, user_token):
        """Test revoking a non-existent session."""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/sessions/{fake_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["success"] is False
        assert "errors" in data
        assert data["errors"][0]["code"] == "SYS_002"  # NOT_FOUND error code

    @pytest.mark.asyncio
    async def test_revoke_session_unauthorized(self, client, async_test_db):
        """Test revoking a session without authentication."""
        session_id = uuid4()
        response = await client.delete(f"/api/v1/sessions/{session_id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_revoke_session_belonging_to_other_user(
        self, client, async_test_user, async_test_user2, async_test_db, user_token
    ):
        """Test that users cannot revoke other users' sessions."""
        _test_engine, SessionLocal = async_test_db

        # Create a session for user2
        async with SessionLocal() as session:
            other_user_session = UserSession(
                user_id=async_test_user2.id,  # Different user
                refresh_token_jti=str(uuid4()),
                device_name="Other User Device",
                ip_address="192.168.1.200",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(other_user_session)
            await session.commit()
            await session.refresh(other_user_session)
            session_id = other_user_session.id

        # Try to revoke it as user1
        response = await client.delete(
            f"/api/v1/sessions/{session_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert data["success"] is False
        assert "errors" in data
        assert data["errors"][0]["code"] == "AUTH_004"  # INSUFFICIENT_PERMISSIONS
        assert "your own sessions" in data["errors"][0]["message"].lower()


class TestCleanupExpiredSessions:
    """Tests for DELETE /api/v1/sessions/me/expired endpoint."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_success(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test successfully cleaning up expired sessions."""
        _test_engine, SessionLocal = async_test_db

        # Create expired and active sessions using CRUD to avoid greenlet issues
        from app.crud.session import session as session_crud
        from app.schemas.sessions import SessionCreate

        async with SessionLocal() as db:
            # Expired session 1 (inactive and expired)
            e1_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Expired 1",
                ip_address="192.168.1.201",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC) - timedelta(days=2),
            )
            e1 = await session_crud.create_session(db, obj_in=e1_data)
            e1.is_active = False
            db.add(e1)

            # Expired session 2 (inactive and expired)
            e2_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Expired 2",
                ip_address="192.168.1.202",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                last_used_at=datetime.now(UTC) - timedelta(hours=2),
            )
            e2 = await session_crud.create_session(db, obj_in=e2_data)
            e2.is_active = False
            db.add(e2)

            # Active session (should not be deleted)
            a1_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Active",
                ip_address="192.168.1.203",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            await session_crud.create_session(db, obj_in=a1_data)
            await db.commit()

        # Cleanup expired sessions
        response = await client.delete(
            "/api/v1/sessions/me/expired",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        # Should have cleaned up 2 expired sessions
        assert "2" in data["message"] or data["message"].startswith("Cleaned up 2")

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_none_expired(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test cleanup when no sessions are expired."""
        _test_engine, SessionLocal = async_test_db

        # Create only active sessions using CRUD
        from app.crud.session import session as session_crud
        from app.schemas.sessions import SessionCreate

        async with SessionLocal() as db:
            a1_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Active Device",
                ip_address="192.168.1.210",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            await session_crud.create_session(db, obj_in=a1_data)
            await db.commit()

        response = await client.delete(
            "/api/v1/sessions/me/expired",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert "0" in data["message"]

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_unauthorized(self, client):
        """Test cleanup without authentication."""
        response = await client.delete("/api/v1/sessions/me/expired")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# Additional tests for better coverage


class TestSessionsAdditionalCases:
    """Additional tests to improve sessions endpoint coverage."""

    @pytest.mark.asyncio
    async def test_list_sessions_pagination(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test listing sessions with pagination."""
        _test_engine, SessionLocal = async_test_db

        # Create multiple sessions
        async with SessionLocal() as session:
            from app.crud.session import session as session_crud
            from app.schemas.sessions import SessionCreate

            for i in range(5):
                session_data = SessionCreate(
                    user_id=async_test_user.id,
                    refresh_token_jti=str(uuid4()),
                    device_name=f"Device {i}",
                    ip_address=f"192.168.1.{i}",
                    user_agent="Mozilla/5.0",
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                    last_used_at=datetime.now(UTC),
                )
                await session_crud.create_session(session, obj_in=session_data)
            await session.commit()

        response = await client.get(
            "/api/v1/sessions/me?page=1&limit=3",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "sessions" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_revoke_session_invalid_uuid(self, client, user_token):
        """Test revoking session with invalid UUID."""
        response = await client.delete(
            "/api/v1/sessions/not-a-uuid",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        # Should return 422 for invalid UUID format
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_404_NOT_FOUND,
        ]

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_with_mixed_states(
        self, client, async_test_user, async_test_db, user_token
    ):
        """Test cleanup with mix of active/inactive and expired/not-expired sessions."""
        _test_engine, SessionLocal = async_test_db

        from app.crud.session import session as session_crud
        from app.schemas.sessions import SessionCreate

        async with SessionLocal() as db:
            # Expired + inactive (should be cleaned)
            e1_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Expired Inactive",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC) - timedelta(days=2),
            )
            e1 = await session_crud.create_session(db, obj_in=e1_data)
            e1.is_active = False
            db.add(e1)

            # Expired but still active (should NOT be cleaned - only inactive+expired)
            e2_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Expired Active",
                ip_address="192.168.1.101",
                user_agent="Mozilla/5.0",
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                last_used_at=datetime.now(UTC) - timedelta(hours=2),
            )
            await session_crud.create_session(db, obj_in=e2_data)

            await db.commit()

        response = await client.delete(
            "/api/v1/sessions/me/expired",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestSessionExceptionHandlers:
    """
    Test exception handlers in session routes.
    Covers lines: 77, 104-106, 181-183, 233-236
    """

    @pytest.mark.asyncio
    async def test_list_sessions_with_invalid_token_in_header(self, client, user_token):
        """Test list_sessions handles token decode errors gracefully (covers line 77)."""
        # The token decode happens after successful auth, so we need to mock it
        from unittest.mock import patch

        # Patch decode_token to raise an exception
        with patch(
            "app.api.routes.sessions.decode_token",
            side_effect=Exception("Token decode error"),
        ):
            response = await client.get(
                "/api/v1/sessions/me", headers={"Authorization": f"Bearer {user_token}"}
            )

            # Should still succeed (exception is caught and ignored in try/except at line 77)
            assert response.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_list_sessions_database_error(self, client, user_token):
        """Test list_sessions handles database errors (covers lines 104-106)."""
        from unittest.mock import patch

        from app.crud import session as session_module

        with patch.object(
            session_module.session,
            "get_user_sessions",
            side_effect=Exception("Database error"),
        ):
            response = await client.get(
                "/api/v1/sessions/me", headers={"Authorization": f"Bearer {user_token}"}
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            data = response.json()
            # The global exception handler wraps it in errors array
            assert data["errors"][0]["message"] == "Failed to retrieve sessions"

    @pytest.mark.asyncio
    async def test_revoke_session_database_error(
        self, client, user_token, async_test_db, async_test_user
    ):
        """Test revoke_session handles database errors (covers lines 181-183)."""
        from datetime import datetime, timedelta
        from unittest.mock import patch
        from uuid import uuid4

        from app.crud import session as session_module

        # First create a session to revoke
        from app.crud.session import session as session_crud
        from app.schemas.sessions import SessionCreate

        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as db:
            session_in = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                last_used_at=datetime.now(UTC),
                expires_at=datetime.now(UTC) + timedelta(days=60),
            )
            user_session = await session_crud.create_session(db, obj_in=session_in)
            session_id = user_session.id

        # Mock the deactivate method to raise an exception
        with patch.object(
            session_module.session,
            "deactivate",
            side_effect=Exception("Database connection lost"),
        ):
            response = await client.delete(
                f"/api/v1/sessions/{session_id}",
                headers={"Authorization": f"Bearer {user_token}"},
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            data = response.json()
            assert data["errors"][0]["message"] == "Failed to revoke session"

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_database_error(self, client, user_token):
        """Test cleanup_expired_sessions handles database errors (covers lines 233-236)."""
        from unittest.mock import patch

        from app.crud import session as session_module

        with patch.object(
            session_module.session,
            "cleanup_expired_for_user",
            side_effect=Exception("Cleanup failed"),
        ):
            response = await client.delete(
                "/api/v1/sessions/me/expired",
                headers={"Authorization": f"Bearer {user_token}"},
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            data = response.json()
            assert data["errors"][0]["message"] == "Failed to cleanup sessions"
