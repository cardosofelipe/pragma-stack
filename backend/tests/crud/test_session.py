# tests/crud/test_session_async.py
"""
Comprehensive tests for async session CRUD operations.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.crud.session import session as session_crud
from app.models.user_session import UserSession
from app.schemas.sessions import SessionCreate


class TestGetByJti:
    """Tests for get_by_jti method."""

    @pytest.mark.asyncio
    async def test_get_by_jti_success(self, async_test_db, async_test_user):
        """Test getting session by JTI."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="test_jti_123",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.get_by_jti(session, jti="test_jti_123")
            assert result is not None
            assert result.refresh_token_jti == "test_jti_123"

    @pytest.mark.asyncio
    async def test_get_by_jti_not_found(self, async_test_db):
        """Test getting non-existent JTI returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.get_by_jti(session, jti="nonexistent")
            assert result is None


class TestGetActiveByJti:
    """Tests for get_active_by_jti method."""

    @pytest.mark.asyncio
    async def test_get_active_by_jti_success(self, async_test_db, async_test_user):
        """Test getting active session by JTI."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active_jti",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.get_active_by_jti(session, jti="active_jti")
            assert result is not None
            assert result.is_active is True

    @pytest.mark.asyncio
    async def test_get_active_by_jti_inactive(self, async_test_db, async_test_user):
        """Test getting inactive session by JTI returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="inactive_jti",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.get_active_by_jti(session, jti="inactive_jti")
            assert result is None


class TestGetUserSessions:
    """Tests for get_user_sessions method."""

    @pytest.mark.asyncio
    async def test_get_user_sessions_active_only(self, async_test_db, async_test_user):
        """Test getting only active user sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            active = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active",
                device_name="Active Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            inactive = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="inactive",
                device_name="Inactive Device",
                ip_address="192.168.1.2",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add_all([active, inactive])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            results = await session_crud.get_user_sessions(
                session, user_id=str(async_test_user.id), active_only=True
            )
            assert len(results) == 1
            assert results[0].is_active is True

    @pytest.mark.asyncio
    async def test_get_user_sessions_all(self, async_test_db, async_test_user):
        """Test getting all user sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                sess = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"session_{i}",
                    device_name=f"Device {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=i % 2 == 0,
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                    last_used_at=datetime.now(UTC),
                )
                session.add(sess)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            results = await session_crud.get_user_sessions(
                session, user_id=str(async_test_user.id), active_only=False
            )
            assert len(results) == 3


class TestCreateSession:
    """Tests for create_session method."""

    @pytest.mark.asyncio
    async def test_create_session_success(self, async_test_db, async_test_user):
        """Test successfully creating a session_crud."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            session_data = SessionCreate(
                user_id=async_test_user.id,
                refresh_token_jti="new_jti",
                device_name="New Device",
                device_id="device_123",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                last_used_at=datetime.now(UTC),
                expires_at=datetime.now(UTC) + timedelta(days=7),
                location_city="San Francisco",
                location_country="USA",
            )
            result = await session_crud.create_session(session, obj_in=session_data)

            assert result.user_id == async_test_user.id
            assert result.refresh_token_jti == "new_jti"
            assert result.is_active is True
            assert result.location_city == "San Francisco"


class TestDeactivate:
    """Tests for deactivate method."""

    @pytest.mark.asyncio
    async def test_deactivate_success(self, async_test_db, async_test_user):
        """Test successfully deactivating a session_crud."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="to_deactivate",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()
            session_id = user_session.id

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.deactivate(session, session_id=str(session_id))
            assert result is not None
            assert result.is_active is False

    @pytest.mark.asyncio
    async def test_deactivate_not_found(self, async_test_db):
        """Test deactivating non-existent session returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await session_crud.deactivate(session, session_id=str(uuid4()))
            assert result is None


class TestDeactivateAllUserSessions:
    """Tests for deactivate_all_user_sessions method."""

    @pytest.mark.asyncio
    async def test_deactivate_all_user_sessions_success(
        self, async_test_db, async_test_user
    ):
        """Test deactivating all user sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # Create minimal sessions for test (2 instead of 5)
            for i in range(2):
                sess = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"bulk_{i}",
                    device_name=f"Device {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=True,
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                    last_used_at=datetime.now(UTC),
                )
                session.add(sess)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.deactivate_all_user_sessions(
                session, user_id=str(async_test_user.id)
            )
            assert count == 2


class TestUpdateLastUsed:
    """Tests for update_last_used method."""

    @pytest.mark.asyncio
    async def test_update_last_used_success(self, async_test_db, async_test_user):
        """Test updating last_used_at timestamp."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="update_test",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC) - timedelta(hours=1),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)

            old_time = user_session.last_used_at
            result = await session_crud.update_last_used(session, session=user_session)

            assert result.last_used_at > old_time


