# tests/test_init_db.py
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.init_db import init_db
from app.models.user import User
from app.schemas.users import UserCreate


class TestInitDB:
    """Tests for database initialization"""

    def test_init_db_creates_superuser_when_not_exists(self, db_session, monkeypatch):
        """Test that init_db creates superuser when it doesn't exist"""
        # Set environment variables
        monkeypatch.setenv("FIRST_SUPERUSER_EMAIL", "admin@test.com")
        monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "TestPassword123!")

        # Reload settings to pick up environment variables
        from app.core import config
        import importlib
        importlib.reload(config)
        from app.core.config import settings

        # Mock user_crud to return None (user doesn't exist)
        with patch('app.init_db.user_crud') as mock_crud:
            mock_crud.get_by_email.return_value = None

            # Create a mock user to return from create
            from datetime import datetime, timezone
            import uuid
            mock_user = User(
                id=uuid.uuid4(),
                email="admin@test.com",
                password_hash="hashed",
                first_name="Admin",
                last_name="User",
                is_active=True,
                is_superuser=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            mock_crud.create.return_value = mock_user

            # Call init_db
            user = init_db(db_session)

            # Verify user was created
            assert user is not None
            assert user.email == "admin@test.com"
            assert user.is_superuser is True
            mock_crud.create.assert_called_once()

    def test_init_db_returns_existing_superuser(self, db_session, monkeypatch):
        """Test that init_db returns existing superuser without creating new one"""
        # Set environment variables
        monkeypatch.setenv("FIRST_SUPERUSER_EMAIL", "existing@test.com")
        monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "TestPassword123!")

        # Reload settings
        from app.core import config
        import importlib
        importlib.reload(config)

        # Mock user_crud to return existing user
        with patch('app.init_db.user_crud') as mock_crud:
            from datetime import datetime, timezone
            import uuid
            existing_user = User(
                id=uuid.uuid4(),
                email="existing@test.com",
                password_hash="hashed",
                first_name="Existing",
                last_name="User",
                is_active=True,
                is_superuser=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            mock_crud.get_by_email.return_value = existing_user

            # Call init_db
            user = init_db(db_session)

            # Verify existing user was returned
            assert user is not None
            assert user.email == "existing@test.com"
            # create should NOT be called
            mock_crud.create.assert_not_called()

    def test_init_db_uses_defaults_when_env_not_set(self, db_session):
        """Test that init_db uses default credentials when env vars not set"""
        # Mock settings to return None for superuser credentials
        with patch('app.init_db.settings') as mock_settings:
            mock_settings.FIRST_SUPERUSER_EMAIL = None
            mock_settings.FIRST_SUPERUSER_PASSWORD = None

            # Mock user_crud
            with patch('app.init_db.user_crud') as mock_crud:
                mock_crud.get_by_email.return_value = None

                from datetime import datetime, timezone
                import uuid
                mock_user = User(
                    id=uuid.uuid4(),
                    email="admin@example.com",
                    password_hash="hashed",
                    first_name="Admin",
                    last_name="User",
                    is_active=True,
                    is_superuser=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                mock_crud.create.return_value = mock_user

                # Call init_db
                with patch('app.init_db.logger') as mock_logger:
                    user = init_db(db_session)

                    # Verify default email was used
                    mock_crud.get_by_email.assert_called_with(db_session, email="admin@example.com")
                    # Verify warning was logged since credentials not set
                    assert mock_logger.warning.called

    def test_init_db_handles_creation_error(self, db_session, monkeypatch):
        """Test that init_db handles errors during user creation"""
        # Set environment variables
        monkeypatch.setenv("FIRST_SUPERUSER_EMAIL", "admin@test.com")
        monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "TestPassword123!")

        # Reload settings
        from app.core import config
        import importlib
        importlib.reload(config)

        # Mock user_crud to raise an exception
        with patch('app.init_db.user_crud') as mock_crud:
            mock_crud.get_by_email.return_value = None
            mock_crud.create.side_effect = Exception("Database error")

            # Call init_db and expect exception
            with pytest.raises(Exception) as exc_info:
                init_db(db_session)

            assert "Database error" in str(exc_info.value)

    def test_init_db_logs_superuser_creation(self, db_session, monkeypatch):
        """Test that init_db logs appropriate messages"""
        # Set environment variables
        monkeypatch.setenv("FIRST_SUPERUSER_EMAIL", "admin@test.com")
        monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "TestPassword123!")

        # Reload settings
        from app.core import config
        import importlib
        importlib.reload(config)

        # Mock user_crud
        with patch('app.init_db.user_crud') as mock_crud:
            mock_crud.get_by_email.return_value = None

            from datetime import datetime, timezone
            import uuid
            mock_user = User(
                id=uuid.uuid4(),
                email="admin@test.com",
                password_hash="hashed",
                first_name="Admin",
                last_name="User",
                is_active=True,
                is_superuser=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            mock_crud.create.return_value = mock_user

            # Call init_db with logger mock
            with patch('app.init_db.logger') as mock_logger:
                user = init_db(db_session)

                # Verify info log was called
                assert mock_logger.info.called
                info_call_args = str(mock_logger.info.call_args)
                assert "Created first superuser" in info_call_args

    def test_init_db_logs_existing_user(self, db_session, monkeypatch):
        """Test that init_db logs when user already exists"""
        # Set environment variables
        monkeypatch.setenv("FIRST_SUPERUSER_EMAIL", "existing@test.com")
        monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "TestPassword123!")

        # Reload settings
        from app.core import config
        import importlib
        importlib.reload(config)

        # Mock user_crud to return existing user
        with patch('app.init_db.user_crud') as mock_crud:
            from datetime import datetime, timezone
            import uuid
            existing_user = User(
                id=uuid.uuid4(),
                email="existing@test.com",
                password_hash="hashed",
                first_name="Existing",
                last_name="User",
                is_active=True,
                is_superuser=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            mock_crud.get_by_email.return_value = existing_user

            # Call init_db with logger mock
            with patch('app.init_db.logger') as mock_logger:
                user = init_db(db_session)

                # Verify info log was called
                assert mock_logger.info.called
                info_call_args = str(mock_logger.info.call_args)
                assert "already exists" in info_call_args.lower()
