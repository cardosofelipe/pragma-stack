# app/api/routes/organizations.py
"""
Organization endpoints for regular users.

These endpoints allow users to view and manage organizations they belong to.
"""
import logging
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.permissions import require_org_admin, require_org_membership
from app.core.database import get_db
from app.core.exceptions import NotFoundError, ErrorCode
from app.crud.organization import organization as organization_crud
from app.models.user import User
from app.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    create_pagination_meta
)
from app.schemas.organizations import (
    OrganizationResponse,
    OrganizationMemberResponse,
    OrganizationUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/me",
    response_model=List[OrganizationResponse],
    summary="Get My Organizations",
    description="Get all organizations the current user belongs to",
    operation_id="get_my_organizations"
)
async def get_my_organizations(
    is_active: bool = Query(True, description="Filter by active membership"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get all organizations the current user belongs to.

    Returns organizations with member count for each.
    Uses optimized single query to avoid N+1 problem.
    """
    try:
        # Get all org data in single query with JOIN and subquery
        orgs_data = await organization_crud.get_user_organizations_with_details(
            db,
            user_id=current_user.id,
            is_active=is_active
        )

        # Transform to response objects
        orgs_with_data = []
        for item in orgs_data:
            org = item['organization']
            org_dict = {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "is_active": org.is_active,
                "settings": org.settings,
                "created_at": org.created_at,
                "updated_at": org.updated_at,
                "member_count": item['member_count']
            }
            orgs_with_data.append(OrganizationResponse(**org_dict))

        return orgs_with_data

    except Exception as e:
        logger.error(f"Error getting user organizations: {str(e)}", exc_info=True)
        raise


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
    summary="Get Organization Details",
    description="Get details of an organization the user belongs to",
    operation_id="get_organization"
)
async def get_organization(
    organization_id: UUID,
    current_user: User = Depends(require_org_membership),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get details of a specific organization.

    User must be a member of the organization.
    """
    try:
        org = await organization_crud.get(db, id=organization_id)
        if not org:  # pragma: no cover - Permission check prevents this (see docs/UNREACHABLE_DEFENSIVE_CODE_ANALYSIS.md)
            raise NotFoundError(
                detail=f"Organization {organization_id} not found",
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

    except NotFoundError:  # pragma: no cover - See above
        raise
    except Exception as e:
        logger.error(f"Error getting organization: {str(e)}", exc_info=True)
        raise


@router.get(
    "/{organization_id}/members",
    response_model=PaginatedResponse[OrganizationMemberResponse],
    summary="Get Organization Members",
    description="Get all members of an organization (members can view)",
    operation_id="get_organization_members"
)
async def get_organization_members(
    organization_id: UUID,
    pagination: PaginationParams = Depends(),
    is_active: bool = Query(True, description="Filter by active status"),
    current_user: User = Depends(require_org_membership),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get all members of an organization.

    User must be a member of the organization to view members.
    """
    try:
        members, total = await organization_crud.get_organization_members(
            db,
            organization_id=organization_id,
            skip=pagination.offset,
            limit=pagination.limit,
            is_active=is_active
        )

        member_responses = [OrganizationMemberResponse(**member) for member in members]

        pagination_meta = create_pagination_meta(
            total=total,
            page=pagination.page,
            limit=pagination.limit,
            items_count=len(member_responses)
        )

        return PaginatedResponse(data=member_responses, pagination=pagination_meta)

    except Exception as e:
        logger.error(f"Error getting organization members: {str(e)}", exc_info=True)
        raise


@router.put(
    "/{organization_id}",
    response_model=OrganizationResponse,
    summary="Update Organization",
    description="Update organization details (admin/owner only)",
    operation_id="update_organization"
)
async def update_organization(
    organization_id: UUID,
    org_in: OrganizationUpdate,
    current_user: User = Depends(require_org_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update organization details.

    Requires owner or admin role in the organization.
    """
    try:
        org = await organization_crud.get(db, id=organization_id)
        if not org:  # pragma: no cover - Permission check prevents this (see docs/UNREACHABLE_DEFENSIVE_CODE_ANALYSIS.md)
            raise NotFoundError(
                detail=f"Organization {organization_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        updated_org = await organization_crud.update(db, db_obj=org, obj_in=org_in)
        logger.info(f"User {current_user.email} updated organization {updated_org.name}")

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

    except NotFoundError:  # pragma: no cover - See above
        raise
    except Exception as e:
        logger.error(f"Error updating organization: {str(e)}", exc_info=True)
        raise
