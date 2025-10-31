# tests/services/test_auth_service.py
import uuid
import pytest
from unittest.mock import patch

from app.core.auth import get_password_hash, verify_password, TokenExpiredError, TokenInvalidError
from app.models.user import User
from app.schemas.users import UserCreate, Token
from app.services.auth_service import AuthService, AuthenticationError


class TestAuthServiceAuthentication:
    """Tests for AuthService.authenticate_user method"""

    def test_authenticate_valid_user(self, db_session, mock_user):
        """Test authenticating a user with valid credentials"""
        # Set a known password for the mock user
        password = "TestPassword123"
        mock_user.password_hash = get_password_hash(password)
        db_session.commit()

        # Authenticate with correct credentials
        user = AuthService.authenticate_user(
            db=db_session,
            email=mock_user.email,
            password=password
        )

        assert user is not None
        assert user.id == mock_user.id
        assert user.email == mock_user.email

    def test_authenticate_nonexistent_user(self, db_session):
        """Test authenticating with an email that doesn't exist"""
        user = AuthService.authenticate_user(
            db=db_session,
            email="nonexistent@example.com",
            password="password"
        )

        assert user is None

    def test_authenticate_with_wrong_password(self, db_session, mock_user):
        """Test authenticating with the wrong password"""
        # Set a known password for the mock user
        password = "TestPassword123"
        mock_user.password_hash = get_password_hash(password)
        db_session.commit()

        # Authenticate with wrong password
        user = AuthService.authenticate_user(
            db=db_session,
            email=mock_user.email,
            password="WrongPassword123"
        )

        assert user is None

    def test_authenticate_inactive_user(self, db_session, mock_user):
        """Test authenticating an inactive user"""
        # Set a known password and make user inactive
        password = "TestPassword123"
        mock_user.password_hash = get_password_hash(password)
        mock_user.is_active = False
        db_session.commit()

        # Should raise AuthenticationError
        with pytest.raises(AuthenticationError):
            AuthService.authenticate_user(
                db=db_session,
                email=mock_user.email,
                password=password
            )


class TestAuthServiceUserCreation:
    """Tests for AuthService.create_user method"""

    def test_create_new_user(self, db_session):
        """Test creating a new user"""
        user_data = UserCreate(
            email="newuser@example.com",
            password="TestPassword123",
            first_name="New",
            last_name="User",
            phone_number="1234567890"
        )

        user = AuthService.create_user(db=db_session, user_data=user_data)

        # Verify user was created with correct data
        assert user is not None
        assert user.email == user_data.email
        assert user.first_name == user_data.first_name
        assert user.last_name == user_data.last_name
        assert user.phone_number == user_data.phone_number

        # Verify password was hashed
        assert user.password_hash != user_data.password
        assert verify_password(user_data.password, user.password_hash)

        # Verify default values
        assert user.is_active is True
        assert user.is_superuser is False

    def test_create_user_with_existing_email(self, db_session, mock_user):
        """Test creating a user with an email that already exists"""
        user_data = UserCreate(
            email=mock_user.email,  # Use existing email
            password="TestPassword123",
            first_name="Duplicate",
            last_name="User"
        )

        # Should raise AuthenticationError
        with pytest.raises(AuthenticationError):
            AuthService.create_user(db=db_session, user_data=user_data)


class TestAuthServiceTokens:
    """Tests for AuthService token-related methods"""

    def test_create_tokens(self, mock_user):
        """Test creating access and refresh tokens for a user"""
        tokens = AuthService.create_tokens(mock_user)

        # Verify token structure
        assert isinstance(tokens, Token)
        assert tokens.access_token is not None
        assert tokens.refresh_token is not None
        assert tokens.token_type == "bearer"

        # This is a more in-depth test that would decode the tokens to verify claims
        # but we'll rely on the auth module tests for token verification

    def test_refresh_tokens(self, db_session, mock_user):
        """Test refreshing tokens with a valid refresh token"""
        # Create initial tokens
        initial_tokens = AuthService.create_tokens(mock_user)

        # Refresh tokens
        new_tokens = AuthService.refresh_tokens(
            db=db_session,
            refresh_token=initial_tokens.refresh_token
        )

        # Verify new tokens are different from old ones
        assert new_tokens.access_token != initial_tokens.access_token
        assert new_tokens.refresh_token != initial_tokens.refresh_token

    def test_refresh_tokens_with_invalid_token(self, db_session):
        """Test refreshing tokens with an invalid token"""
        # Create an invalid token
        invalid_token = "invalid.token.string"

        # Should raise TokenInvalidError
        with pytest.raises(TokenInvalidError):
            AuthService.refresh_tokens(
                db=db_session,
                refresh_token=invalid_token
            )

    def test_refresh_tokens_with_access_token(self, db_session, mock_user):
        """Test refreshing tokens with an access token instead of refresh token"""
        # Create tokens
        tokens = AuthService.create_tokens(mock_user)

        # Try to refresh with access token
        with pytest.raises(TokenInvalidError):
            AuthService.refresh_tokens(
                db=db_session,
                refresh_token=tokens.access_token
            )

    def test_refresh_tokens_with_nonexistent_user(self, db_session):
        """Test refreshing tokens for a user that doesn't exist in the database"""
        # Create a token for a non-existent user
        non_existent_id = str(uuid.uuid4())
        with patch('app.core.auth.decode_token'), patch('app.core.auth.get_token_data') as mock_get_data:
            # Mock the token data to return a non-existent user ID
            mock_get_data.return_value.user_id = uuid.UUID(non_existent_id)

            # Should raise TokenInvalidError
            with pytest.raises(TokenInvalidError):
                AuthService.refresh_tokens(
                    db=db_session,
                    refresh_token="some.refresh.token"
                )


class TestAuthServicePasswordChange:
    """Tests for AuthService.change_password method"""

    def test_change_password(self, db_session, mock_user):
        """Test changing a user's password"""
        # Set a known password for the mock user
        current_password = "CurrentPassword123"
        mock_user.password_hash = get_password_hash(current_password)
        db_session.commit()

        # Change password
        new_password = "NewPassword456"
        result = AuthService.change_password(
            db=db_session,
            user_id=mock_user.id,
            current_password=current_password,
            new_password=new_password
        )

        # Verify operation was successful
        assert result is True

        # Refresh user from DB
        db_session.refresh(mock_user)

        # Verify old password no longer works
        assert not verify_password(current_password, mock_user.password_hash)

        # Verify new password works
        assert verify_password(new_password, mock_user.password_hash)

    def test_change_password_wrong_current_password(self, db_session, mock_user):
        """Test changing password with incorrect current password"""
        # Set a known password for the mock user
        current_password = "CurrentPassword123"
        mock_user.password_hash = get_password_hash(current_password)
        db_session.commit()

        # Try to change password with wrong current password
        wrong_password = "WrongPassword123"
        with pytest.raises(AuthenticationError):
            AuthService.change_password(
                db=db_session,
                user_id=mock_user.id,
                current_password=wrong_password,
                new_password="NewPassword456"
            )

        # Verify password was not changed
        assert verify_password(current_password, mock_user.password_hash)

    def test_change_password_nonexistent_user(self, db_session):
        """Test changing password for a user that doesn't exist"""
        non_existent_id = uuid.uuid4()

        with pytest.raises(AuthenticationError):
            AuthService.change_password(
                db=db_session,
                user_id=non_existent_id,
                current_password="CurrentPassword123",
                new_password="NewPassword456"
            )