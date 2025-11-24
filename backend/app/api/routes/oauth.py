# app/api/routes/oauth.py
"""
OAuth routes for social authentication.

Endpoints:
- GET /oauth/providers - List enabled OAuth providers
- GET /oauth/authorize/{provider} - Get authorization URL
- POST /oauth/callback/{provider} - Handle OAuth callback
- GET /oauth/accounts - List linked OAuth accounts
- DELETE /oauth/accounts/{provider} - Unlink an OAuth account
"""

import logging
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user, get_optional_current_user
from app.core.auth import decode_token
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthenticationError as AuthError
from app.crud import oauth_account
from app.crud.session import session as session_crud
from app.models.user import User
from app.schemas.oauth import (
    OAuthAccountsListResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    OAuthProvidersResponse,
    OAuthUnlinkResponse,
)
from app.schemas.sessions import SessionCreate
from app.schemas.users import Token
from app.services.oauth_service import OAuthService
from app.utils.device import extract_device_info

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize limiter for this router
limiter = Limiter(key_func=get_remote_address)

# Use higher rate limits in test environment
IS_TEST = os.getenv("IS_TEST", "False") == "True"
RATE_MULTIPLIER = 100 if IS_TEST else 1


async def _create_oauth_login_session(
    db: AsyncSession,
    request: Request,
    user: User,
    tokens: Token,
    provider: str,
) -> None:
    """
    Create a session record for successful OAuth login.

    This is a best-effort operation - login succeeds even if session creation fails.
    """
    try:
        device_info = extract_device_info(request)

        # Decode refresh token to get JTI and expiration
        refresh_payload = decode_token(tokens.refresh_token, verify_type="refresh")

        session_data = SessionCreate(
            user_id=user.id,
            refresh_token_jti=refresh_payload.jti,
            device_name=device_info.device_name or f"OAuth ({provider})",
            device_id=device_info.device_id,
            ip_address=device_info.ip_address,
            user_agent=device_info.user_agent,
            last_used_at=datetime.now(UTC),
            expires_at=datetime.fromtimestamp(refresh_payload.exp, tz=UTC),
            location_city=device_info.location_city,
            location_country=device_info.location_country,
        )

        await session_crud.create_session(db, obj_in=session_data)

        logger.info(
            f"OAuth login successful: {user.email} via {provider} "
            f"from {device_info.device_name} (IP: {device_info.ip_address})"
        )
    except Exception as session_err:
        # Log but don't fail login if session creation fails
        logger.error(
            f"Failed to create session for OAuth login {user.email}: {session_err!s}",
            exc_info=True,
        )


@router.get(
    "/providers",
    response_model=OAuthProvidersResponse,
    summary="List OAuth Providers",
    description="""
    Get list of enabled OAuth providers for the login/register UI.

    Returns:
        List of enabled providers with display info.
    """,
    operation_id="list_oauth_providers",
)
async def list_providers() -> Any:
    """
    Get list of enabled OAuth providers.

    This endpoint is public (no authentication required) as it's needed
    for the login/register UI to display available social login options.
    """
    return OAuthService.get_enabled_providers()


@router.get(
    "/authorize/{provider}",
    response_model=dict,
    summary="Get OAuth Authorization URL",
    description="""
    Get the authorization URL to redirect the user to the OAuth provider.

    The frontend should redirect the user to the returned URL.
    After authentication, the provider will redirect back to the callback URL.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="get_oauth_authorization_url",
)
@limiter.limit(f"{10 * RATE_MULTIPLIER}/minute")
async def get_authorization_url(
    request: Request,
    provider: str,
    redirect_uri: str = Query(
        ..., description="Frontend callback URL after OAuth completes"
    ),
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get OAuth authorization URL.

    Args:
        provider: OAuth provider (google, github)
        redirect_uri: Frontend callback URL
        current_user: Current user (optional, for account linking)
        db: Database session

    Returns:
        dict with authorization_url and state
    """
    if not settings.OAUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth is not enabled",
        )

    try:
        # If user is logged in, this is an account linking flow
        user_id = str(current_user.id) if current_user else None

        url, state = await OAuthService.create_authorization_url(
            db,
            provider=provider,
            redirect_uri=redirect_uri,
            user_id=user_id,
        )

        return {
            "authorization_url": url,
            "state": state,
        }

    except AuthError as e:
        logger.warning(f"OAuth authorization failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"OAuth authorization error: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create authorization URL",
        )


