# app/api/routes/auth.py
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.auth import TokenExpiredError, TokenInvalidError
from app.core.database import get_db
from app.models.user import User
from app.schemas.users import (
    UserCreate,
    UserResponse,
    Token,
    LoginRequest,
    RefreshTokenRequest
)
from app.services.auth_service import AuthService, AuthenticationError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, operation_id="register")
async def register_user(
        user_data: UserCreate,
        db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user.

    Returns:
        The created user information.
    """
    try:
        user = AuthService.create_user(db, user_data)
        return user
    except AuthenticationError as e:
        logger.warning(f"Registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@router.post("/login", response_model=Token, operation_id="login")
async def login(
        login_data: LoginRequest,
        db: Session = Depends(get_db)
) -> Any:
    """
    Login with username and password.

    Returns:
        Access and refresh tokens.
    """
    try:
        # Attempt to authenticate the user
        user = AuthService.authenticate_user(db, login_data.email, login_data.password)

        # Explicitly check for None result and raise correct exception
        if user is None:
            logger.warning(f"Invalid login attempt for: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # User is authenticated, generate tokens
        tokens = AuthService.create_tokens(user)
        logger.info(f"User login successful: {user.email}")
        return tokens

    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except AuthenticationError as e:
        # Handle specific authentication errors like inactive accounts
        logger.warning(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@router.post("/login/oauth", response_model=Token, operation_id='login_oauth')
async def login_oauth(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2-compatible login endpoint, used by the OpenAPI UI.

    Returns:
        Access and refresh tokens.
    """
    try:
        user = AuthService.authenticate_user(db, form_data.username, form_data.password)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate tokens
        tokens = AuthService.create_tokens(user)

        # Format response for OAuth compatibility
        return {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "token_type": tokens.token_type
        }
    except HTTPException:
        raise
    except AuthenticationError as e:
        logger.warning(f"OAuth authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during OAuth login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@router.post("/refresh", response_model=Token, operation_id="refresh_token")
async def refresh_token(
        refresh_data: RefreshTokenRequest,
        db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token using a refresh token.

    Returns:
        New access and refresh tokens.
    """
    try:
        tokens = AuthService.refresh_tokens(db, refresh_data.refresh_token)
        return tokens
    except TokenExpiredError:
        logger.warning("Token refresh failed: Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenInvalidError:
        logger.warning("Token refresh failed: Invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@router.post("/change-password", status_code=status.HTTP_200_OK, operation_id="change_password")
async def change_password(
        current_password: str = Body(..., embed=True),
        new_password: str = Body(..., embed=True),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
) -> Any:
    """
    Change current user's password.

    Requires authentication.
    """
    try:
        success = AuthService.change_password(
            db=db,
            user_id=current_user.id,
            current_password=current_password,
            new_password=new_password
        )

        if success:
            return {"message": "Password changed successfully"}
    except AuthenticationError as e:
        logger.warning(f"Password change failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during password change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@router.get("/me", response_model=UserResponse, operation_id="get_current_user_info")
async def get_current_user_info(
        current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user information.
    
    Requires authentication.
    """
    return current_user
