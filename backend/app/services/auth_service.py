# app/services/auth_service.py
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    TokenExpiredError,
    TokenInvalidError,
    create_access_token,
    create_refresh_token,
    get_password_hash_async,
    verify_password_async,
)
from app.core.config import settings
from app.core.exceptions import AuthenticationError, DuplicateError
from app.core.repository_exceptions import DuplicateEntryError
from app.models.user import User
from app.repositories.user import user_repo
from app.schemas.users import Token, UserCreate, UserResponse

logger = logging.getLogger(__name__)

# Pre-computed bcrypt hash used for constant-time comparison when user is not found,
# preventing timing attacks that could enumerate valid email addresses.
_DUMMY_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLFbnJHfxPSEFBzXKiHia"


class AuthService:
    """Service for handling authentication operations"""

    @staticmethod
    async def authenticate_user(
        db: AsyncSession, email: str, password: str
    ) -> User | None:
        """
        Authenticate a user with email and password using async password verification.

        Args:
            db: Database session
            email: User email
            password: User password

        Returns:
            User if authenticated, None otherwise
        """
        user = await user_repo.get_by_email(db, email=email)

        if not user:
            # Perform a dummy verification to match timing of a real bcrypt check,
            # preventing email enumeration via response-time differences.
            await verify_password_async(password, _DUMMY_HASH)
            return None

        # Verify password asynchronously to avoid blocking event loop
        if not await verify_password_async(password, user.password_hash):
            return None

        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        return user

    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            db: Database session
            user_data: User data

        Returns:
            Created user

        Raises:
            AuthenticationError: If user already exists or creation fails
        """
        try:
            # Check if user already exists
            existing_user = await user_repo.get_by_email(db, email=user_data.email)
            if existing_user:
                raise DuplicateError("User with this email already exists")

            # Delegate creation (hashing + commit) to the repository
            user = await user_repo.create(db, obj_in=user_data)

            logger.info(f"User created successfully: {user.email}")
            return user

        except (AuthenticationError, DuplicateError):
            # Re-raise API exceptions without rollback
            raise
        except DuplicateEntryError as e:
            raise DuplicateError(str(e))
        except Exception as e:
            logger.error(f"Error creating user: {e!s}", exc_info=True)
            raise AuthenticationError(f"Failed to create user: {e!s}")

    @staticmethod
    def create_tokens(user: User) -> Token:
        """
        Create access and refresh tokens for a user.

        Args:
            user: User to create tokens for

        Returns:
            Token object with access and refresh tokens and user info
        """
        # Generate claims
        claims = {
            "is_superuser": user.is_superuser,
            "email": user.email,
            "first_name": user.first_name,
        }

        # Create tokens
        access_token = create_access_token(subject=str(user.id), claims=claims)

        refresh_token = create_refresh_token(subject=str(user.id))

        # Convert User model to UserResponse schema
        user_response = UserResponse.model_validate(user)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_response,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            * 60,  # Convert minutes to seconds
        )

    @staticmethod
    async def refresh_tokens(db: AsyncSession, refresh_token: str) -> Token:
        """
        Generate new tokens using a refresh token.

        Args:
            db: Database session
            refresh_token: Valid refresh token

        Returns:
            New access and refresh tokens

        Raises:
            TokenExpiredError: If refresh token has expired
            TokenInvalidError: If refresh token is invalid
        """
        from app.core.auth import decode_token, get_token_data

        try:
            # Verify token is a refresh token
            decode_token(refresh_token, verify_type="refresh")

            # Get user ID from token
            token_data = get_token_data(refresh_token)
            user_id = token_data.user_id

            # Get user from database
            user = await user_repo.get(db, id=str(user_id))
            if not user or not user.is_active:
                raise TokenInvalidError("Invalid user or inactive account")

            # Generate new tokens
            return AuthService.create_tokens(user)

        except (TokenExpiredError, TokenInvalidError) as e:
            logger.warning(f"Token refresh failed: {e!s}")
            raise

    @staticmethod
    async def change_password(
        db: AsyncSession, user_id: UUID, current_password: str, new_password: str
    ) -> bool:
        """
        Change a user's password.

        Args:
            db: Database session
            user_id: User ID
            current_password: Current password
            new_password: New password

        Returns:
            True if password was changed successfully

        Raises:
            AuthenticationError: If current password is incorrect or update fails
        """
        try:
            user = await user_repo.get(db, id=str(user_id))
            if not user:
                raise AuthenticationError("User not found")

            # Verify current password asynchronously
            if not await verify_password_async(current_password, user.password_hash):
                raise AuthenticationError("Current password is incorrect")

            # Hash new password asynchronously to avoid blocking event loop
            new_hash = await get_password_hash_async(new_password)
            await user_repo.update_password(db, user=user, password_hash=new_hash)

            logger.info(f"Password changed successfully for user {user_id}")
            return True

        except AuthenticationError:
            # Re-raise authentication errors without rollback
            raise
        except Exception as e:
            # Rollback on any database errors
            await db.rollback()
            logger.error(
                f"Error changing password for user {user_id}: {e!s}", exc_info=True
            )
            raise AuthenticationError(f"Failed to change password: {e!s}")

    @staticmethod
    async def reset_password(
        db: AsyncSession, *, email: str, new_password: str
    ) -> User:
        """
        Reset a user's password without requiring the current password.

        Args:
            db: Database session
            email: User email address
            new_password: New password to set

        Returns:
            Updated user

        Raises:
            AuthenticationError: If user not found or inactive
        """
        user = await user_repo.get_by_email(db, email=email)
        if not user:
            raise AuthenticationError("User not found")
        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        new_hash = await get_password_hash_async(new_password)
        user = await user_repo.update_password(db, user=user, password_hash=new_hash)
        logger.info(f"Password reset successfully for {email}")
        return user
