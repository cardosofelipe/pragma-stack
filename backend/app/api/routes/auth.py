# app/api/routes/auth.py
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
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
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService, AuthenticationError
from app.services.email_service import email_service
from app.utils.security import create_password_reset_token, verify_password_reset_token
from app.crud.user import user as user_crud
from app.core.auth import get_password_hash

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize limiter for this router
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, operation_id="register")
@limiter.limit("5/minute")
async def register_user(
        request: Request,
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
@limiter.limit("10/minute")
async def login(
        request: Request,
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
@limiter.limit("10/minute")
async def login_oauth(
        request: Request,
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
@limiter.limit("30/minute")
async def refresh_token(
        request: Request,
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


@router.get("/me", response_model=UserResponse, operation_id="get_current_user_info")
@limiter.limit("60/minute")
async def get_current_user_info(
        request: Request,
        current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user information.

    Requires authentication.
    """
    return current_user


@router.post(
    "/password-reset/request",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Password Reset",
    description="""
    Request a password reset link.

    An email will be sent with a reset link if the email exists.
    Always returns success to prevent email enumeration.

    **Rate Limit**: 3 requests/minute
    """,
    operation_id="request_password_reset"
)
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Request a password reset.

    Sends an email with a password reset link.
    Always returns success to prevent email enumeration.
    """
    try:
        # Look up user by email
        user = user_crud.get_by_email(db, email=reset_request.email)

        # Only send email if user exists and is active
        if user and user.is_active:
            # Generate reset token
            reset_token = create_password_reset_token(user.email)

            # Send password reset email
            await email_service.send_password_reset_email(
                to_email=user.email,
                reset_token=reset_token,
                user_name=user.first_name
            )
            logger.info(f"Password reset requested for {user.email}")
        else:
            # Log attempt but don't reveal if email exists
            logger.warning(f"Password reset requested for non-existent or inactive email: {reset_request.email}")

        # Always return success to prevent email enumeration
        return MessageResponse(
            success=True,
            message="If your email is registered, you will receive a password reset link shortly"
        )
    except Exception as e:
        logger.error(f"Error processing password reset request: {str(e)}", exc_info=True)
        # Still return success to prevent information leakage
        return MessageResponse(
            success=True,
            message="If your email is registered, you will receive a password reset link shortly"
        )


@router.post(
    "/password-reset/confirm",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm Password Reset",
    description="""
    Reset password using a token from email.

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="confirm_password_reset"
)
@limiter.limit("5/minute")
def confirm_password_reset(
    request: Request,
    reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm password reset with token.

    Verifies the token and updates the user's password.
    """
    try:
        # Verify the reset token
        email = verify_password_reset_token(reset_confirm.token)

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token"
            )

        # Look up user
        user = user_crud.get_by_email(db, email=email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive"
            )

        # Update password
        user.password_hash = get_password_hash(reset_confirm.new_password)
        db.add(user)
        db.commit()

        logger.info(f"Password reset successful for {user.email}")

        return MessageResponse(
            success=True,
            message="Password has been reset successfully. You can now log in with your new password."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming password reset: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting your password"
        )
