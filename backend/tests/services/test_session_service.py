# tests/services/test_session_service.py
"""Tests for the SessionService class."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.schemas.sessions import SessionCreate
from app.services.session_service import session_service


def _make_session_create(user_id, jti=None) -> SessionCreate:
    """Helper to build a SessionCreate with sensible defaults."""
    now = datetime.now(UTC)
    return SessionCreate(
        user_id=user_id,
        refresh_token_jti=jti or str(uuid.uuid4()),
        ip_address="127.0.0.1",
        user_agent="pytest/test",
        device_name="Test Device",
        device_id="test-device-id",
        last_used_at=now,
        expires_at=now + timedelta(days=7),
        location_city="TestCity",
        location_country="TestCountry",
    )


class TestCreateSession:
    """Tests for SessionService.create_session method."""

    @pytest.mark.asyncio
    async def test_create_session(self, async_test_db, async_test_user):
        """Test creating a session returns a UserSession with correct fields."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)
        async with AsyncTestingSessionLocal() as session:
            result = await session_service.create_session(session, obj_in=obj_in)
            assert result is not None
            assert result.user_id == async_test_user.id
            assert result.refresh_token_jti == obj_in.refresh_token_jti
            assert result.is_active is True
            assert result.ip_address == "127.0.0.1"


class TestGetSession:
    """Tests for SessionService.get_session method."""

    @pytest.mark.asyncio
    async def test_get_session_found(self, async_test_db, async_test_user):
        """Test getting a session by ID returns the session."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            created = await session_service.create_session(session, obj_in=obj_in)

        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_session(session, str(created.id))
            assert result is not None
            assert result.id == created.id

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, async_test_db):
        """Test getting a non-existent session returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_session(session, str(uuid.uuid4()))
            assert result is None


class TestGetUserSessions:
    """Tests for SessionService.get_user_sessions method."""

    @pytest.mark.asyncio
    async def test_get_user_sessions_active_only(self, async_test_db, async_test_user):
        """Test getting active sessions for a user returns only active sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            await session_service.create_session(session, obj_in=obj_in)

        async with AsyncTestingSessionLocal() as session:
            sessions = await session_service.get_user_sessions(
                session, user_id=str(async_test_user.id), active_only=True
            )
            assert isinstance(sessions, list)
            assert len(sessions) >= 1
            for s in sessions:
                assert s.is_active is True

    @pytest.mark.asyncio
    async def test_get_user_sessions_all(self, async_test_db, async_test_user):
        """Test getting all sessions (active and inactive) for a user."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            created = await session_service.create_session(session, obj_in=obj_in)
            await session_service.deactivate(session, session_id=str(created.id))

        async with AsyncTestingSessionLocal() as session:
            sessions = await session_service.get_user_sessions(
                session, user_id=str(async_test_user.id), active_only=False
            )
            assert isinstance(sessions, list)
            assert len(sessions) >= 1


class TestGetActiveByJti:
    """Tests for SessionService.get_active_by_jti method."""

    @pytest.mark.asyncio
    async def test_get_active_by_jti_found(self, async_test_db, async_test_user):
        """Test getting an active session by JTI returns the session."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        jti = str(uuid.uuid4())
        obj_in = _make_session_create(async_test_user.id, jti=jti)

        async with AsyncTestingSessionLocal() as session:
            await session_service.create_session(session, obj_in=obj_in)

        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_active_by_jti(session, jti=jti)
            assert result is not None
            assert result.refresh_token_jti == jti
            assert result.is_active is True

    @pytest.mark.asyncio
    async def test_get_active_by_jti_not_found(self, async_test_db):
        """Test getting an active session by non-existent JTI returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_active_by_jti(
                session, jti=str(uuid.uuid4())
            )
            assert result is None


