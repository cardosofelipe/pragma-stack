# tests/services/test_auth_service.py
import uuid
import pytest
import pytest_asyncio
from unittest.mock import patch
from sqlalchemy import select

from app.core.auth import get_password_hash, verify_password, TokenExpiredError, TokenInvalidError
from app.models.user import User
from app.schemas.users import UserCreate, Token
from app.services.auth_service import AuthService, AuthenticationError


class TestAuthServiceAuthentication:
    """Tests for AuthService.authenticate_user method"""

    @pytest.mark.asyncio
    async def test_authenticate_valid_user(self, async_test_db, async_test_user):
        """Test authenticating a user with valid credentials"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Set a known password for the mock user
        password = "TestPassword123!"
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            user.password_hash = get_password_hash(password)
            await session.commit()

        # Authenticate with correct credentials
        async with AsyncTestingSessionLocal() as session:
            auth_user = await AuthService.authenticate_user(
                db=session,
                email=async_test_user.email,
                password=password
            )

            assert auth_user is not None
            assert auth_user.id == async_test_user.id
            assert auth_user.email == async_test_user.email

    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_user(self, async_test_db):
        """Test authenticating with an email that doesn't exist"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user = await AuthService.authenticate_user(
                db=session,
                email="nonexistent@example.com",
                password="password"
            )

            assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_with_wrong_password(self, async_test_db, async_test_user):
        """Test authenticating with the wrong password"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Set a known password for the mock user
        password = "TestPassword123!"
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            user.password_hash = get_password_hash(password)
            await session.commit()

        # Authenticate with wrong password
        async with AsyncTestingSessionLocal() as session:
            auth_user = await AuthService.authenticate_user(
                db=session,
                email=async_test_user.email,
                password="WrongPassword123"
            )

            assert auth_user is None

    @pytest.mark.asyncio
    async def test_authenticate_inactive_user(self, async_test_db, async_test_user):
        """Test authenticating an inactive user"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Set a known password and make user inactive
        password = "TestPassword123!"
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            user.password_hash = get_password_hash(password)
            user.is_active = False
            await session.commit()

        # Should raise AuthenticationError
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(AuthenticationError):
                await AuthService.authenticate_user(
                    db=session,
                    email=async_test_user.email,
                    password=password
                )


class TestAuthServiceUserCreation:
    """Tests for AuthService.create_user method"""

    @pytest.mark.asyncio
    async def test_create_new_user(self, async_test_db):
        """Test creating a new user"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        user_data = UserCreate(
            email="newuser@example.com",
            password="TestPassword123!",
            first_name="New",
            last_name="User",
            phone_number="+1234567890"
        )

        async with AsyncTestingSessionLocal() as session:
            user = await AuthService.create_user(db=session, user_data=user_data)

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

    @pytest.mark.asyncio
    async def test_create_user_with_existing_email(self, async_test_db, async_test_user):
        """Test creating a user with an email that already exists"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        user_data = UserCreate(
            email=async_test_user.email,  # Use existing email
            password="TestPassword123!",
            first_name="Duplicate",
            last_name="User"
        )

        # Should raise AuthenticationError
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(AuthenticationError):
                await AuthService.create_user(db=session, user_data=user_data)


