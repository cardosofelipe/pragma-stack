# app/api/routes/admin.py
"""
Admin-specific endpoints for managing users and organizations.

These endpoints require superuser privileges and provide CMS-like functionality
for managing the application.
"""
import logging
from enum import Enum
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_superuser
from app.core.database_async import get_async_db
from app.core.exceptions import NotFoundError, DuplicateError, AuthorizationError, ErrorCode
from app.crud.organization_async import organization_async as organization_crud
from app.crud.user_async import user_async as user_crud
from app.models.user import User
from app.models.user_organization import OrganizationRole
from app.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    MessageResponse,
    SortParams,
    create_pagination_meta
)
from app.schemas.organizations import (
    OrganizationResponse,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationMemberResponse
)
from app.schemas.users import UserResponse, UserCreate, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


# Schemas for bulk operations
class BulkAction(str, Enum):
    """Supported bulk actions."""
    ACTIVATE = "activate"
    DEACTIVATE = "deactivate"
    DELETE = "delete"


class BulkUserAction(BaseModel):
    """Schema for bulk user actions."""
    action: BulkAction = Field(..., description="Action to perform on selected users")
    user_ids: List[UUID] = Field(..., min_items=1, max_items=100, description="List of user IDs (max 100)")


class BulkActionResult(BaseModel):
    """Result of a bulk action."""
    success: bool
    affected_count: int
    failed_count: int
    message: str
    failed_ids: Optional[List[UUID]] = []


# ===== User Management Endpoints =====

