# tests/repositories/test_session_db_failures.py
"""
Comprehensive tests for session repository database failure scenarios.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.exc import OperationalError

from app.core.repository_exceptions import IntegrityConstraintError
from app.models.user_session import UserSession
from app.repositories.session import session_repo as session_repo
from app.schemas.sessions import SessionCreate


class TestSessionRepositoryGetByJtiFailures:
    """Test get_by_jti exception handling."""

    @pytest.mark.asyncio
    async def test_get_by_jti_database_error(self, async_test_db):
        """Test get_by_jti handles database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("DB connection lost", {}, Exception())

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await session_repo.get_by_jti(session, jti="test_jti")


class TestSessionRepositoryGetActiveByJtiFailures:
    """Test get_active_by_jti exception handling."""

    @pytest.mark.asyncio
    async def test_get_active_by_jti_database_error(self, async_test_db):
        """Test get_active_by_jti handles database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Query timeout", {}, Exception())

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await session_repo.get_active_by_jti(session, jti="test_jti")


class TestSessionRepositoryGetUserSessionsFailures:
    """Test get_user_sessions exception handling."""

    @pytest.mark.asyncio
    async def test_get_user_sessions_database_error(
        self, async_test_db, async_test_user
    ):
        """Test get_user_sessions handles database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Database error", {}, Exception())

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await session_repo.get_user_sessions(
                        session, user_id=str(async_test_user.id)
                    )


class TestSessionRepositoryCreateSessionFailures:
    """Test create_session exception handling."""

    @pytest.mark.asyncio
    async def test_create_session_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test create_session handles commit failures with rollback."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError("Commit failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    session_data = SessionCreate(
                        user_id=async_test_user.id,
                        refresh_token_jti=str(uuid4()),
                        device_name="Test Device",
                        ip_address="127.0.0.1",
                        user_agent="Test Agent",
                        expires_at=datetime.now(UTC) + timedelta(days=7),
                        last_used_at=datetime.now(UTC),
                    )

                    with pytest.raises(
                        IntegrityConstraintError, match="Failed to create session"
                    ):
                        await session_repo.create_session(session, obj_in=session_data)

                    mock_rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_session_unexpected_error_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test create_session handles unexpected errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise RuntimeError("Unexpected error")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    session_data = SessionCreate(
                        user_id=async_test_user.id,
                        refresh_token_jti=str(uuid4()),
                        device_name="Test Device",
                        ip_address="127.0.0.1",
                        user_agent="Test Agent",
                        expires_at=datetime.now(UTC) + timedelta(days=7),
                        last_used_at=datetime.now(UTC),
                    )

                    with pytest.raises(
                        IntegrityConstraintError, match="Failed to create session"
                    ):
                        await session_repo.create_session(session, obj_in=session_data)

                    mock_rollback.assert_called_once()


class TestSessionRepositoryDeactivateFailures:
    """Test deactivate exception handling."""

    @pytest.mark.asyncio
    async def test_deactivate_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test deactivate handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        # Create a session first
        async with SessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Test Device",
                ip_address="127.0.0.1",
                user_agent="Test Agent",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)
            session_id = user_session.id

        # Test deactivate failure
        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError("Deactivate failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.deactivate(
                            session, session_id=str(session_id)
                        )

                    mock_rollback.assert_called_once()


class TestSessionRepositoryDeactivateAllFailures:
    """Test deactivate_all_user_sessions exception handling."""

    @pytest.mark.asyncio
    async def test_deactivate_all_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test deactivate_all handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError("Bulk deactivate failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.deactivate_all_user_sessions(
                            session, user_id=str(async_test_user.id)
                        )

                    mock_rollback.assert_called_once()


class TestSessionRepositoryUpdateLastUsedFailures:
    """Test update_last_used exception handling."""

    @pytest.mark.asyncio
    async def test_update_last_used_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test update_last_used handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        # Create a session
        async with SessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Test Device",
                ip_address="127.0.0.1",
                user_agent="Test Agent",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC) - timedelta(hours=1),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)

        # Test update failure
        async with SessionLocal() as session:
            from sqlalchemy import select

            from app.models.user_session import UserSession as US

            result = await session.execute(select(US).where(US.id == user_session.id))
            sess = result.scalar_one()

            async def mock_commit():
                raise OperationalError("Update failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.update_last_used(session, session=sess)

                    mock_rollback.assert_called_once()


class TestSessionRepositoryUpdateRefreshTokenFailures:
    """Test update_refresh_token exception handling."""

    @pytest.mark.asyncio
    async def test_update_refresh_token_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test update_refresh_token handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        # Create a session
        async with SessionLocal() as session:
            user_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti=str(uuid4()),
                device_name="Test Device",
                ip_address="127.0.0.1",
                user_agent="Test Agent",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                last_used_at=datetime.now(UTC),
            )
            session.add(user_session)
            await session.commit()
            await session.refresh(user_session)

        # Test update failure
        async with SessionLocal() as session:
            from sqlalchemy import select

            from app.models.user_session import UserSession as US

            result = await session.execute(select(US).where(US.id == user_session.id))
            sess = result.scalar_one()

            async def mock_commit():
                raise OperationalError("Token update failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.update_refresh_token(
                            session,
                            session=sess,
                            new_jti=str(uuid4()),
                            new_expires_at=datetime.now(UTC) + timedelta(days=14),
                        )

                    mock_rollback.assert_called_once()


class TestSessionRepositoryCleanupExpiredFailures:
    """Test cleanup_expired exception handling."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_commit_failure_triggers_rollback(
        self, async_test_db
    ):
        """Test cleanup_expired handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError("Cleanup failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.cleanup_expired(session, keep_days=30)

                    mock_rollback.assert_called_once()


class TestSessionRepositoryCleanupExpiredForUserFailures:
    """Test cleanup_expired_for_user exception handling."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_for_user_commit_failure_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test cleanup_expired_for_user handles commit failures."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError("User cleanup failed", {}, Exception())

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(OperationalError):
                        await session_repo.cleanup_expired_for_user(
                            session, user_id=str(async_test_user.id)
                        )

                    mock_rollback.assert_called_once()


class TestSessionRepositoryGetUserSessionCountFailures:
    """Test get_user_session_count exception handling."""

    @pytest.mark.asyncio
    async def test_get_user_session_count_database_error(
        self, async_test_db, async_test_user
    ):
        """Test get_user_session_count handles database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Count query failed", {}, Exception())

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await session_repo.get_user_session_count(
                        session, user_id=str(async_test_user.id)
                    )
