"""
Session management endpoints.

Allows users to view and manage their active sessions across devices.
"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.core.auth import decode_token
from app.core.database import get_db
from app.core.exceptions import AuthorizationError, ErrorCode, NotFoundError
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.sessions import SessionListResponse, SessionResponse
from app.services.session_service import session_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)


@router.get(
    "/me",
    response_model=SessionListResponse,
    summary="List My Active Sessions",
    description="""
    Get a list of all active sessions for the current user.

    This shows where you're currently logged in.

    **Rate Limit**: 30 requests/minute
    """,
    operation_id="list_my_sessions",
)
@limiter.limit("30/minute")
async def list_my_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    List all active sessions for the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of active sessions
    """
    try:
        # Get all active sessions for user
        sessions = await session_service.get_user_sessions(
            db, user_id=str(current_user.id), active_only=True
        )

        # Try to identify current session from Authorization header
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                access_token = auth_header.split(" ")[1]
                decode_token(access_token)
                # Note: Access tokens don't have JTI by default, but we can try
                # For now, we'll mark current based on most recent activity
            except Exception as e:
                # Optional token parsing - silently ignore failures
                logger.debug(
                    f"Failed to decode access token for session marking: {e!s}"
                )

        # Convert to response format
        session_responses = []
        for s in sessions:
            session_response = SessionResponse(
                id=s.id,
                device_name=s.device_name,
                device_id=s.device_id,
                ip_address=s.ip_address,
                location_city=s.location_city,
                location_country=s.location_country,
                last_used_at=s.last_used_at,
                created_at=s.created_at,
                expires_at=s.expires_at,
                is_current=(
                    s == sessions[0] if sessions else False
                ),  # Most recent = current
            )
            session_responses.append(session_response)

        logger.info(
            f"User {current_user.id} listed {len(session_responses)} active sessions"
        )

        return SessionListResponse(
            sessions=session_responses, total=len(session_responses)
        )

    except Exception as e:
        logger.error(
            f"Error listing sessions for user {current_user.id}: {e!s}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions",
        )


@router.delete(
    "/{session_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke Specific Session",
    description="""
    Revoke a specific session by ID.

    This logs you out from that particular device.
    You can only revoke your own sessions.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="revoke_session",
)
@limiter.limit("10/minute")
async def revoke_session(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Revoke a specific session by ID.

    Args:
        session_id: UUID of the session to revoke
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        # Get the session
        session = await session_service.get_session(db, str(session_id))

        if not session:
            raise NotFoundError(
                message=f"Session {session_id} not found",
                error_code=ErrorCode.NOT_FOUND,
            )

        # Verify session belongs to current user
        if str(session.user_id) != str(current_user.id):
            logger.warning(
                f"User {current_user.id} attempted to revoke session {session_id} "
                f"belonging to user {session.user_id}"
            )
            raise AuthorizationError(
                message="You can only revoke your own sessions",
                error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
            )

        # Deactivate the session
        await session_service.deactivate(db, session_id=str(session_id))

        logger.info(
            f"User {current_user.id} revoked session {session_id} "
            f"({session.device_name})"
        )

        return MessageResponse(
            success=True,
            message=f"Session revoked: {session.device_name or 'Unknown device'}",
        )

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f"Error revoking session {session_id}: {e!s}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session",
        )


@router.delete(
    "/me/expired",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Cleanup Expired Sessions",
    description="""
    Remove expired sessions for the current user.

    This is a cleanup operation to remove old session records.

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="cleanup_expired_sessions",
)
@limiter.limit("5/minute")
async def cleanup_expired_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Cleanup expired sessions for the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message with count of sessions cleaned
    """
    try:
        # Use optimized bulk DELETE instead of N individual deletes
        deleted_count = await session_service.cleanup_expired_for_user(
            db, user_id=str(current_user.id)
        )

        logger.info(
            f"User {current_user.id} cleaned up {deleted_count} expired sessions"
        )

        return MessageResponse(
            success=True, message=f"Cleaned up {deleted_count} expired sessions"
        )

    except Exception as e:
        logger.error(
            f"Error cleaning up sessions for user {current_user.id}: {e!s}",
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup sessions",
        )
