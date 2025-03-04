# app/services/auth_service.py
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.auth import (
    verify_password,
    get_password_hash,
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
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password.

        Args:
            db: Database session
            email: User email
            password: User password

        Returns:
            User if authenticated, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        return user

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            db: Database session
            user_data: User data

        Returns:
            Created user
        """
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise AuthenticationError("User with this email already exists")

        # Create new user
        hashed_password = get_password_hash(user_data.password)

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
        db.commit()
        db.refresh(user)

        return user

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
    def refresh_tokens(db: Session, refresh_token: str) -> Token:
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
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_active:
                raise TokenInvalidError("Invalid user or inactive account")

            # Generate new tokens
            return AuthService.create_tokens(user)

        except (TokenExpiredError, TokenInvalidError) as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            raise

    @staticmethod
    def change_password(db: Session, user_id: UUID, current_password: str, new_password: str) -> bool:
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
            AuthenticationError: If current password is incorrect
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise AuthenticationError("User not found")

        # Verify current password
        if not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect")

        # Update password
        user.password_hash = get_password_hash(new_password)
        db.commit()

        return True
