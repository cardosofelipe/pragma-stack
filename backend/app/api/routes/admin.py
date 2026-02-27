# app/api/routes/admin.py
"""
Admin-specific endpoints for managing users and organizations.

These endpoints require superuser privileges and provide CMS-like functionality
for managing the application.
"""

import logging
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.permissions import require_superuser
from app.core.database import get_db
from app.core.exceptions import (
    AuthorizationError,
    DuplicateError,
    ErrorCode,
    NotFoundError,
)
from app.core.repository_exceptions import DuplicateEntryError
from app.models.user import User
from app.models.user_organization import OrganizationRole
from app.services.organization_service import organization_service
from app.services.session_service import session_service
from app.services.user_service import user_service
from app.schemas.common import (
    MessageResponse,
    PaginatedResponse,
    PaginationParams,
    SortParams,
    create_pagination_meta,
)
from app.schemas.organizations import (
    OrganizationCreate,
    OrganizationMemberResponse,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.schemas.sessions import AdminSessionResponse
from app.schemas.users import UserCreate, UserResponse, UserUpdate

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
    user_ids: list[UUID] = Field(
        ..., min_items=1, max_items=100, description="List of user IDs (max 100)"
    )


class BulkActionResult(BaseModel):
    """Result of a bulk action."""

    success: bool
    affected_count: int
    failed_count: int
    message: str
    failed_ids: list[UUID] | None = []


# ===== User Management Endpoints =====


class UserGrowthData(BaseModel):
    date: str
    total_users: int
    active_users: int


class OrgDistributionData(BaseModel):
    name: str
    value: int


class RegistrationActivityData(BaseModel):
    date: str
    registrations: int


class UserStatusData(BaseModel):
    name: str
    value: int


class AdminStatsResponse(BaseModel):
    user_growth: list[UserGrowthData]
    organization_distribution: list[OrgDistributionData]
    registration_activity: list[RegistrationActivityData]
    user_status: list[UserStatusData]


def _generate_demo_stats() -> AdminStatsResponse:  # pragma: no cover
    """Generate demo statistics for empty databases."""
    from random import randint

    # Demo user growth (last 30 days)
    user_growth = []
    total = 10
    for i in range(29, -1, -1):
        date = datetime.now(UTC) - timedelta(days=i)
        total += randint(0, 3)  # noqa: S311
        user_growth.append(
            UserGrowthData(
                date=date.strftime("%b %d"),
                total_users=total,
                active_users=int(total * 0.85),
            )
        )

    # Demo organization distribution
    org_dist = [
        OrgDistributionData(name="Engineering", value=12),
        OrgDistributionData(name="Product", value=8),
        OrgDistributionData(name="Sales", value=15),
        OrgDistributionData(name="Marketing", value=6),
        OrgDistributionData(name="Support", value=5),
        OrgDistributionData(name="Operations", value=4),
    ]

    # Demo registration activity (last 14 days)
    registration_activity = []
    for i in range(13, -1, -1):
        date = datetime.now(UTC) - timedelta(days=i)
        registration_activity.append(
            RegistrationActivityData(
                date=date.strftime("%b %d"),
                registrations=randint(0, 5),  # noqa: S311
            )
        )

    # Demo user status
    user_status = [
        UserStatusData(name="Active", value=45),
        UserStatusData(name="Inactive", value=5),
    ]

    return AdminStatsResponse(
        user_growth=user_growth,
        organization_distribution=org_dist,
        registration_activity=registration_activity,
        user_status=user_status,
    )


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Admin: Get Dashboard Stats",
    description="Get aggregated statistics for the admin dashboard (admin only)",
    operation_id="admin_get_stats",
)
async def admin_get_stats(
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Get admin dashboard statistics with real data from database."""
    from app.core.config import settings

    stats = await user_service.get_stats(db)
    total_users = stats["total_users"]
    active_count = stats["active_count"]
    inactive_count = stats["inactive_count"]
    all_users = stats["all_users"]

    # If database is essentially empty (only admin user), return demo data
    if total_users <= 1 and settings.DEMO_MODE:  # pragma: no cover
        logger.info("Returning demo stats data (empty database in demo mode)")
        return _generate_demo_stats()

    # 1. User Growth (Last 30 days)
    user_growth = []
    for i in range(29, -1, -1):
        date = datetime.now(UTC) - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC)
        date_end = date_start + timedelta(days=1)

        total_users_on_date = sum(
            1
            for u in all_users
            if u.created_at and u.created_at.replace(tzinfo=UTC) < date_end
        )
        active_users_on_date = sum(
            1
            for u in all_users
            if u.created_at
            and u.created_at.replace(tzinfo=UTC) < date_end
            and u.is_active
        )

        user_growth.append(
            UserGrowthData(
                date=date.strftime("%b %d"),
                total_users=total_users_on_date,
                active_users=active_users_on_date,
            )
        )

    # 2. Organization Distribution - Top 6 organizations by member count
    org_rows = await organization_service.get_org_distribution(db, limit=6)
    org_dist = [OrgDistributionData(name=r["name"], value=r["value"]) for r in org_rows]

    # 3. User Registration Activity (Last 14 days)
    registration_activity = []
    for i in range(13, -1, -1):
        date = datetime.now(UTC) - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC)
        date_end = date_start + timedelta(days=1)

        day_registrations = sum(
            1
            for u in all_users
            if u.created_at
            and date_start <= u.created_at.replace(tzinfo=UTC) < date_end
        )

        registration_activity.append(
            RegistrationActivityData(
                date=date.strftime("%b %d"),
                registrations=day_registrations,
            )
        )

    # 4. User Status - Active vs Inactive
    logger.info(
        f"User status counts - Active: {active_count}, Inactive: {inactive_count}"
    )

    user_status = [
        UserStatusData(name="Active", value=active_count),
        UserStatusData(name="Inactive", value=inactive_count),
    ]

    return AdminStatsResponse(
        user_growth=user_growth,
        organization_distribution=org_dist,
        registration_activity=registration_activity,
        user_status=user_status,
    )


# ===== User Management Endpoints =====


@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
    summary="Admin: List All Users",
    description="Get paginated list of all users with filtering and search (admin only)",
    operation_id="admin_list_users",
)
async def admin_list_users(
    pagination: PaginationParams = Depends(),
    sort: SortParams = Depends(),
    is_active: bool | None = Query(None, description="Filter by active status"),
    is_superuser: bool | None = Query(None, description="Filter by superuser status"),
    search: str | None = Query(None, description="Search by email, name"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
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
        users, total = await user_service.list_users(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            sort_by=sort.sort_by or "created_at",
            sort_order=sort.sort_order.value if sort.sort_order else "desc",
            filters=filters if filters else None,
            search=search,
        )

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(users),
        )

        return PaginatedResponse(data=users, pagination=pagination_meta)

    except Exception as e:
        logger.error(f"Error listing users (admin): {e!s}", exc_info=True)
        raise


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create User",
    description="Create a new user (admin only)",
    operation_id="admin_create_user",
)
async def admin_create_user(
    user_in: UserCreate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Create a new user with admin privileges.

    Allows setting is_superuser and other fields.
    """
    try:
        user = await user_service.create_user(db, user_in)
        logger.info(f"Admin {admin.email} created user {user.email}")
        return user
    except DuplicateEntryError as e:
        logger.warning(f"Failed to create user: {e!s}")
        raise DuplicateError(message=str(e), error_code=ErrorCode.USER_ALREADY_EXISTS)
    except Exception as e:
        logger.error(f"Error creating user (admin): {e!s}", exc_info=True)
        raise


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Admin: Get User Details",
    description="Get detailed user information (admin only)",
    operation_id="admin_get_user",
)
async def admin_get_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Get detailed information about a specific user."""
    user = await user_service.get_user(db, str(user_id))
    return user


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Admin: Update User",
    description="Update user information (admin only)",
    operation_id="admin_update_user",
)
async def admin_update_user(
    user_id: UUID,
    user_in: UserUpdate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update user information with admin privileges."""
    try:
        user = await user_service.get_user(db, str(user_id))
        updated_user = await user_service.update_user(db, user=user, obj_in=user_in)
        logger.info(f"Admin {admin.email} updated user {updated_user.email}")
        return updated_user

    except Exception as e:
        logger.error(f"Error updating user (admin): {e!s}", exc_info=True)
        raise


