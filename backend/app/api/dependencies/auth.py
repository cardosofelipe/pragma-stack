from typing import Optional

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import get_token_data, TokenExpiredError, TokenInvalidError
from app.core.database_async import get_async_db
from app.models.user import User

# OAuth2 configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
        db: AsyncSession = Depends(get_async_db),
        token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get the current authenticated user.

    Args:
        db: Database session
        token: JWT token from request

    Returns:
        User: The authenticated user

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Decode token and get user ID
        token_data = get_token_data(token)

        # Get user from database
        result = await db.execute(
            select(User).where(User.id == token_data.user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )

        return user

    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except TokenInvalidError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_active_user(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    Check if the current user is active.

    Args:
        current_user: The current authenticated user

    Returns:
        User: The authenticated and active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def get_current_superuser(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    Check if the current user is a superuser.

    Args:
        current_user: The current authenticated user

    Returns:
        User: The authenticated superuser

    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_optional_token(authorization: str = Header(None)) -> Optional[str]:
    """
    Get the token from the Authorization header without requiring it.

    This is a custom dependency that doesn't raise an exception when no token is provided,
    unlike the standard OAuth2PasswordBearer.

    Args:
        authorization: Authorization header value

    Returns:
        The token string if valid Bearer token is provided, None otherwise
    """
    if not authorization:
        return None

    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer":
        return None

    return token


async def get_optional_current_user(
        db: AsyncSession = Depends(get_async_db),
        token: Optional[str] = Depends(get_optional_token)
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.
    Useful for endpoints that work with both authenticated and unauthenticated users.

    Args:
        db: Database session
        token: JWT token from request

    Returns:
        User or None: The authenticated user or None
    """
    if not token:
        return None

    try:
        token_data = get_token_data(token)
        result = await db.execute(
            select(User).where(User.id == token_data.user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None
        return user
    except (TokenExpiredError, TokenInvalidError):
        return None