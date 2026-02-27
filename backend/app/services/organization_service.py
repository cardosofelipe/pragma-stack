# app/services/organization_service.py
"""Service layer for organization operations — delegates to OrganizationRepository."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.organization import Organization
from app.models.user_organization import OrganizationRole, UserOrganization
from app.repositories.organization import OrganizationRepository, organization_repo
from app.schemas.organizations import OrganizationCreate, OrganizationUpdate

logger = logging.getLogger(__name__)


class OrganizationService:
    """Service for organization management operations."""

    def __init__(
        self, organization_repository: OrganizationRepository | None = None
    ) -> None:
        self._repo = organization_repository or organization_repo

    async def get_organization(self, db: AsyncSession, org_id: str) -> Organization:
        """Get organization by ID, raising NotFoundError if not found."""
        org = await self._repo.get(db, id=org_id)
        if not org:
            raise NotFoundError(f"Organization {org_id} not found")
        return org

    async def create_organization(
        self, db: AsyncSession, *, obj_in: OrganizationCreate
    ) -> Organization:
        """Create a new organization."""
        return await self._repo.create(db, obj_in=obj_in)

    async def update_organization(
        self,
        db: AsyncSession,
        *,
        org: Organization,
        obj_in: OrganizationUpdate | dict[str, Any],
    ) -> Organization:
        """Update an existing organization."""
        return await self._repo.update(db, db_obj=org, obj_in=obj_in)

    async def remove_organization(self, db: AsyncSession, org_id: str) -> None:
        """Permanently delete an organization by ID."""
        await self._repo.remove(db, id=org_id)

    async def get_member_count(
        self, db: AsyncSession, *, organization_id: UUID
    ) -> int:
        """Get number of active members in an organization."""
        return await self._repo.get_member_count(db, organization_id=organization_id)

    async def get_multi_with_member_counts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """List organizations with member counts and pagination."""
        return await self._repo.get_multi_with_member_counts(
            db, skip=skip, limit=limit, is_active=is_active, search=search
        )

    async def get_user_organizations_with_details(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        is_active: bool | None = None,
    ) -> list[dict[str, Any]]:
        """Get all organizations a user belongs to, with membership details."""
        return await self._repo.get_user_organizations_with_details(
            db, user_id=user_id, is_active=is_active
        )

    async def get_organization_members(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = True,
    ) -> tuple[list[dict[str, Any]], int]:
        """Get members of an organization with pagination."""
        return await self._repo.get_organization_members(
            db,
            organization_id=organization_id,
            skip=skip,
            limit=limit,
            is_active=is_active,
        )

    async def add_member(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole = OrganizationRole.MEMBER,
    ) -> UserOrganization:
        """Add a user to an organization."""
        return await self._repo.add_user(
            db, organization_id=organization_id, user_id=user_id, role=role
        )

    async def remove_member(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Remove a user from an organization. Returns True if found and removed."""
        return await self._repo.remove_user(
            db, organization_id=organization_id, user_id=user_id
        )

    async def get_user_role_in_org(
        self, db: AsyncSession, *, user_id: UUID, organization_id: UUID
    ) -> OrganizationRole | None:
        """Get the role of a user in an organization."""
        return await self._repo.get_user_role_in_org(
            db, user_id=user_id, organization_id=organization_id
        )

    async def get_org_distribution(
        self, db: AsyncSession, *, limit: int = 6
    ) -> list[dict[str, Any]]:
        """Return top organizations by member count for admin dashboard."""
        from sqlalchemy import func, select

        result = await db.execute(
            select(
                Organization.name,
                func.count(UserOrganization.user_id).label("count"),
            )
            .join(UserOrganization, Organization.id == UserOrganization.organization_id)
            .group_by(Organization.name)
            .order_by(func.count(UserOrganization.user_id).desc())
            .limit(limit)
        )
        return [{"name": row.name, "value": row.count} for row in result.all()]


# Default singleton
organization_service = OrganizationService()