@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    summary="Admin: Delete User",
    description="Soft delete a user (admin only)",
    operation_id="admin_delete_user",
)
async def admin_delete_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Soft delete a user (sets deleted_at timestamp)."""
    try:
        user = await user_service.get_user(db, str(user_id))

        # Prevent deleting yourself
        if user.id == admin.id:
            # Use AuthorizationError for permission/operation restrictions
            raise AuthorizationError(
                message="Cannot delete your own account",
                error_code=ErrorCode.OPERATION_FORBIDDEN,
            )

        await user_service.soft_delete_user(db, str(user_id))
        logger.info(f"Admin {admin.email} deleted user {user.email}")

        return MessageResponse(
            success=True, message=f"User {user.email} has been deleted"
        )

    except Exception as e:
        logger.error(f"Error deleting user (admin): {e!s}", exc_info=True)
        raise


@router.post(
    "/users/{user_id}/activate",
    response_model=MessageResponse,
    summary="Admin: Activate User",
    description="Activate a user account (admin only)",
    operation_id="admin_activate_user",
)
async def admin_activate_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Activate a user account."""
    try:
        user = await user_service.get_user(db, str(user_id))
        await user_service.update_user(db, user=user, obj_in={"is_active": True})
        logger.info(f"Admin {admin.email} activated user {user.email}")

        return MessageResponse(
            success=True, message=f"User {user.email} has been activated"
        )

    except Exception as e:
        logger.error(f"Error activating user (admin): {e!s}", exc_info=True)
        raise