class TestAuthServiceTokens:
    """Tests for AuthService token-related methods"""

    @pytest.mark.asyncio
    async def test_create_tokens(self, async_test_user):
        """Test creating access and refresh tokens for a user"""
        tokens = AuthService.create_tokens(async_test_user)

        # Verify token structure
        assert isinstance(tokens, Token)
        assert tokens.access_token is not None
        assert tokens.refresh_token is not None
        assert tokens.token_type == "bearer"

    @pytest.mark.asyncio
    async def test_refresh_tokens(self, async_test_db, async_test_user):
        """Test refreshing tokens with a valid refresh token"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create initial tokens
        initial_tokens = AuthService.create_tokens(async_test_user)

        # Refresh tokens
        async with AsyncTestingSessionLocal() as session:
            new_tokens = await AuthService.refresh_tokens(
                db=session,
                refresh_token=initial_tokens.refresh_token
            )

            # Verify new tokens are different from old ones
            assert new_tokens.access_token != initial_tokens.access_token
            assert new_tokens.refresh_token != initial_tokens.refresh_token

    @pytest.mark.asyncio
    async def test_refresh_tokens_with_invalid_token(self, async_test_db):
        """Test refreshing tokens with an invalid token"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create an invalid token
        invalid_token = "invalid.token.string"

        # Should raise TokenInvalidError
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(TokenInvalidError):
                await AuthService.refresh_tokens(
                    db=session,
                    refresh_token=invalid_token
                )

    @pytest.mark.asyncio
    async def test_refresh_tokens_with_access_token(self, async_test_db, async_test_user):
        """Test refreshing tokens with an access token instead of refresh token"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create tokens
        tokens = AuthService.create_tokens(async_test_user)

        # Try to refresh with access token
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(TokenInvalidError):
                await AuthService.refresh_tokens(
                    db=session,
                    refresh_token=tokens.access_token
                )

    @pytest.mark.asyncio
    async def test_refresh_tokens_with_nonexistent_user(self, async_test_db):
        """Test refreshing tokens for a user that doesn't exist in the database"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a token for a non-existent user
        non_existent_id = str(uuid.uuid4())
        with patch('app.core.auth.decode_token'), patch('app.core.auth.get_token_data') as mock_get_data:
            # Mock the token data to return a non-existent user ID
            mock_get_data.return_value.user_id = uuid.UUID(non_existent_id)

            # Should raise TokenInvalidError
            async with AsyncTestingSessionLocal() as session:
                with pytest.raises(TokenInvalidError):
                    await AuthService.refresh_tokens(
                        db=session,
                        refresh_token="some.refresh.token"
                    )


class TestAuthServicePasswordChange:
    """Tests for AuthService.change_password method"""

    @pytest.mark.asyncio
    async def test_change_password(self, async_test_db, async_test_user):
        """Test changing a user's password"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Set a known password for the mock user
        current_password = "CurrentPassword123"
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            user.password_hash = get_password_hash(current_password)
            await session.commit()

        # Change password
        new_password = "NewPassword456"
        async with AsyncTestingSessionLocal() as session:
            result = await AuthService.change_password(
                db=session,
                user_id=async_test_user.id,
                current_password=current_password,
                new_password=new_password
            )

            # Verify operation was successful
            assert result is True

        # Verify password was changed
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            updated_user = result.scalar_one_or_none()

            # Verify old password no longer works
            assert not verify_password(current_password, updated_user.password_hash)

            # Verify new password works
            assert verify_password(new_password, updated_user.password_hash)

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_password(self, async_test_db, async_test_user):
        """Test changing password with incorrect current password"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Set a known password for the mock user
        current_password = "CurrentPassword123"
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            user.password_hash = get_password_hash(current_password)
            await session.commit()

        # Try to change password with wrong current password
        wrong_password = "WrongPassword123"
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(AuthenticationError):
                await AuthService.change_password(
                    db=session,
                    user_id=async_test_user.id,
                    current_password=wrong_password,
                    new_password="NewPassword456"
                )

        # Verify password was not changed
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user = result.scalar_one_or_none()
            assert verify_password(current_password, user.password_hash)

    @pytest.mark.asyncio
    async def test_change_password_nonexistent_user(self, async_test_db):
        """Test changing password for a user that doesn't exist"""
        test_engine, AsyncTestingSessionLocal = async_test_db

        non_existent_id = uuid.uuid4()

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(AuthenticationError):
                await AuthService.change_password(
                    db=session,
                    user_id=non_existent_id,
                    current_password="CurrentPassword123",
                    new_password="NewPassword456"
                )