class TestGetByJti:
    """Tests for SessionService.get_by_jti method."""

    @pytest.mark.asyncio
    async def test_get_by_jti_active(self, async_test_db, async_test_user):
        """Test getting a session (active or inactive) by JTI."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        jti = str(uuid.uuid4())
        obj_in = _make_session_create(async_test_user.id, jti=jti)

        async with AsyncTestingSessionLocal() as session:
            await session_service.create_session(session, obj_in=obj_in)

        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_by_jti(session, jti=jti)
            assert result is not None
            assert result.refresh_token_jti == jti


class TestDeactivate:
    """Tests for SessionService.deactivate method."""

    @pytest.mark.asyncio
    async def test_deactivate_session(self, async_test_db, async_test_user):
        """Test deactivating a session sets is_active to False."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            created = await session_service.create_session(session, obj_in=obj_in)
            session_id = str(created.id)

        async with AsyncTestingSessionLocal() as session:
            deactivated = await session_service.deactivate(
                session, session_id=session_id
            )
            assert deactivated is not None
            assert deactivated.is_active is False


class TestDeactivateAllUserSessions:
    """Tests for SessionService.deactivate_all_user_sessions method."""

    @pytest.mark.asyncio
    async def test_deactivate_all_user_sessions(self, async_test_db, async_test_user):
        """Test deactivating all sessions for a user returns count deactivated."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            await session_service.create_session(
                session, obj_in=_make_session_create(async_test_user.id)
            )
            await session_service.create_session(
                session, obj_in=_make_session_create(async_test_user.id)
            )

        async with AsyncTestingSessionLocal() as session:
            count = await session_service.deactivate_all_user_sessions(
                session, user_id=str(async_test_user.id)
            )
            assert count >= 2

        async with AsyncTestingSessionLocal() as session:
            active_sessions = await session_service.get_user_sessions(
                session, user_id=str(async_test_user.id), active_only=True
            )
            assert len(active_sessions) == 0


class TestUpdateRefreshToken:
    """Tests for SessionService.update_refresh_token method."""

    @pytest.mark.asyncio
    async def test_update_refresh_token(self, async_test_db, async_test_user):
        """Test rotating a session's refresh token updates JTI and expiry."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            created = await session_service.create_session(session, obj_in=obj_in)
            session_id = str(created.id)

        new_jti = str(uuid.uuid4())
        new_expires_at = datetime.now(UTC) + timedelta(days=14)

        async with AsyncTestingSessionLocal() as session:
            result = await session_service.get_session(session, session_id)
            updated = await session_service.update_refresh_token(
                session,
                session=result,
                new_jti=new_jti,
                new_expires_at=new_expires_at,
            )
            assert updated.refresh_token_jti == new_jti


class TestCleanupExpiredForUser:
    """Tests for SessionService.cleanup_expired_for_user method."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_for_user(self, async_test_db, async_test_user):
        """Test cleaning up expired inactive sessions returns count removed."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        now = datetime.now(UTC)
        # Create a session that is already expired
        obj_in = SessionCreate(
            user_id=async_test_user.id,
            refresh_token_jti=str(uuid.uuid4()),
            ip_address="127.0.0.1",
            user_agent="pytest/test",
            last_used_at=now - timedelta(days=8),
            expires_at=now - timedelta(days=1),
        )

        async with AsyncTestingSessionLocal() as session:
            created = await session_service.create_session(session, obj_in=obj_in)
            session_id = str(created.id)

        # Deactivate it so it qualifies for cleanup (requires is_active=False AND expired)
        async with AsyncTestingSessionLocal() as session:
            await session_service.deactivate(session, session_id=session_id)

        async with AsyncTestingSessionLocal() as session:
            count = await session_service.cleanup_expired_for_user(
                session, user_id=str(async_test_user.id)
            )
            assert isinstance(count, int)
            assert count >= 1


class TestGetAllSessions:
    """Tests for SessionService.get_all_sessions method."""

    @pytest.mark.asyncio
    async def test_get_all_sessions(self, async_test_db, async_test_user):
        """Test getting all sessions with pagination returns tuple of list and count."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_session_create(async_test_user.id)

        async with AsyncTestingSessionLocal() as session:
            await session_service.create_session(session, obj_in=obj_in)

        async with AsyncTestingSessionLocal() as session:
            sessions, count = await session_service.get_all_sessions(
                session, skip=0, limit=10, active_only=True, with_user=False
            )
            assert isinstance(sessions, list)
            assert isinstance(count, int)
            assert count >= 1
            assert len(sessions) >= 1