@router.post(
    "/users/{user_id}/deactivate",
    response_model=MessageResponse,
    summary="Admin: Deactivate User",
    description="Deactivate a user account (admin only)",
    operation_id="admin_deactivate_user",
)
async def admin_deactivate_user(
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Deactivate a user account."""
    try:
        user = await user_service.get_user(db, str(user_id))

        # Prevent deactivating yourself
        if user.id == admin.id:
            # Use AuthorizationError for permission/operation restrictions
            raise AuthorizationError(
                message="Cannot deactivate your own account",
                error_code=ErrorCode.OPERATION_FORBIDDEN,
            )

        await user_service.update_user(db, user=user, obj_in={"is_active": False})
        logger.info(f"Admin {admin.email} deactivated user {user.email}")

        return MessageResponse(
            success=True, message=f"User {user.email} has been deactivated"
        )

    except Exception as e:
        logger.error(f"Error deactivating user (admin): {e!s}", exc_info=True)
        raise


@router.post(
    "/users/bulk-action",
    response_model=BulkActionResult,
    summary="Admin: Bulk User Action",
    description="Perform bulk actions on multiple users (admin only)",
    operation_id="admin_bulk_user_action",
)
async def admin_bulk_user_action(
    bulk_action: BulkUserAction,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Perform bulk actions on multiple users using optimized bulk operations.

    Uses single UPDATE query instead of N individual queries for efficiency.
    Supported actions: activate, deactivate, delete
    """
    try:
        # Use efficient bulk operations instead of loop
        if bulk_action.action == BulkAction.ACTIVATE:
            affected_count = await user_service.bulk_update_status(
                db, user_ids=bulk_action.user_ids, is_active=True
            )
        elif bulk_action.action == BulkAction.DEACTIVATE:
            affected_count = await user_service.bulk_update_status(
                db, user_ids=bulk_action.user_ids, is_active=False
            )
        elif bulk_action.action == BulkAction.DELETE:
            # bulk_soft_delete automatically excludes the admin user
            affected_count = await user_service.bulk_soft_delete(
                db, user_ids=bulk_action.user_ids, exclude_user_id=admin.id
            )
        else:  # pragma: no cover
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
            failed_ids=None,  # Bulk operations don't track individual failures
        )

    except Exception as e:  # pragma: no cover
        logger.error(f"Error in bulk user action: {e!s}", exc_info=True)
        raise


# ===== Organization Management Endpoints =====


