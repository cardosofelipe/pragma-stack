# tests/api/dependencies/test_auth_dependencies.py
import uuid
from unittest.mock import patch

import pytest
import pytest_asyncio
from fastapi import HTTPException

from app.api.dependencies.auth import (
    get_current_active_user,
    get_current_superuser,
    get_current_user,
    get_optional_current_user,
)
from app.core.auth import TokenExpiredError, TokenInvalidError, get_password_hash
from app.models.user import User


@pytest.fixture
def mock_token():
    """Fixture providing a mock JWT token"""
    return "mock.jwt.token"


@pytest_asyncio.fixture
async def async_mock_user(async_test_db):
    """Async fixture to create and return a mock User instance."""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        mock_user = User(
            id=uuid.uuid4(),
            email="mockuser@example.com",
            password_hash=get_password_hash("mockhashedpassword"),
            first_name="Mock",
            last_name="User",
            phone_number="1234567890",
            is_active=True,
            is_superuser=False,
            preferences=None,
        )
        session.add(mock_user)
        await session.commit()
        await session.refresh(mock_user)
        return mock_user


class TestGetCurrentUser:
    """Tests for get_current_user dependency"""

    @pytest.mark.asyncio
    async def test_get_current_user_success(
        self, async_test_db, async_mock_user, mock_token
    ):
        """Test successfully getting the current user"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to return user_id that matches our mock_user
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.return_value.user_id = async_mock_user.id

                # Call the dependency
                user = await get_current_user(db=session, token=mock_token)

                # Verify the correct user was returned
                assert user.id == async_mock_user.id
                assert user.email == async_mock_user.email

    @pytest.mark.asyncio
    async def test_get_current_user_nonexistent(self, async_test_db, mock_token):
        """Test when the token contains a user ID that doesn't exist"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to return a non-existent user ID
            nonexistent_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.return_value.user_id = nonexistent_id

                # Should raise HTTPException with 404 status
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(db=session, token=mock_token)

                assert exc_info.value.status_code == 404
                assert "User not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_user_inactive(
        self, async_test_db, async_mock_user, mock_token
    ):
        """Test when the user is inactive"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Get the user in this session and make it inactive
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.id == async_mock_user.id)
            )
            user_in_session = result.scalar_one_or_none()
            user_in_session.is_active = False
            await session.commit()

            # Mock get_token_data
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.return_value.user_id = async_mock_user.id

                # Should raise HTTPException with 403 status
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(db=session, token=mock_token)

                assert exc_info.value.status_code == 403
                assert "Inactive user" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_user_expired_token(self, async_test_db, mock_token):
        """Test with an expired token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to raise TokenExpiredError
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.side_effect = TokenExpiredError("Token expired")

                # Should raise HTTPException with 401 status
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(db=session, token=mock_token)

                assert exc_info.value.status_code == 401
                assert "Token expired" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, async_test_db, mock_token):
        """Test with an invalid token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to raise TokenInvalidError
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.side_effect = TokenInvalidError("Invalid token")

                # Should raise HTTPException with 401 status
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(db=session, token=mock_token)

                assert exc_info.value.status_code == 401
                assert "Could not validate credentials" in exc_info.value.detail


class TestGetCurrentActiveUser:
    """Tests for get_current_active_user dependency"""

    def test_get_current_active_user(self, mock_user):
        """Test getting an active user"""
        # Ensure user is active
        mock_user.is_active = True

        # Call the dependency with mocked current_user
        user = get_current_active_user(current_user=mock_user)

        # Should return the same user
        assert user == mock_user

    def test_get_current_inactive_user(self, mock_user):
        """Test getting an inactive user"""
        # Make user inactive
        mock_user.is_active = False

        # Should raise HTTPException with 403 status
        with pytest.raises(HTTPException) as exc_info:
            get_current_active_user(current_user=mock_user)

        assert exc_info.value.status_code == 403
        assert "Inactive user" in exc_info.value.detail


class TestGetCurrentSuperuser:
    """Tests for get_current_superuser dependency"""

    def test_get_current_superuser(self, mock_user):
        """Test getting a superuser"""
        # Make user a superuser
        mock_user.is_superuser = True

        # Call the dependency with mocked current_user
        user = get_current_superuser(current_user=mock_user)

        # Should return the same user
        assert user == mock_user

    def test_get_current_non_superuser(self, mock_user):
        """Test getting a non-superuser"""
        # Ensure user is not a superuser
        mock_user.is_superuser = False

        # Should raise HTTPException with 403 status
        with pytest.raises(HTTPException) as exc_info:
            get_current_superuser(current_user=mock_user)

        assert exc_info.value.status_code == 403
        assert "Not enough permissions" in exc_info.value.detail


class TestGetOptionalCurrentUser:
    """Tests for get_optional_current_user dependency"""

    @pytest.mark.asyncio
    async def test_get_optional_current_user_with_token(
        self, async_test_db, async_mock_user, mock_token
    ):
        """Test getting optional user with a valid token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.return_value.user_id = async_mock_user.id

                # Call the dependency
                user = await get_optional_current_user(db=session, token=mock_token)

                # Should return the correct user
                assert user is not None
                assert user.id == async_mock_user.id

    @pytest.mark.asyncio
    async def test_get_optional_current_user_no_token(self, async_test_db):
        """Test getting optional user with no token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Call the dependency with no token
            user = await get_optional_current_user(db=session, token=None)

            # Should return None
            assert user is None

    @pytest.mark.asyncio
    async def test_get_optional_current_user_invalid_token(
        self, async_test_db, mock_token
    ):
        """Test getting optional user with an invalid token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to raise TokenInvalidError
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.side_effect = TokenInvalidError("Invalid token")

                # Call the dependency
                user = await get_optional_current_user(db=session, token=mock_token)

                # Should return None, not raise an exception
                assert user is None

    @pytest.mark.asyncio
    async def test_get_optional_current_user_expired_token(
        self, async_test_db, mock_token
    ):
        """Test getting optional user with an expired token"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Mock get_token_data to raise TokenExpiredError
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.side_effect = TokenExpiredError("Token expired")

                # Call the dependency
                user = await get_optional_current_user(db=session, token=mock_token)

                # Should return None, not raise an exception
                assert user is None

    @pytest.mark.asyncio
    async def test_get_optional_current_user_inactive(
        self, async_test_db, async_mock_user, mock_token
    ):
        """Test getting optional user when user is inactive"""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            # Get the user in this session and make it inactive
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.id == async_mock_user.id)
            )
            user_in_session = result.scalar_one_or_none()
            user_in_session.is_active = False
            await session.commit()

            # Mock get_token_data
            with patch("app.api.dependencies.auth.get_token_data") as mock_get_data:
                mock_get_data.return_value.user_id = async_mock_user.id

                # Call the dependency
                user = await get_optional_current_user(db=session, token=mock_token)

                # Should return None for inactive users
                assert user is None
