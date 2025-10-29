# tests/api/dependencies/test_auth_dependencies.py
import pytest
import uuid
from unittest.mock import patch
from fastapi import HTTPException

from app.api.dependencies.auth import (
    get_current_user,
    get_current_active_user,
    get_current_superuser,
    get_optional_current_user
)
from app.core.auth import TokenExpiredError, TokenInvalidError


@pytest.fixture
def mock_token():
    """Fixture providing a mock JWT token"""
    return "mock.jwt.token"


class TestGetCurrentUser:
    """Tests for get_current_user dependency"""

    def test_get_current_user_success(self, db_session, mock_user, mock_token):
        """Test successfully getting the current user"""
        # Mock get_token_data to return user_id that matches our mock_user
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.return_value.user_id = mock_user.id

            # Call the dependency
            user = get_current_user(db=db_session, token=mock_token)

            # Verify the correct user was returned
            assert user.id == mock_user.id
            assert user.email == mock_user.email

    def test_get_current_user_nonexistent(self, db_session, mock_token):
        """Test when the token contains a user ID that doesn't exist"""
        # Mock get_token_data to return a non-existent user ID
        nonexistent_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.return_value.user_id = nonexistent_id

            # Should raise HTTPException with 404 status
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db_session, token=mock_token)

            assert exc_info.value.status_code == 404
            assert "User not found" in exc_info.value.detail

    def test_get_current_user_inactive(self, db_session, mock_user, mock_token):
        """Test when the user is inactive"""
        # Make the user inactive
        mock_user.is_active = False
        db_session.commit()

        # Mock get_token_data
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.return_value.user_id = mock_user.id

            # Should raise HTTPException with 403 status
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db_session, token=mock_token)

            assert exc_info.value.status_code == 403
            assert "Inactive user" in exc_info.value.detail

    def test_get_current_user_expired_token(self, db_session, mock_token):
        """Test with an expired token"""
        # Mock get_token_data to raise TokenExpiredError
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.side_effect = TokenExpiredError("Token expired")

            # Should raise HTTPException with 401 status
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db_session, token=mock_token)

            assert exc_info.value.status_code == 401
            assert "Token expired" in exc_info.value.detail

    def test_get_current_user_invalid_token(self, db_session, mock_token):
        """Test with an invalid token"""
        # Mock get_token_data to raise TokenInvalidError
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.side_effect = TokenInvalidError("Invalid token")

            # Should raise HTTPException with 401 status
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db_session, token=mock_token)

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

    def test_get_optional_current_user_with_token(self, db_session, mock_user, mock_token):
        """Test getting optional user with a valid token"""
        # Mock get_token_data
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.return_value.user_id = mock_user.id

            # Call the dependency
            user = get_optional_current_user(db=db_session, token=mock_token)

            # Should return the correct user
            assert user is not None
            assert user.id == mock_user.id

    def test_get_optional_current_user_no_token(self, db_session):
        """Test getting optional user with no token"""
        # Call the dependency with no token
        user = get_optional_current_user(db=db_session, token=None)

        # Should return None
        assert user is None

    def test_get_optional_current_user_invalid_token(self, db_session, mock_token):
        """Test getting optional user with an invalid token"""
        # Mock get_token_data to raise TokenInvalidError
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.side_effect = TokenInvalidError("Invalid token")

            # Call the dependency
            user = get_optional_current_user(db=db_session, token=mock_token)

            # Should return None, not raise an exception
            assert user is None

    def test_get_optional_current_user_expired_token(self, db_session, mock_token):
        """Test getting optional user with an expired token"""
        # Mock get_token_data to raise TokenExpiredError
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.side_effect = TokenExpiredError("Token expired")

            # Call the dependency
            user = get_optional_current_user(db=db_session, token=mock_token)

            # Should return None, not raise an exception
            assert user is None

    def test_get_optional_current_user_inactive(self, db_session, mock_user, mock_token):
        """Test getting optional user when user is inactive"""
        # Make the user inactive
        mock_user.is_active = False
        db_session.commit()

        # Mock get_token_data
        with patch('app.api.dependencies.auth.get_token_data') as mock_get_data:
            mock_get_data.return_value.user_id = mock_user.id

            # Call the dependency
            user = get_optional_current_user(db=db_session, token=mock_token)

            # Should return None for inactive users
            assert user is None