@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
    summary="Admin: List All Users",
    description="Get paginated list of all users with filtering and search (admin only)",
    operation_id="admin_list_users"
)
async def admin_list_users(
    pagination: PaginationParams = Depends(),
    sort: SortParams = Depends(),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_superuser: Optional[bool] = Query(None, description="Filter by superuser status"),
    search: Optional[str] = Query(None, description="Search by email, name"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """
    List all users with comprehensive filtering and search.

    Requires superuser privileges.
    """
    try:
        # Build filters
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        if is_superuser is not None:
            filters["is_superuser"] = is_superuser

        # Get users with search
        users, total = await user_crud.get_multi_with_total(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            sort_by=sort.sort_by or "created_at",
            sort_order=sort.sort_order.value if sort.sort_order else "desc",
            filters=filters if filters else None,
            search=search
        )

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(users)
        )

        return PaginatedResponse(data=users, pagination=pagination_meta)

    except Exception as e:
        logger.error(f"Error listing users (admin): {str(e)}", exc_info=True)
        raise


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create User",
    description="Create a new user (admin only)",
    operation_id="admin_create_user"
)
async def admin_create_user(
    user_in: UserCreate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """
    Create a new user with admin privileges.

    Allows setting is_superuser and other fields.
    """
    try:
        user = await user_crud.create(db, obj_in=user_in)
        logger.info(f"Admin {admin.email} created user {user.email}")
        return user
    except ValueError as e:
        logger.warning(f"Failed to create user: {str(e)}")
        raise NotFoundError(
            detail=str(e),
            error_code=ErrorCode.USER_ALREADY_EXISTS
        )
    except Exception as e:
        logger.error(f"Error creating user (admin): {str(e)}", exc_info=True)
        raise


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Admin: Get User Details",
    description="Get detailed user information (admin only)",
    operation_id="admin_get_user"
)
async def admin_get_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Get detailed information about a specific user."""
    user = await user_crud.get(db, id=user_id)
    if not user:
        raise NotFoundError(
            detail=f"User {user_id} not found",
            error_code=ErrorCode.USER_NOT_FOUND
        )
    return user


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Admin: Update User",
    description="Update user information (admin only)",
    operation_id="admin_update_user"
)
async def admin_update_user(
    user_id: UUID,
    user_in: UserUpdate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Update user information with admin privileges."""
    try:
        user = await user_crud.get(db, id=user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        updated_user = await user_crud.update(db, db_obj=user, obj_in=user_in)
        logger.info(f"Admin {admin.email} updated user {updated_user.email}")
        return updated_user

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating user (admin): {str(e)}", exc_info=True)
        raise


@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    summary="Admin: Delete User",
    description="Soft delete a user (admin only)",
    operation_id="admin_delete_user"
)
async def admin_delete_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Soft delete a user (sets deleted_at timestamp)."""
    try:
        user = await user_crud.get(db, id=user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        # Prevent deleting yourself
        if user.id == admin.id:
            # Use AuthorizationError for permission/operation restrictions
            raise AuthorizationError(
                message="Cannot delete your own account",
                error_code=ErrorCode.OPERATION_FORBIDDEN
            )

        await user_crud.soft_delete(db, id=user_id)
        logger.info(f"Admin {admin.email} deleted user {user.email}")

        return MessageResponse(
            success=True,
            message=f"User {user.email} has been deleted"
        )

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting user (admin): {str(e)}", exc_info=True)
        raise


@router.post(
    "/users/{user_id}/activate",
    response_model=MessageResponse,
    summary="Admin: Activate User",
    description="Activate a user account (admin only)",
    operation_id="admin_activate_user"
)
async def admin_activate_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Activate a user account."""
    try:
        user = await user_crud.get(db, id=user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        await user_crud.update(db, db_obj=user, obj_in={"is_active": True})
        logger.info(f"Admin {admin.email} activated user {user.email}")

        return MessageResponse(
            success=True,
            message=f"User {user.email} has been activated"
        )

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error activating user (admin): {str(e)}", exc_info=True)
        raise


@router.post(
    "/users/{user_id}/deactivate",
    response_model=MessageResponse,
    summary="Admin: Deactivate User",
    description="Deactivate a user account (admin only)",
    operation_id="admin_deactivate_user"
)
async def admin_deactivate_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Deactivate a user account."""
    try:
        user = await user_crud.get(db, id=user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        # Prevent deactivating yourself
        if user.id == admin.id:
            # Use AuthorizationError for permission/operation restrictions
            raise AuthorizationError(
                message="Cannot deactivate your own account",
                error_code=ErrorCode.OPERATION_FORBIDDEN
            )

        await user_crud.update(db, db_obj=user, obj_in={"is_active": False})
        logger.info(f"Admin {admin.email} deactivated user {user.email}")

        return MessageResponse(
            success=True,
            message=f"User {user.email} has been deactivated"
        )

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deactivating user (admin): {str(e)}", exc_info=True)
        raise


@router.post(
    "/users/bulk-action",
    response_model=BulkActionResult,
    summary="Admin: Bulk User Action",
    description="Perform bulk actions on multiple users (admin only)",
    operation_id="admin_bulk_user_action"
)
async def admin_bulk_user_action(
    bulk_action: BulkUserAction,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """
    Perform bulk actions on multiple users using optimized bulk operations.

    Uses single UPDATE query instead of N individual queries for efficiency.
    Supported actions: activate, deactivate, delete
    """
    try:
        # Use efficient bulk operations instead of loop
        if bulk_action.action == BulkAction.ACTIVATE:
            affected_count = await user_crud.bulk_update_status(
                db,
                user_ids=bulk_action.user_ids,
                is_active=True
            )
        elif bulk_action.action == BulkAction.DEACTIVATE:
            affected_count = await user_crud.bulk_update_status(
                db,
                user_ids=bulk_action.user_ids,
                is_active=False
            )
        elif bulk_action.action == BulkAction.DELETE:
            # bulk_soft_delete automatically excludes the admin user
            affected_count = await user_crud.bulk_soft_delete(
                db,
                user_ids=bulk_action.user_ids,
                exclude_user_id=admin.id
            )
        else:
            raise ValueError(f"Unsupported bulk action: {bulk_action.action}")

        # Calculate failed count (requested - affected)
        requested_count = len(bulk_action.user_ids)
        failed_count = requested_count - affected_count

        logger.info(
            f"Admin {admin.email} performed bulk {bulk_action.action.value} "
            f"on {affected_count} users ({failed_count} skipped/failed)"
        )

        return BulkActionResult(
            success=failed_count == 0,
            affected_count=affected_count,
            failed_count=failed_count,
            message=f"Bulk {bulk_action.action.value}: {affected_count} users affected, {failed_count} skipped",
            failed_ids=None  # Bulk operations don't track individual failures
        )

    except Exception as e:
        logger.error(f"Error in bulk user action: {str(e)}", exc_info=True)
        raise


# ===== Organization Management Endpoints =====

@router.get(
    "/organizations",
    response_model=PaginatedResponse[OrganizationResponse],
    summary="Admin: List Organizations",
    description="Get paginated list of all organizations (admin only)",
    operation_id="admin_list_organizations"
)
async def admin_list_organizations(
    pagination: PaginationParams = Depends(),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name, slug, description"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """List all organizations with filtering and search."""
    try:
        # Use optimized method that gets member counts in single query (no N+1)
        orgs_with_data, total = await organization_crud.get_multi_with_member_counts(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            is_active=is_active,
            search=search
        )

        # Build response objects from optimized query results
        orgs_with_count = []
        for item in orgs_with_data:
            org = item['organization']
            member_count = item['member_count']

            org_dict = {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "is_active": org.is_active,
                "settings": org.settings,
                "created_at": org.created_at,
                "updated_at": org.updated_at,
                "member_count": member_count
            }
            orgs_with_count.append(OrganizationResponse(**org_dict))

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(orgs_with_count)
        )

        return PaginatedResponse(data=orgs_with_count, pagination=pagination_meta)

    except Exception as e:
        logger.error(f"Error listing organizations (admin): {str(e)}", exc_info=True)
        raise


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create Organization",
    description="Create a new organization (admin only)",
    operation_id="admin_create_organization"
)
async def admin_create_organization(
    org_in: OrganizationCreate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Create a new organization."""
    try:
        org = await organization_crud.create(db, obj_in=org_in)
        logger.info(f"Admin {admin.email} created organization {org.name}")

        # Add member count
        org_dict = {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "is_active": org.is_active,
            "settings": org.settings,
            "created_at": org.created_at,
            "updated_at": org.updated_at,
            "member_count": 0
        }
        return OrganizationResponse(**org_dict)

    except ValueError as e:
        logger.warning(f"Failed to create organization: {str(e)}")
        raise NotFoundError(
            detail=str(e),
            error_code=ErrorCode.ALREADY_EXISTS
        )
    except Exception as e:
        logger.error(f"Error creating organization (admin): {str(e)}", exc_info=True)
        raise


@router.get(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Admin: Get Organization Details",
    description="Get detailed organization information (admin only)",
    operation_id="admin_get_organization"
)
async def admin_get_organization(
    org_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Get detailed information about a specific organization."""
    org = await organization_crud.get(db, id=org_id)
    if not org:
        raise NotFoundError(
            detail=f"Organization {org_id} not found",
            error_code=ErrorCode.NOT_FOUND
        )

    org_dict = {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "is_active": org.is_active,
        "settings": org.settings,
        "created_at": org.created_at,
        "updated_at": org.updated_at,
        "member_count": await organization_crud.get_member_count(db, organization_id=org.id)
    }
    return OrganizationResponse(**org_dict)


@router.put(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Admin: Update Organization",
    description="Update organization information (admin only)",
    operation_id="admin_update_organization"
)
async def admin_update_organization(
    org_id: UUID,
    org_in: OrganizationUpdate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Update organization information."""
    try:
        org = await organization_crud.get(db, id=org_id)
        if not org:
            raise NotFoundError(
                detail=f"Organization {org_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        updated_org = await organization_crud.update(db, db_obj=org, obj_in=org_in)
        logger.info(f"Admin {admin.email} updated organization {updated_org.name}")

        org_dict = {
            "id": updated_org.id,
            "name": updated_org.name,
            "slug": updated_org.slug,
            "description": updated_org.description,
            "is_active": updated_org.is_active,
            "settings": updated_org.settings,
            "created_at": updated_org.created_at,
            "updated_at": updated_org.updated_at,
            "member_count": await organization_crud.get_member_count(db, organization_id=updated_org.id)
        }
        return OrganizationResponse(**org_dict)

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating organization (admin): {str(e)}", exc_info=True)
        raise


@router.delete(
    "/organizations/{org_id}",
    response_model=MessageResponse,
    summary="Admin: Delete Organization",
    description="Delete an organization (admin only)",
    operation_id="admin_delete_organization"
)
async def admin_delete_organization(
    org_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Delete an organization and all its relationships."""
    try:
        org = await organization_crud.get(db, id=org_id)
        if not org:
            raise NotFoundError(
                detail=f"Organization {org_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        await organization_crud.remove(db, id=org_id)
        logger.info(f"Admin {admin.email} deleted organization {org.name}")

        return MessageResponse(
            success=True,
            message=f"Organization {org.name} has been deleted"
        )

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting organization (admin): {str(e)}", exc_info=True)
        raise


@router.get(
    "/organizations/{org_id}/members",
    response_model=PaginatedResponse[OrganizationMemberResponse],
    summary="Admin: List Organization Members",
    description="Get all members of an organization (admin only)",
    operation_id="admin_list_organization_members"
)
async def admin_list_organization_members(
    org_id: UUID,
    pagination: PaginationParams = Depends(),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """List all members of an organization."""
    try:
        org = await organization_crud.get(db, id=org_id)
        if not org:
            raise NotFoundError(
                detail=f"Organization {org_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        members, total = await organization_crud.get_organization_members(
            db,
            organization_id=org_id,
            skip=pagination.offset,
            limit=pagination.limit,
            is_active=is_active
        )

        # Convert to response models
        member_responses = [OrganizationMemberResponse(**member) for member in members]

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(member_responses)
        )

        return PaginatedResponse(data=member_responses, pagination=pagination_meta)

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error listing organization members (admin): {str(e)}", exc_info=True)
        raise


class AddMemberRequest(BaseModel):
    """Request to add a member to an organization."""
    user_id: UUID = Field(..., description="User ID to add")
    role: OrganizationRole = Field(OrganizationRole.MEMBER, description="Role in organization")


@router.post(
    "/organizations/{org_id}/members",
    response_model=MessageResponse,
    summary="Admin: Add Member to Organization",
    description="Add a user to an organization (admin only)",
    operation_id="admin_add_organization_member"
)
async def admin_add_organization_member(
    org_id: UUID,
    request: AddMemberRequest,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Add a user to an organization."""
    try:
        org = await organization_crud.get(db, id=org_id)
        if not org:
            raise NotFoundError(
                detail=f"Organization {org_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        user = await user_crud.get(db, id=request.user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {request.user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        await organization_crud.add_user(
            db,
            organization_id=org_id,
            user_id=request.user_id,
            role=request.role
        )

        logger.info(
            f"Admin {admin.email} added user {user.email} to organization {org.name} "
            f"with role {request.role.value}"
        )

        return MessageResponse(
            success=True,
            message=f"User {user.email} added to organization {org.name}"
        )

    except ValueError as e:
        logger.warning(f"Failed to add user to organization: {str(e)}")
        # Use DuplicateError for "already exists" scenarios
        raise DuplicateError(
            message=str(e),
            error_code=ErrorCode.USER_ALREADY_EXISTS,
            field="user_id"
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error adding member to organization (admin): {str(e)}", exc_info=True)
        raise


@router.delete(
    "/organizations/{org_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Admin: Remove Member from Organization",
    description="Remove a user from an organization (admin only)",
    operation_id="admin_remove_organization_member"
)
async def admin_remove_organization_member(
    org_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_async_db)
) -> Any:
    """Remove a user from an organization."""
    try:
        org = await organization_crud.get(db, id=org_id)
        if not org:
            raise NotFoundError(
                detail=f"Organization {org_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        user = await user_crud.get(db, id=user_id)
        if not user:
            raise NotFoundError(
                detail=f"User {user_id} not found",
                error_code=ErrorCode.USER_NOT_FOUND
            )

        success = await organization_crud.remove_user(
            db,
            organization_id=org_id,
            user_id=user_id
        )

        if not success:
            raise NotFoundError(
                detail="User is not a member of this organization",
                error_code=ErrorCode.NOT_FOUND
            )

        logger.info(f"Admin {admin.email} removed user {user.email} from organization {org.name}")

        return MessageResponse(
            success=True,
            message=f"User {user.email} removed from organization {org.name}"
        )

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error removing member from organization (admin): {str(e)}", exc_info=True)
        raise
