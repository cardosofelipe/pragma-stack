# tests/test_init_db.py
"""
Tests for database initialization script.
"""

from unittest.mock import patch

import pytest

from app.core.config import settings
from app.init_db import init_db


class TestInitDb:
    """Tests for init_db functionality."""

    @pytest.mark.asyncio
    async def test_init_db_creates_superuser_when_not_exists(self, async_test_db):
        """Test that init_db creates a superuser when one doesn't exist."""
        _test_engine, SessionLocal = async_test_db

        # Mock the SessionLocal to use our test database
        with patch("app.init_db.SessionLocal", SessionLocal):
            # Mock settings to provide test credentials
            with patch.object(
                settings, "FIRST_SUPERUSER_EMAIL", "test_admin@example.com"
            ):
                with patch.object(
                    settings, "FIRST_SUPERUSER_PASSWORD", "TestAdmin123!"
                ):
                    # Run init_db
                    user = await init_db()

                    # Verify superuser was created
                    assert user is not None
                    assert user.email == "test_admin@example.com"
                    assert user.is_superuser is True
                    assert user.first_name == "Admin"
                    assert user.last_name == "User"

    @pytest.mark.asyncio
    async def test_init_db_returns_existing_superuser(
        self, async_test_db, async_test_user
    ):
        """Test that init_db returns existing superuser instead of creating duplicate."""
        _test_engine, SessionLocal = async_test_db

        # Mock the SessionLocal to use our test database
        with patch("app.init_db.SessionLocal", SessionLocal):
            # Mock settings to match async_test_user's email
            with patch.object(
                settings, "FIRST_SUPERUSER_EMAIL", "testuser@example.com"
            ):
                with patch.object(
                    settings, "FIRST_SUPERUSER_PASSWORD", "TestPassword123!"
                ):
                    # Run init_db
                    user = await init_db()

                    # Verify it returns the existing user
                    assert user is not None
                    assert user.id == async_test_user.id
                    assert user.email == "testuser@example.com"

    @pytest.mark.asyncio
    async def test_init_db_uses_default_credentials(self, async_test_db):
        """Test that init_db uses default credentials when env vars not set."""
        _test_engine, SessionLocal = async_test_db

        # Mock the SessionLocal to use our test database
        with patch("app.init_db.SessionLocal", SessionLocal):
            # Mock settings to have None values (not configured)
            with patch.object(settings, "FIRST_SUPERUSER_EMAIL", None):
                with patch.object(settings, "FIRST_SUPERUSER_PASSWORD", None):
                    # Run init_db
                    user = await init_db()

                    # Verify superuser was created with defaults
                    assert user is not None
                    assert user.email == "admin@example.com"
                    assert user.is_superuser is True

    @pytest.mark.asyncio
    async def test_init_db_handles_database_errors(self, async_test_db):
        """Test that init_db handles database errors gracefully."""
        _test_engine, SessionLocal = async_test_db

        # Mock user_crud.get_by_email to raise an exception
        with patch(
            "app.init_db.user_crud.get_by_email",
            side_effect=Exception("Database error"),
        ):
            with patch("app.init_db.SessionLocal", SessionLocal):
                with patch.object(
                    settings, "FIRST_SUPERUSER_EMAIL", "test@example.com"
                ):
                    with patch.object(
                        settings, "FIRST_SUPERUSER_PASSWORD", "TestPassword123!"
                    ):
                        # Run init_db and expect it to raise
                        with pytest.raises(Exception, match="Database error"):
                            await init_db()