@router.get(
    "/organizations",
    response_model=PaginatedResponse[OrganizationResponse],
    summary="Admin: List Organizations",
    description="Get paginated list of all organizations (admin only)",
    operation_id="admin_list_organizations",
)
async def admin_list_organizations(
    pagination: PaginationParams = Depends(),
    is_active: bool | None = Query(None, description="Filter by active status"),
    search: str | None = Query(None, description="Search by name, slug, description"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all organizations with filtering and search."""
    try:
        # Use optimized method that gets member counts in single query (no N+1)
        orgs_with_data, total = await organization_service.get_multi_with_member_counts(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            is_active=is_active,
            search=search,
        )

        # Build response objects from optimized query results
        orgs_with_count = []
        for item in orgs_with_data:
            org = item["organization"]
            member_count = item["member_count"]

            org_dict = {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "is_active": org.is_active,
                "settings": org.settings,
                "created_at": org.created_at,
                "updated_at": org.updated_at,
                "member_count": member_count,
            }
            orgs_with_count.append(OrganizationResponse(**org_dict))

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(orgs_with_count),
        )

        return PaginatedResponse(data=orgs_with_count, pagination=pagination_meta)

    except Exception as e:
        logger.error(f"Error listing organizations (admin): {e!s}", exc_info=True)
        raise


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create Organization",
    description="Create a new organization (admin only)",
    operation_id="admin_create_organization",
)
async def admin_create_organization(
    org_in: OrganizationCreate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create a new organization."""
    try:
        org = await organization_service.create_organization(db, obj_in=org_in)
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
            "member_count": 0,
        }
        return OrganizationResponse(**org_dict)

    except DuplicateEntryError as e:
        logger.warning(f"Failed to create organization: {e!s}")
        raise DuplicateError(message=str(e), error_code=ErrorCode.ALREADY_EXISTS)
    except Exception as e:
        logger.error(f"Error creating organization (admin): {e!s}", exc_info=True)
        raise


@router.get(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Admin: Get Organization Details",
    description="Get detailed organization information (admin only)",
    operation_id="admin_get_organization",
)
async def admin_get_organization(
    org_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Get detailed information about a specific organization."""
    org = await organization_service.get_organization(db, str(org_id))
    org_dict = {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "is_active": org.is_active,
        "settings": org.settings,
        "created_at": org.created_at,
        "updated_at": org.updated_at,
        "member_count": await organization_service.get_member_count(
            db, organization_id=org.id
        ),
    }
    return OrganizationResponse(**org_dict)


@router.put(
    "/organizations/{org_id}",
    response_model=OrganizationResponse,
    summary="Admin: Update Organization",
    description="Update organization information (admin only)",
    operation_id="admin_update_organization",
)
async def admin_update_organization(
    org_id: UUID,
    org_in: OrganizationUpdate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update organization information."""
    try:
        org = await organization_service.get_organization(db, str(org_id))
        updated_org = await organization_service.update_organization(
            db, org=org, obj_in=org_in
        )
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
            "member_count": await organization_service.get_member_count(
                db, organization_id=updated_org.id
            ),
        }
        return OrganizationResponse(**org_dict)

    except Exception as e:
        logger.error(f"Error updating organization (admin): {e!s}", exc_info=True)
        raise


@router.delete(
    "/organizations/{org_id}",
    response_model=MessageResponse,
    summary="Admin: Delete Organization",
    description="Delete an organization (admin only)",
    operation_id="admin_delete_organization",
)
async def admin_delete_organization(
    org_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Delete an organization and all its relationships."""
    try:
        org = await organization_service.get_organization(db, str(org_id))
        await organization_service.remove_organization(db, str(org_id))
        logger.info(f"Admin {admin.email} deleted organization {org.name}")

        return MessageResponse(
            success=True, message=f"Organization {org.name} has been deleted"
        )

    except Exception as e:
        logger.error(f"Error deleting organization (admin): {e!s}", exc_info=True)
        raise


@router.get(
    "/organizations/{org_id}/members",
    response_model=PaginatedResponse[OrganizationMemberResponse],
    summary="Admin: List Organization Members",
    description="Get all members of an organization (admin only)",
    operation_id="admin_list_organization_members",
)
async def admin_list_organization_members(
    org_id: UUID,
    pagination: PaginationParams = Depends(),
    is_active: bool | None = Query(True, description="Filter by active status"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all members of an organization."""
    try:
        await organization_service.get_organization(db, str(org_id))  # validates exists
        members, total = await organization_service.get_organization_members(
            db,
            organization_id=org_id,
            skip=pagination.offset,
            limit=pagination.limit,
            is_active=is_active,
        )

        # Convert to response models
        member_responses = [OrganizationMemberResponse(**member) for member in members]

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(member_responses),
        )

        return PaginatedResponse(data=member_responses, pagination=pagination_meta)

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(
            f"Error listing organization members (admin): {e!s}", exc_info=True
        )
        raise


class AddMemberRequest(BaseModel):
    """Request to add a member to an organization."""

    user_id: UUID = Field(..., description="User ID to add")
    role: OrganizationRole = Field(
        OrganizationRole.MEMBER, description="Role in organization"
    )


@router.post(
    "/organizations/{org_id}/members",
    response_model=MessageResponse,
    summary="Admin: Add Member to Organization",
    description="Add a user to an organization (admin only)",
    operation_id="admin_add_organization_member",
)
async def admin_add_organization_member(
    org_id: UUID,
    request: AddMemberRequest,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Add a user to an organization."""
    try:
        org = await organization_service.get_organization(db, str(org_id))
        user = await user_service.get_user(db, str(request.user_id))

        await organization_service.add_member(
            db, organization_id=org_id, user_id=request.user_id, role=request.role
        )

        logger.info(
            f"Admin {admin.email} added user {user.email} to organization {org.name} "
            f"with role {request.role.value}"
        )

        return MessageResponse(
            success=True, message=f"User {user.email} added to organization {org.name}"
        )

    except DuplicateEntryError as e:
        logger.warning(f"Failed to add user to organization: {e!s}")
        raise DuplicateError(
            message=str(e), error_code=ErrorCode.USER_ALREADY_EXISTS, field="user_id"
        )
    except Exception as e:
        logger.error(
            f"Error adding member to organization (admin): {e!s}", exc_info=True
        )
        raise


@router.delete(
    "/organizations/{org_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Admin: Remove Member from Organization",
    description="Remove a user from an organization (admin only)",
    operation_id="admin_remove_organization_member",
)
async def admin_remove_organization_member(
    org_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Remove a user from an organization."""
    try:
        org = await organization_service.get_organization(db, str(org_id))
        user = await user_service.get_user(db, str(user_id))

        success = await organization_service.remove_member(
            db, organization_id=org_id, user_id=user_id
        )

        if not success:
            raise NotFoundError(
                message="User is not a member of this organization",
                error_code=ErrorCode.NOT_FOUND,
            )

        logger.info(
            f"Admin {admin.email} removed user {user.email} from organization {org.name}"
        )

        return MessageResponse(
            success=True,
            message=f"User {user.email} removed from organization {org.name}",
        )

    except NotFoundError:
        raise
    except Exception as e:  # pragma: no cover
        logger.error(
            f"Error removing member from organization (admin): {e!s}", exc_info=True
        )
        raise


# ============================================================================
# Session Management Endpoints
# ============================================================================


@router.get(
    "/sessions",
    response_model=PaginatedResponse[AdminSessionResponse],
    summary="Admin: List All Sessions",
    description="""
    List all sessions across all users (admin only).

    Returns paginated list of sessions with user information.
    Useful for admin dashboard statistics and session monitoring.
    """,
    operation_id="admin_list_sessions",
)
async def admin_list_sessions(
    pagination: PaginationParams = Depends(),
    is_active: bool | None = Query(None, description="Filter by active status"),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all sessions across all users with filtering and pagination."""
    try:
        # Get sessions with user info (eager loaded to prevent N+1)
        sessions, total = await session_service.get_all_sessions(
            db,
            skip=pagination.offset,
            limit=pagination.limit,
            active_only=is_active if is_active is not None else True,
            with_user=True,
        )

        # Build response objects with user information
        session_responses = []
        for session in sessions:
            # Get user full name
            user_full_name = None
            if session.user.first_name or session.user.last_name:
                parts = []
                if session.user.first_name:
                    parts.append(session.user.first_name)
                if session.user.last_name:
                    parts.append(session.user.last_name)
                user_full_name = " ".join(parts)

            session_response = AdminSessionResponse(
                id=session.id,
                user_id=session.user_id,
                user_email=session.user.email,
                user_full_name=user_full_name,
                device_name=session.device_name,
                device_id=session.device_id,
                ip_address=session.ip_address,
                location_city=session.location_city,
                location_country=session.location_country,
                last_used_at=session.last_used_at,
                created_at=session.created_at,
                expires_at=session.expires_at,
                is_active=session.is_active,
            )
            session_responses.append(session_response)

        logger.info(
            f"Admin {admin.email} listed {len(session_responses)} sessions (total: {total})"
        )

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(session_responses),
        )

        return PaginatedResponse(data=session_responses, pagination=pagination_meta)

    except Exception as e:  # pragma: no cover
        logger.error(f"Error listing sessions (admin): {e!s}", exc_info=True)
        raise