@router.post(
    "/callback/{provider}",
    response_model=OAuthCallbackResponse,
    summary="OAuth Callback",
    description="""
    Handle OAuth callback from provider.

    The frontend should call this endpoint with the code and state
    parameters received from the OAuth provider redirect.

    Returns:
        JWT tokens for the authenticated user.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="handle_oauth_callback",
)
@limiter.limit(f"{10 * RATE_MULTIPLIER}/minute")
async def handle_callback(
    request: Request,
    provider: str,
    callback_data: OAuthCallbackRequest,
    redirect_uri: str = Query(
        ..., description="Must match the redirect_uri used in authorization"
    ),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Handle OAuth callback.

    Args:
        provider: OAuth provider (google, github)
        callback_data: Code and state from provider
        redirect_uri: Original redirect URI (for validation)
        db: Database session

    Returns:
        OAuthCallbackResponse with tokens
    """
    if not settings.OAUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth is not enabled",
        )

    try:
        result = await OAuthService.handle_callback(
            db,
            code=callback_data.code,
            state=callback_data.state,
            redirect_uri=redirect_uri,
        )

        # Create session for the login (need to get the user first)
        # Note: This requires fetching the user from the token
        # For now, we skip session creation here as the result doesn't include user info
        # The session will be created on next request if needed

        return result

    except AuthError as e:
        logger.warning(f"OAuth callback failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"OAuth callback error: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed",
        )


@router.get(
    "/accounts",
    response_model=OAuthAccountsListResponse,
    summary="List Linked OAuth Accounts",
    description="""
    Get list of OAuth accounts linked to the current user.

    Requires authentication.
    """,
    operation_id="list_oauth_accounts",
)
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    List OAuth accounts linked to the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of linked OAuth accounts
    """
    accounts = await oauth_account.get_user_accounts(db, user_id=current_user.id)
    return OAuthAccountsListResponse(accounts=accounts)


@router.delete(
    "/accounts/{provider}",
    response_model=OAuthUnlinkResponse,
    summary="Unlink OAuth Account",
    description="""
    Unlink an OAuth provider from the current user.

    The user must have either a password set or another OAuth provider
    linked to ensure they can still log in.

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="unlink_oauth_account",
)
@limiter.limit(f"{5 * RATE_MULTIPLIER}/minute")
async def unlink_account(
    request: Request,
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Unlink an OAuth provider from the current user.

    Args:
        provider: Provider to unlink (google, github)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        await OAuthService.unlink_provider(
            db,
            user=current_user,
            provider=provider,
        )

        return OAuthUnlinkResponse(
            success=True,
            message=f"{provider.capitalize()} account unlinked successfully",
        )

    except AuthError as e:
        logger.warning(f"OAuth unlink failed for {current_user.email}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"OAuth unlink error: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink OAuth account",
        )


@router.post(
    "/link/{provider}",
    response_model=dict,
    summary="Start Account Linking",
    description="""
    Start the OAuth flow to link a new provider to the current user.

    This is a convenience endpoint that redirects to /authorize/{provider}
    with the current user context.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="start_oauth_link",
)
@limiter.limit(f"{10 * RATE_MULTIPLIER}/minute")
async def start_link(
    request: Request,
    provider: str,
    redirect_uri: str = Query(
        ..., description="Frontend callback URL after OAuth completes"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Start OAuth account linking flow.

    This endpoint requires authentication and will initiate an OAuth flow
    to link a new provider to the current user's account.

    Args:
        provider: OAuth provider to link (google, github)
        redirect_uri: Frontend callback URL
        current_user: Current authenticated user
        db: Database session

    Returns:
        dict with authorization_url and state
    """
    if not settings.OAUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth is not enabled",
        )

    # Check if user already has this provider linked
    existing = await oauth_account.get_user_account_by_provider(
        db, user_id=current_user.id, provider=provider
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have a {provider} account linked",
        )

    try:
        url, state = await OAuthService.create_authorization_url(
            db,
            provider=provider,
            redirect_uri=redirect_uri,
            user_id=str(current_user.id),
        )

        return {
            "authorization_url": url,
            "state": state,
        }

    except AuthError as e:
        logger.warning(f"OAuth link authorization failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"OAuth link error: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create authorization URL",
        )
