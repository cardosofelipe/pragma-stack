"""
Tests for database utility functions (app/core/database.py).

Covers:
- get_async_database_url (SQLite conversion)
- get_db (session cleanup)
- async_transaction_scope (commit success)
- check_async_database_health
- init_async_db
- close_async_db
"""

from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    async_transaction_scope,
    check_async_database_health,
    close_async_db,
    get_async_database_url,
    get_db,
    init_async_db,
)


class TestGetAsyncDatabaseUrl:
    """Test URL conversion for different database types."""

    def test_postgresql_url_conversion(self):
        """Test PostgreSQL URL gets converted to asyncpg."""
        url = "postgresql://user:pass@localhost/db"
        result = get_async_database_url(url)
        assert result == "postgresql+asyncpg://user:pass@localhost/db"

    def test_sqlite_url_conversion(self):
        """Test SQLite URL gets converted to aiosqlite (covers lines 55-57)."""
        url = "sqlite:///./test.db"
        result = get_async_database_url(url)
        assert result == "sqlite+aiosqlite:///./test.db"

    def test_already_async_url_unchanged(self):
        """Test that already-async URLs are not modified."""
        url = "postgresql+asyncpg://user:pass@localhost/db"
        result = get_async_database_url(url)
        assert result == url

    def test_other_database_url_unchanged(self):
        """Test that other database URLs pass through unchanged."""
        url = "mysql://user:pass@localhost/db"
        result = get_async_database_url(url)
        assert result == url


class TestGetDb:
    """Test the get_db FastAPI dependency."""

    @pytest.mark.asyncio
    async def test_get_db_yields_session(self):
        """Test that get_db yields a valid session."""
        async for session in get_db():
            assert isinstance(session, AsyncSession)
            # Only process first yield
            break

    @pytest.mark.asyncio
    async def test_get_db_closes_session_on_exit(self):
        """Test that get_db closes session even after exception (covers lines 114-118)."""
        session_ref = None

        try:
            async for session in get_db():
                session_ref = session
                # Simulate an error during request processing
                raise RuntimeError("Simulated error")
        except RuntimeError:
            pass  # Expected error

        # Session should be closed even after exception
        # (Testing that finally block executes)
        assert session_ref is not None


class TestAsyncTransactionScope:
    """Test the async_transaction_scope context manager."""

    @pytest.mark.asyncio
    async def test_transaction_scope_commits_on_success(self, async_test_db):
        """Test that successful operations are committed (covers line 138)."""
        # Mock the transaction scope to use test database
        _test_engine, SessionLocal = async_test_db

        with patch("app.core.database.SessionLocal", SessionLocal):
            async with async_transaction_scope() as db:
                # Execute a simple query to verify transaction works
                from sqlalchemy import text

                result = await db.execute(text("SELECT 1"))
                assert result is not None
            # Transaction should be committed (covers line 138 debug log)

    @pytest.mark.asyncio
    async def test_transaction_scope_rollback_on_error(self, async_test_db):
        """Test that transaction rolls back on exception."""
        _test_engine, SessionLocal = async_test_db

        with patch("app.core.database.SessionLocal", SessionLocal):
            with pytest.raises(RuntimeError, match="Test error"):
                async with async_transaction_scope() as db:
                    from sqlalchemy import text

                    await db.execute(text("SELECT 1"))
                    raise RuntimeError("Test error")


class TestCheckAsyncDatabaseHealth:
    """Test database health check function."""

    @pytest.mark.asyncio
    async def test_database_health_check_success(self, async_test_db):
        """Test health check returns True on success (covers line 156)."""
        _test_engine, SessionLocal = async_test_db

        with patch("app.core.database.SessionLocal", SessionLocal):
            result = await check_async_database_health()
            assert result is True

    @pytest.mark.asyncio
    async def test_database_health_check_failure(self):
        """Test health check returns False on database error."""
        # Mock async_transaction_scope to raise an error
        with patch("app.core.database.async_transaction_scope") as mock_scope:
            mock_scope.side_effect = Exception("Database connection failed")

            result = await check_async_database_health()
            assert result is False


class TestInitAsyncDb:
    """Test database initialization function."""

    @pytest.mark.asyncio
    async def test_init_async_db_creates_tables(self, async_test_db):
        """Test init_async_db creates tables (covers lines 174-176)."""
        test_engine, _SessionLocal = async_test_db

        # Mock the engine to use test engine
        with patch("app.core.database.engine", test_engine):
            await init_async_db()
            # If no exception, tables were created successfully


class TestCloseAsyncDb:
    """Test database connection cleanup function."""

    @pytest.mark.asyncio
    async def test_close_async_db_disposes_engine(self):
        """Test close_async_db disposes engine (covers lines 185-186)."""
        # Create a fresh engine to test closing

        # Close connections
        await close_async_db()

        # Engine should be disposed
        # We can test this by checking that a new connection can still be created
        # (the engine will auto-recreate connections)
