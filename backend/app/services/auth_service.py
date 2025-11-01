# app/services/auth_service.py
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    verify_password_async,
    get_password_hash_async,
    create_access_token,
    create_refresh_token,
    TokenExpiredError,
    TokenInvalidError
)
from app.models.user import User
from app.schemas.users import Token, UserCreate

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Exception raised for authentication errors"""
    pass


class AuthService:
    """Service for handling authentication operations"""

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password using async password verification.

        Args:
            db: Database session
            email: User email
            password: User password

        Returns:
            User if authenticated, None otherwise
        """
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
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
            result = await db.execute(select(User).where(User.email == user_data.email))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise AuthenticationError("User with this email already exists")

            # Create new user with async password hashing
            # Hash password asynchronously to avoid blocking event loop
            hashed_password = await get_password_hash_async(user_data.password)

            # Create user object from model
            user = User(
                email=user_data.email,
                password_hash=hashed_password,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                phone_number=user_data.phone_number,
                is_active=True,
                is_superuser=False
            )

            db.add(user)
            await db.commit()
            await db.refresh(user)

            logger.info(f"User created successfully: {user.email}")
            return user

        except AuthenticationError:
            # Re-raise authentication errors without rollback
            raise
        except Exception as e:
            # Rollback on any database errors
            await db.rollback()
            logger.error(f"Error creating user: {str(e)}", exc_info=True)
            raise AuthenticationError(f"Failed to create user: {str(e)}")

    @staticmethod
    def create_tokens(user: User) -> Token:
        """
        Create access and refresh tokens for a user.

        Args:
            user: User to create tokens for

        Returns:
            Token object with access and refresh tokens
        """
        # Generate claims
        claims = {
            "is_superuser": user.is_superuser,
            "email": user.email,
            "first_name": user.first_name
        }

        # Create tokens
        access_token = create_access_token(
            subject=str(user.id),
            claims=claims
        )

        refresh_token = create_refresh_token(
            subject=str(user.id)
        )

        return Token(
            access_token=access_token,
            refresh_token=refresh_token
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
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                raise TokenInvalidError("Invalid user or inactive account")

            # Generate new tokens
            return AuthService.create_tokens(user)

        except (TokenExpiredError, TokenInvalidError) as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            raise

    @staticmethod
    async def change_password(db: AsyncSession, user_id: UUID, current_password: str, new_password: str) -> bool:
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
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise AuthenticationError("User not found")

            # Verify current password asynchronously
            if not await verify_password_async(current_password, user.password_hash):
                raise AuthenticationError("Current password is incorrect")

            # Hash new password asynchronously to avoid blocking event loop
            user.password_hash = await get_password_hash_async(new_password)
            await db.commit()

            logger.info(f"Password changed successfully for user {user_id}")
            return True

        except AuthenticationError:
            # Re-raise authentication errors without rollback
            raise
        except Exception as e:
            # Rollback on any database errors
            await db.rollback()
            logger.error(f"Error changing password for user {user_id}: {str(e)}", exc_info=True)
            raise AuthenticationError(f"Failed to change password: {str(e)}")