class TestGetUserSessionCount:
    """Tests for get_user_session_count method."""

    @pytest.mark.asyncio
    async def test_get_user_session_count_success(self, async_test_db, async_test_user):
        """Test getting user session count."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                sess = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"count_{i}",
                    device_name=f"Device {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=True,
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                    last_used_at=datetime.now(UTC),
                )
                session.add(sess)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.get_user_session_count(
                session, user_id=str(async_test_user.id)
            )
            assert count == 3

    @pytest.mark.asyncio
    async def test_get_user_session_count_empty(self, async_test_db):
        """Test getting session count for user with no sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.get_user_session_count(
                session, user_id=str(uuid4())
            )
            assert count == 0


class TestUpdateRefreshToken:
    """Tests for update_refresh_token method."""

    @pytest.mark.asyncio
    async def test_update_refresh_token_success(self, async_test_db, async_test_user):
        """Test updating refresh token JTI and expiration."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="old_jti",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC) - timedelta(hours=1),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)

            new_jti = "new_jti_123"
            new_expires = datetime.now(UTC) + timedelta(days=14)

            result = await session_crud.update_refresh_token(
                session,
                session=user_session,
                new_jti=new_jti,
                new_expires_at=new_expires,
            )

            assert result.refresh_token_jti == new_jti
            # Compare timestamps ignoring timezone info
            assert (
                abs(
                    (
                        result.expires_at.replace(tzinfo=None)
                        - new_expires.replace(tzinfo=None)
                    ).total_seconds()
                )
                < 1
            )


class TestCleanupExpired:
    """Tests for cleanup_expired method."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_success(self, async_test_db, async_test_user):
        """Test cleaning up old expired inactive sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create old expired inactive session
        async with AsyncTestingSessionLocal() as session:
            old_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="old_expired",
                device_name="Old Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(days=5),
                last_used_at=datetime.now(UTC) - timedelta(days=35),
                created_at=datetime.now(UTC) - timedelta(days=35),
            )
            session.add(old_session)
            await session.commit()

        # Cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.cleanup_expired(session, keep_days=30)
            assert count == 1

    @pytest.mark.asyncio
    async def test_cleanup_expired_keeps_recent(self, async_test_db, async_test_user):
        """Test that cleanup keeps recent expired sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create recent expired inactive session (less than keep_days old)
        async with AsyncTestingSessionLocal() as session:
            recent_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="recent_expired",
                device_name="Recent Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                last_used_at=datetime.now(UTC) - timedelta(hours=2),
                created_at=datetime.now(UTC) - timedelta(days=1),
            )
            session.add(recent_session)
            await session.commit()

        # Cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.cleanup_expired(session, keep_days=30)
            assert count == 0  # Should not delete recent sessions

    @pytest.mark.asyncio
    async def test_cleanup_expired_keeps_active(self, async_test_db, async_test_user):
        """Test that cleanup does not delete active sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create old expired but ACTIVE session
        async with AsyncTestingSessionLocal() as session:
            active_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active_expired",
                device_name="Active Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,  # Active
                expires_at=datetime.now(UTC) - timedelta(days=5),
                last_used_at=datetime.now(UTC) - timedelta(days=35),
                created_at=datetime.now(UTC) - timedelta(days=35),
            )
            session.add(active_session)
            await session.commit()

        # Cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.cleanup_expired(session, keep_days=30)
            assert count == 0  # Should not delete active sessions


class TestCleanupExpiredForUser:
    """Tests for cleanup_expired_for_user method."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_for_user_success(
        self, async_test_db, async_test_user
    ):
        """Test cleaning up expired sessions for specific user."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create expired inactive session for user
        async with AsyncTestingSessionLocal() as session:
            expired_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="user_expired",
                device_name="Expired Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC) - timedelta(days=2),
            )
            session.add(expired_session)
            await session.commit()

        # Cleanup for user
        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.cleanup_expired_for_user(
                session, user_id=str(async_test_user.id)
            )
            assert count == 1

    @pytest.mark.asyncio
    async def test_cleanup_expired_for_user_invalid_uuid(self, async_test_db):
        """Test cleanup with invalid user UUID."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(ValueError, match="Invalid user ID format"):
                await session_crud.cleanup_expired_for_user(
                    session, user_id="not-a-valid-uuid"
                )

    @pytest.mark.asyncio
    async def test_cleanup_expired_for_user_keeps_active(
        self, async_test_db, async_test_user
    ):
        """Test that cleanup for user keeps active sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create expired but active session
        async with AsyncTestingSessionLocal() as session:
            active_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active_user_expired",
                device_name="Active Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,  # Active
                expires_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC) - timedelta(days=2),
            )
            session.add(active_session)
            await session.commit()

        # Cleanup
        async with AsyncTestingSessionLocal() as session:
            count = await session_crud.cleanup_expired_for_user(
                session, user_id=str(async_test_user.id)
            )
            assert count == 0  # Should not delete active sessions


class TestGetUserSessionsWithUser:
    """Tests for get_user_sessions with eager loading."""

    @pytest.mark.asyncio
    async def test_get_user_sessions_with_user_relationship(
        self, async_test_db, async_test_user
    ):
        """Test getting sessions with user relationship loaded."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="with_user",
                device_name="Test Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()

        # Get with user relationship
        async with AsyncTestingSessionLocal() as session:
            results = await session_crud.get_user_sessions(
                session, user_id=str(async_test_user.id), with_user=True
            )
            assert len(results) >= 1
