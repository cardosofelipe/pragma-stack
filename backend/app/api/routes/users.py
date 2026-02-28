"""
User management endpoints for CRUD operations.
"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_superuser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AuthorizationError, ErrorCode
from app.models.user import User
from app.schemas.common import (
    MessageResponse,
    PaginatedResponse,
    PaginationParams,
    SortParams,
    create_pagination_meta,
)
from app.schemas.users import PasswordChange, UserResponse, UserUpdate
from app.services.auth_service import AuthenticationError, AuthService
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List Users",
    description="""
    List all users with pagination, filtering, and sorting (admin only).

    **Authentication**: Required (Bearer token)
    **Authorization**: Superuser only

    **Filtering**: is_active, is_superuser
    **Sorting**: Any user field (email, first_name, last_name, created_at, etc.)

    **Rate Limit**: 60 requests/minute
    """,
    operation_id="list_users",
)
async def list_users(
    pagination: PaginationParams = Depends(),
    sort: SortParams = Depends(),
    is_active: bool | None = Query(None, description="Filter by active status"),
    is_superuser: bool | None = Query(None, description="Filter by superuser status"),
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    List all users with pagination, filtering, and sorting.

    Only accessible by superusers.
    """
    try:
        # Build filters
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        if is_superuser is not None:
            filters["is_superuser"] = is_superuser

        # Get paginated users with total count
        users, total = await user_service.list_users(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            sort_by=sort.sort_by,
            sort_order=sort.sort_order.value if sort.sort_order else "asc",
            filters=filters if filters else None,
        )

        # Create pagination metadata
        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(users),
        )

        return PaginatedResponse(data=users, pagination=pagination_meta)
    except Exception as e:
        logger.error(f"Error listing users: {e!s}", exc_info=True)
        raise


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User",
    description="""
    Get the current authenticated user's profile.

    **Authentication**: Required (Bearer token)

    **Rate Limit**: 60 requests/minute
    """,
    operation_id="get_current_user_profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get current user's profile."""
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update Current User",
    description="""
    Update the current authenticated user's profile.

    Users can update their own profile information (except is_superuser).

    **Authentication**: Required (Bearer token)

    **Rate Limit**: 30 requests/minute
    """,
    operation_id="update_current_user",
)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Update current user's profile.

    Users cannot elevate their own permissions (protected by UserUpdate schema validator).
    """
    try:
        updated_user = await user_service.update_user(
            db, user=current_user, obj_in=user_update
        )
        logger.info(f"User {current_user.id} updated their profile")
        return updated_user
    except ValueError as e:
        logger.error(f"Error updating user {current_user.id}: {e!s}")
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating user {current_user.id}: {e!s}", exc_info=True
        )
        raise


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get User by ID",
    description="""
    Get a specific user by their ID.

    **Authentication**: Required (Bearer token)
    **Authorization**:
    - Regular users: Can only access their own profile
    - Superusers: Can access any profile

    **Rate Limit**: 60 requests/minute
    """,
    operation_id="get_user_by_id",
)
async def get_user_by_id(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get user by ID.

    Users can only view their own profile unless they are superusers.
    """
    # Check permissions
    if str(user_id) != str(current_user.id) and not current_user.is_superuser:
        logger.warning(
            f"User {current_user.id} attempted to access user {user_id} without permission"
        )
        raise AuthorizationError(
            message="Not enough permissions to view this user",
            error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
        )

    # Get user
    user = await user_service.get_user(db, str(user_id))
    return user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update User",
    description="""
    Update a specific user by their ID.

    **Authentication**: Required (Bearer token)
    **Authorization**:
    - Regular users: Can only update their own profile (except is_superuser)
    - Superusers: Can update any profile

    **Rate Limit**: 30 requests/minute
    """,
    operation_id="update_user",
)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Update user by ID.

    Users can update their own profile. Superusers can update any profile.
    Superuser field modification is prevented by UserUpdate schema validator.
    """
    # Check permissions
    is_own_profile = str(user_id) == str(current_user.id)

    if not is_own_profile and not current_user.is_superuser:
        logger.warning(
            f"User {current_user.id} attempted to update user {user_id} without permission"
        )
        raise AuthorizationError(
            message="Not enough permissions to update this user",
            error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
        )

    # Get user
    user = await user_service.get_user(db, str(user_id))

    try:
        updated_user = await user_service.update_user(db, user=user, obj_in=user_update)
        logger.info(f"User {user_id} updated by {current_user.id}")
        return updated_user
    except ValueError as e:
        logger.error(f"Error updating user {user_id}: {e!s}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating user {user_id}: {e!s}", exc_info=True)
        raise


@router.patch(
    "/me/password",
    response_model=MessageResponse,
    summary="Change Current User Password",
    description="""
    Change the current authenticated user's password.

    Requires the current password for verification.

    **Authentication**: Required (Bearer token)

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="change_current_user_password",
)
@limiter.limit("5/minute")
async def change_current_user_password(
    request: Request,
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Change current user's password.

    Requires current password for verification.
    """
    try:
        success = await AuthService.change_password(
            db=db,
            user_id=current_user.id,
            current_password=password_change.current_password,
            new_password=password_change.new_password,
        )

        if success:
            logger.info(f"User {current_user.id} changed their password")
            return MessageResponse(
                success=True, message="Password changed successfully"
            )
    except AuthenticationError as e:
        logger.warning(
            f"Failed password change attempt for user {current_user.id}: {e!s}"
        )
        raise AuthorizationError(
            message=str(e), error_code=ErrorCode.INVALID_CREDENTIALS
        )
    except Exception as e:
        logger.error(f"Error changing password for user {current_user.id}: {e!s}")
        raise


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=MessageResponse,
    summary="Delete User",
    description="""
    Delete a specific user by their ID.

    **Authentication**: Required (Bearer token)
    **Authorization**: Superuser only

    **Rate Limit**: 10 requests/minute

    **Note**: This performs a hard delete. Consider implementing soft deletes for production.
    """,
    operation_id="delete_user",
)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Delete user by ID (superuser only).

    This is a hard delete operation.
    """
    # Prevent self-deletion
    if str(user_id) == str(current_user.id):
        raise AuthorizationError(
            message="Cannot delete your own account",
            error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
        )

    # Get user (raises NotFoundError if not found)
    await user_service.get_user(db, str(user_id))

    try:
        # Use soft delete instead of hard delete
        await user_service.soft_delete_user(db, str(user_id))
        logger.info(f"User {user_id} soft-deleted by {current_user.id}")
        return MessageResponse(
            success=True, message=f"User {user_id} deleted successfully"
        )
    except ValueError as e:
        logger.error(f"Error deleting user {user_id}: {e!s}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting user {user_id}: {e!s}", exc_info=True)
        raise
