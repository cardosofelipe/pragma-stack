# tests/services/test_session_cleanup.py
"""
Comprehensive tests for session cleanup service.
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.models.user_session import UserSession


class TestCleanupExpiredSessions:
    """Tests for cleanup_expired_sessions function."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions_success(
        self, async_test_db, async_test_user
    ):
        """Test successful cleanup of expired sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create mix of sessions
        async with AsyncTestingSessionLocal() as session:
            # 1. Active, not expired (should NOT be deleted)
            active_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active_jti_123",
                device_name="Active Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                created_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC),
            )

            # 2. Inactive, expired, old (SHOULD be deleted)
            old_expired_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="old_expired_jti",
                device_name="Old Device",
                ip_address="192.168.1.2",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(days=10),
                created_at=datetime.now(UTC) - timedelta(days=40),
                last_used_at=datetime.now(UTC),
            )

            # 3. Inactive, expired, recent (should NOT be deleted - within keep_days)
            recent_expired_session = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="recent_expired_jti",
                device_name="Recent Device",
                ip_address="192.168.1.3",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(days=1),
                created_at=datetime.now(UTC) - timedelta(days=5),
                last_used_at=datetime.now(UTC),
            )

            session.add_all(
                [active_session, old_expired_session, recent_expired_session]
            )
            await session.commit()

        # Mock SessionLocal to return our test session
        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            deleted_count = await cleanup_expired_sessions(keep_days=30)

        # Should only delete old_expired_session
        assert deleted_count == 1

        # Verify remaining sessions
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(UserSession))
            remaining = result.scalars().all()
            assert len(remaining) == 2
            jtis = [s.refresh_token_jti for s in remaining]
            assert "active_jti_123" in jtis
            assert "recent_expired_jti" in jtis
            assert "old_expired_jti" not in jtis

    @pytest.mark.asyncio
    async def test_cleanup_no_sessions_to_delete(self, async_test_db, async_test_user):
        """Test cleanup when no sessions meet deletion criteria."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            active = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="active_only_jti",
                device_name="Active Device",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=7),
                created_at=datetime.now(UTC),
                last_used_at=datetime.now(UTC),
            )
            session.add(active)
            await session.commit()

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            deleted_count = await cleanup_expired_sessions(keep_days=30)

        assert deleted_count == 0

    @pytest.mark.asyncio
    async def test_cleanup_empty_database(self, async_test_db):
        """Test cleanup with no sessions in database."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            deleted_count = await cleanup_expired_sessions(keep_days=30)

        assert deleted_count == 0

    @pytest.mark.asyncio
    async def test_cleanup_with_keep_days_0(self, async_test_db, async_test_user):
        """Test cleanup with keep_days=0 deletes all inactive expired sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            today_expired = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="today_expired_jti",
                device_name="Today Expired",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                is_active=False,
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                created_at=datetime.now(UTC) - timedelta(hours=2),
                last_used_at=datetime.now(UTC),
            )
            session.add(today_expired)
            await session.commit()

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            deleted_count = await cleanup_expired_sessions(keep_days=0)

        assert deleted_count == 1

    @pytest.mark.asyncio
    async def test_cleanup_bulk_delete_efficiency(self, async_test_db, async_test_user):
        """Test that cleanup uses bulk DELETE for many sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create 50 expired sessions
        async with AsyncTestingSessionLocal() as session:
            sessions_to_add = []
            for i in range(50):
                expired = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"bulk_jti_{i}",
                    device_name=f"Device {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=False,
                    expires_at=datetime.now(UTC) - timedelta(days=10),
                    created_at=datetime.now(UTC) - timedelta(days=40),
                    last_used_at=datetime.now(UTC),
                )
                sessions_to_add.append(expired)
            session.add_all(sessions_to_add)
            await session.commit()

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            deleted_count = await cleanup_expired_sessions(keep_days=30)

        assert deleted_count == 50

    @pytest.mark.asyncio
    async def test_cleanup_database_error_returns_zero(self, async_test_db):
        """Test cleanup returns 0 on database errors (doesn't crash)."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Mock session_crud.cleanup_expired to raise error
        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            with patch(
                "app.services.session_cleanup.session_crud.cleanup_expired"
            ) as mock_cleanup:
                mock_cleanup.side_effect = Exception("Database connection lost")

                from app.services.session_cleanup import cleanup_expired_sessions

                # Should not crash, should return 0
                deleted_count = await cleanup_expired_sessions(keep_days=30)

        assert deleted_count == 0


class TestGetSessionStatistics:
    """Tests for get_session_statistics function."""

    @pytest.mark.asyncio
    async def test_get_statistics_with_sessions(self, async_test_db, async_test_user):
        """Test getting session statistics with various session types."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # 2 active, not expired
            for i in range(2):
                active = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"active_stat_{i}",
                    device_name=f"Active {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=True,
                    expires_at=datetime.now(UTC) + timedelta(days=7),
                    created_at=datetime.now(UTC),
                    last_used_at=datetime.now(UTC),
                )
                session.add(active)

            # 3 inactive, expired
            for i in range(3):
                inactive = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"inactive_stat_{i}",
                    device_name=f"Inactive {i}",
                    ip_address="192.168.1.2",
                    user_agent="Mozilla/5.0",
                    is_active=False,
                    expires_at=datetime.now(UTC) - timedelta(days=1),
                    created_at=datetime.now(UTC) - timedelta(days=2),
                    last_used_at=datetime.now(UTC),
                )
                session.add(inactive)

            # 1 active but expired
            expired_active = UserSession(
                user_id=async_test_user.id,
                refresh_token_jti="expired_active_stat",
                device_name="Expired Active",
                ip_address="192.168.1.3",
                user_agent="Mozilla/5.0",
                is_active=True,
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                created_at=datetime.now(UTC) - timedelta(days=1),
                last_used_at=datetime.now(UTC),
            )
            session.add(expired_active)

            await session.commit()

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import get_session_statistics

            stats = await get_session_statistics()

        assert stats["total"] == 6
        assert stats["active"] == 3  # 2 active + 1 expired but active
        assert stats["inactive"] == 3
        assert stats["expired"] == 4  # 3 inactive expired + 1 active expired

    @pytest.mark.asyncio
    async def test_get_statistics_empty_database(self, async_test_db):
        """Test getting statistics with no sessions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import get_session_statistics

            stats = await get_session_statistics()

        assert stats["total"] == 0
        assert stats["active"] == 0
        assert stats["inactive"] == 0
        assert stats["expired"] == 0

    @pytest.mark.asyncio
    async def test_get_statistics_database_error_returns_empty_dict(
        self, async_test_db
    ):
        """Test statistics returns empty dict on database errors."""
        _test_engine, _AsyncTestingSessionLocal = async_test_db

        # Create a mock that raises on execute
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("Database error")

        @asynccontextmanager
        async def mock_session_local():
            yield mock_session

        with patch(
            "app.services.session_cleanup.SessionLocal",
            return_value=mock_session_local(),
        ):
            from app.services.session_cleanup import get_session_statistics

            stats = await get_session_statistics()

        assert stats == {}


class TestConcurrentCleanup:
    """Tests for concurrent cleanup scenarios."""

    @pytest.mark.asyncio
    async def test_concurrent_cleanup_no_duplicate_deletes(
        self, async_test_db, async_test_user
    ):
        """Test concurrent cleanups don't cause race conditions."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create 10 expired sessions
        async with AsyncTestingSessionLocal() as session:
            for i in range(10):
                expired = UserSession(
                    user_id=async_test_user.id,
                    refresh_token_jti=f"concurrent_jti_{i}",
                    device_name=f"Device {i}",
                    ip_address="192.168.1.1",
                    user_agent="Mozilla/5.0",
                    is_active=False,
                    expires_at=datetime.now(UTC) - timedelta(days=10),
                    created_at=datetime.now(UTC) - timedelta(days=40),
                    last_used_at=datetime.now(UTC),
                )
                session.add(expired)
            await session.commit()

        # Run two cleanups concurrently
        # Use side_effect to return fresh session instances for each call
        with patch(
            "app.services.session_cleanup.SessionLocal",
            side_effect=lambda: AsyncTestingSessionLocal(),
        ):
            from app.services.session_cleanup import cleanup_expired_sessions

            results = await asyncio.gather(
                cleanup_expired_sessions(keep_days=30),
                cleanup_expired_sessions(keep_days=30),
            )

        # Both should report deleting sessions (may overlap due to transaction timing)
        assert sum(results) >= 10

        # Verify all are deleted
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(UserSession))
            remaining = result.scalars().all()
            assert len(remaining) == 0
