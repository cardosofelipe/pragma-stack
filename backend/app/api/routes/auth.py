# app/api/routes/auth.py
import logging
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.core.auth import (
    TokenExpiredError,
    TokenInvalidError,
    decode_token,
)
from app.core.database import get_db
from app.core.exceptions import (
    AuthenticationError as AuthError,
    DatabaseError,
    DuplicateError,
    ErrorCode,
)
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.sessions import LogoutRequest, SessionCreate
from app.schemas.users import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserResponse,
)
from app.services.auth_service import AuthenticationError, AuthService
from app.services.email_service import email_service
from app.services.session_service import session_service
from app.services.user_service import user_service
from app.utils.device import extract_device_info
from app.utils.security import create_password_reset_token, verify_password_reset_token

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize limiter for this router
limiter = Limiter(key_func=get_remote_address)

# Use higher rate limits in test environment
IS_TEST = os.getenv("IS_TEST", "False") == "True"
RATE_MULTIPLIER = 100 if IS_TEST else 1


async def _create_login_session(
    db: AsyncSession,
    request: Request,
    user: User,
    tokens: Token,
    login_type: str = "login",
) -> None:
    """
    Create a session record for successful login.

    This is a best-effort operation - login succeeds even if session creation fails.

    Args:
        db: Database session
        request: FastAPI request object for device info extraction
        user: Authenticated user
        tokens: Token object containing refresh token with JTI
        login_type: Type of login for logging ("login" or "oauth")
    """
    try:
        device_info = extract_device_info(request)

        # Decode refresh token to get JTI and expiration
        refresh_payload = decode_token(tokens.refresh_token, verify_type="refresh")

        session_data = SessionCreate(
            user_id=user.id,
            refresh_token_jti=refresh_payload.jti,
            device_name=device_info.device_name or "API Client",
            device_id=device_info.device_id,
            ip_address=device_info.ip_address,
            user_agent=device_info.user_agent,
            last_used_at=datetime.now(UTC),
            expires_at=datetime.fromtimestamp(refresh_payload.exp, tz=UTC),
            location_city=device_info.location_city,
            location_country=device_info.location_country,
        )

        await session_service.create_session(db, obj_in=session_data)

        logger.info(
            f"{login_type.capitalize()} successful: {user.email} from {device_info.device_name} "
            f"(IP: {device_info.ip_address})"
        )
    except Exception as session_err:
        # Log but don't fail login if session creation fails
        logger.error(
            f"Failed to create session for {user.email}: {session_err!s}", exc_info=True
        )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="register",
)
@limiter.limit(f"{5 * RATE_MULTIPLIER}/minute")
async def register_user(
    request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Register a new user.

    Returns:
        The created user information.
    """
    try:
        user = await AuthService.create_user(db, user_data)
        return user
    except DuplicateError:
        # SECURITY: Don't reveal if email exists - generic error message
        logger.warning(f"Registration failed: duplicate email {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please check your information and try again.",
        )
    except AuthError as e:
        logger.warning(f"Registration failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please check your information and try again.",
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e!s}", exc_info=True)
        raise DatabaseError(
            message="An unexpected error occurred. Please try again later.",
            error_code=ErrorCode.INTERNAL_ERROR,
        )


@router.post("/login", response_model=Token, operation_id="login")
@limiter.limit(f"{10 * RATE_MULTIPLIER}/minute")
async def login(
    request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Login with username and password.

    Creates a new session for this device.

    Returns:
        Access and refresh tokens.
    """
    try:
        # Attempt to authenticate the user
        user = await AuthService.authenticate_user(
            db, login_data.email, login_data.password
        )

        # Explicitly check for None result and raise correct exception
        if user is None:
            logger.warning(f"Invalid login attempt for: {login_data.email}")
            raise AuthError(
                message="Invalid email or password",
                error_code=ErrorCode.INVALID_CREDENTIALS,
            )

        # User is authenticated, generate tokens
        tokens = AuthService.create_tokens(user)

        # Create session record (best-effort, doesn't fail login)
        await _create_login_session(db, request, user, tokens, login_type="login")

        return tokens

    except AuthenticationError as e:
        # Handle specific authentication errors like inactive accounts
        logger.warning(f"Authentication failed: {e!s}")
        raise AuthError(message=str(e), error_code=ErrorCode.INVALID_CREDENTIALS)
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error during login: {e!s}", exc_info=True)
        raise DatabaseError(
            message="An unexpected error occurred. Please try again later.",
            error_code=ErrorCode.INTERNAL_ERROR,
        )


@router.post("/login/oauth", response_model=Token, operation_id="login_oauth")
@limiter.limit("10/minute")
async def login_oauth(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    OAuth2-compatible login endpoint, used by the OpenAPI UI.

    Creates a new session for this device.

    Returns:
        Access and refresh tokens.
    """
    try:
        user = await AuthService.authenticate_user(
            db, form_data.username, form_data.password
        )

        if user is None:
            raise AuthError(
                message="Invalid email or password",
                error_code=ErrorCode.INVALID_CREDENTIALS,
            )

        # Generate tokens
        tokens = AuthService.create_tokens(user)

        # Create session record (best-effort, doesn't fail login)
        await _create_login_session(db, request, user, tokens, login_type="oauth")

        # Return full token response with user data
        return tokens
    except AuthenticationError as e:
        logger.warning(f"OAuth authentication failed: {e!s}")
        raise AuthError(message=str(e), error_code=ErrorCode.INVALID_CREDENTIALS)
    except Exception as e:
        logger.error(f"Unexpected error during OAuth login: {e!s}", exc_info=True)
        raise DatabaseError(
            message="An unexpected error occurred. Please try again later.",
            error_code=ErrorCode.INTERNAL_ERROR,
        )


@router.post("/refresh", response_model=Token, operation_id="refresh_token")
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Refresh access token using a refresh token.

    Validates that the session is still active before issuing new tokens.

    Returns:
        New access and refresh tokens.
    """
    try:
        # Decode the refresh token to get the JTI
        refresh_payload = decode_token(
            refresh_data.refresh_token, verify_type="refresh"
        )

        # Check if session exists and is active
        session = await session_service.get_active_by_jti(db, jti=refresh_payload.jti)

        if not session:
            logger.warning(
                f"Refresh token used for inactive or non-existent session: {refresh_payload.jti}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate new tokens
        tokens = await AuthService.refresh_tokens(db, refresh_data.refresh_token)

        # Decode new refresh token to get new JTI
        new_refresh_payload = decode_token(tokens.refresh_token, verify_type="refresh")

        # Update session with new refresh token JTI and expiration
        try:
            await session_service.update_refresh_token(
                db,
                session=session,
                new_jti=new_refresh_payload.jti,
                new_expires_at=datetime.fromtimestamp(new_refresh_payload.exp, tz=UTC),
            )
        except Exception as session_err:
            logger.error(
                f"Failed to update session {session.id}: {session_err!s}", exc_info=True
            )
            # Continue anyway - tokens are already issued

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
    except HTTPException:
        # Re-raise HTTP exceptions (like session revoked)
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later.",
        )


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
    operation_id="request_password_reset",
)
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Request a password reset.

    Sends an email with a password reset link.
    Always returns success to prevent email enumeration.
    """
    try:
        # Look up user by email
        user = await user_service.get_by_email(db, email=reset_request.email)

        # Only send email if user exists and is active
        if user and user.is_active:
            # Generate reset token
            reset_token = create_password_reset_token(user.email)

            # Send password reset email
            await email_service.send_password_reset_email(
                to_email=user.email, reset_token=reset_token, user_name=user.first_name
            )
            logger.info(f"Password reset requested for {user.email}")
        else:
            # Log attempt but don't reveal if email exists
            logger.warning(
                f"Password reset requested for non-existent or inactive email: {reset_request.email}"
            )

        # Always return success to prevent email enumeration
        return MessageResponse(
            success=True,
            message="If your email is registered, you will receive a password reset link shortly",
        )
    except Exception as e:
        logger.error(f"Error processing password reset request: {e!s}", exc_info=True)
        # Still return success to prevent information leakage
        return MessageResponse(
            success=True,
            message="If your email is registered, you will receive a password reset link shortly",
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
    operation_id="confirm_password_reset",
)
@limiter.limit("5/minute")
async def confirm_password_reset(
    request: Request,
    reset_confirm: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
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
                detail="Invalid or expired password reset token",
            )

        # Reset password via service (validates user exists and is active)
        try:
            user = await AuthService.reset_password(
                db, email=email, new_password=reset_confirm.new_password
            )
        except AuthenticationError as e:
            err_msg = str(e)
            if "inactive" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg
                )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)

        # SECURITY: Invalidate all existing sessions after password reset
        # This prevents stolen sessions from being used after password change
        try:
            deactivated_count = await session_service.deactivate_all_user_sessions(
                db, user_id=str(user.id)
            )
            logger.info(
                f"Password reset successful for {user.email}, invalidated {deactivated_count} sessions"
            )
        except Exception as session_error:
            # Log but don't fail password reset if session invalidation fails
            logger.error(
                f"Failed to invalidate sessions after password reset: {session_error!s}"
            )

        return MessageResponse(
            success=True,
            message="Password has been reset successfully. All devices have been logged out for security. You can now log in with your new password.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming password reset: {e!s}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting your password",
        )


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout from Current Device",
    description="""
    Logout from the current device only.

    Other devices will remain logged in.

    Requires the refresh token to identify which session to terminate.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="logout",
)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    logout_request: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Logout from current device by deactivating the session.

    Args:
        logout_request: Contains the refresh token for this session
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        # Decode refresh token to get JTI
        try:
            refresh_payload = decode_token(
                logout_request.refresh_token, verify_type="refresh"
            )
        except (TokenExpiredError, TokenInvalidError) as e:
            # Even if token is expired/invalid, try to deactivate session
            logger.warning(f"Logout with invalid/expired token: {e!s}")
            # Don't fail - return success anyway
            return MessageResponse(success=True, message="Logged out successfully")

        # Find the session by JTI
        session = await session_service.get_by_jti(db, jti=refresh_payload.jti)

        if session:
            # Verify session belongs to current user (security check)
            if str(session.user_id) != str(current_user.id):
                logger.warning(
                    f"User {current_user.id} attempted to logout session {session.id} "
                    f"belonging to user {session.user_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only logout your own sessions",
                )

            # Deactivate the session
            await session_service.deactivate(db, session_id=str(session.id))

            logger.info(
                f"User {current_user.id} logged out from {session.device_name} "
                f"(session {session.id})"
            )
        else:
            # Session not found - maybe already deleted or never existed
            # Return success anyway (idempotent)
            logger.info(
                f"Logout requested for non-existent session (JTI: {refresh_payload.jti})"
            )

        return MessageResponse(success=True, message="Logged out successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error during logout for user {current_user.id}: {e!s}", exc_info=True
        )
        # Don't expose error details
        return MessageResponse(success=True, message="Logged out successfully")


@router.post(
    "/logout-all",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout from All Devices",
    description="""
    Logout from ALL devices.

    This will terminate all active sessions for the current user.
    You will need to log in again on all devices.

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="logout_all",
)
@limiter.limit("5/minute")
async def logout_all(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Logout from all devices by deactivating all user sessions.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message with count of sessions terminated
    """
    try:
        # Deactivate all sessions for this user
        count = await session_service.deactivate_all_user_sessions(
            db, user_id=str(current_user.id)
        )

        logger.info(
            f"User {current_user.id} logged out from all devices ({count} sessions)"
        )

        return MessageResponse(
            success=True,
            message=f"Successfully logged out from all devices ({count} sessions terminated)",
        )

    except Exception as e:
        logger.error(
            f"Error during logout-all for user {current_user.id}: {e!s}", exc_info=True
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while logging out",
        )
