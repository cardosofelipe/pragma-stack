# app/crud/organization_async.py
"""Async CRUD operations for Organization model using SQLAlchemy 2.0 patterns."""
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy import func, or_, and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base_async import CRUDBaseAsync
from app.models.organization import Organization
from app.models.user import User
from app.models.user_organization import UserOrganization, OrganizationRole
from app.schemas.organizations import (
    OrganizationCreate,
    OrganizationUpdate,
)

logger = logging.getLogger(__name__)


class CRUDOrganizationAsync(CRUDBaseAsync[Organization, OrganizationCreate, OrganizationUpdate]):
    """Async CRUD operations for Organization model."""

    async def get_by_slug(self, db: AsyncSession, *, slug: str) -> Optional[Organization]:
        """Get organization by slug."""
        try:
            result = await db.execute(
                select(Organization).where(Organization.slug == slug)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting organization by slug {slug}: {str(e)}")
            raise

    async def create(self, db: AsyncSession, *, obj_in: OrganizationCreate) -> Organization:
        """Create a new organization with error handling."""
        try:
            db_obj = Organization(
                name=obj_in.name,
                slug=obj_in.slug,
                description=obj_in.description,
                is_active=obj_in.is_active,
                settings=obj_in.settings or {}
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "slug" in error_msg.lower():
                logger.warning(f"Duplicate slug attempted: {obj_in.slug}")
                raise ValueError(f"Organization with slug '{obj_in.slug}' already exists")
            logger.error(f"Integrity error creating organization: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating organization: {str(e)}", exc_info=True)
            raise

    async def get_multi_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[List[Organization], int]:
        """
        Get multiple organizations with filtering, searching, and sorting.

        Returns:
            Tuple of (organizations list, total count)
        """
        try:
            query = select(Organization)

            # Apply filters
            if is_active is not None:
                query = query.where(Organization.is_active == is_active)

            if search:
                search_filter = or_(
                    Organization.name.ilike(f"%{search}%"),
                    Organization.slug.ilike(f"%{search}%"),
                    Organization.description.ilike(f"%{search}%")
                )
                query = query.where(search_filter)

            # Get total count before pagination
            count_query = select(func.count()).select_from(query.alias())
            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            # Apply sorting
            sort_column = getattr(Organization, sort_by, Organization.created_at)
            if sort_order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

            # Apply pagination
            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            organizations = list(result.scalars().all())

            return organizations, total
        except Exception as e:
            logger.error(f"Error getting organizations with filters: {str(e)}")
            raise

    async def get_member_count(self, db: AsyncSession, *, organization_id: UUID) -> int:
        """Get the count of active members in an organization."""
        try:
            result = await db.execute(
                select(func.count(UserOrganization.user_id)).where(
                    and_(
                        UserOrganization.organization_id == organization_id,
                        UserOrganization.is_active == True
                    )
                )
            )
            return result.scalar_one() or 0
        except Exception as e:
            logger.error(f"Error getting member count for organization {organization_id}: {str(e)}")
            raise

    async def get_multi_with_member_counts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Get organizations with member counts in a SINGLE QUERY using JOIN and GROUP BY.
        This eliminates the N+1 query problem.

        Returns:
            Tuple of (list of dicts with org and member_count, total count)
        """
        try:
            # Build base query with LEFT JOIN and GROUP BY
            query = (
                select(
                    Organization,
                    func.count(
                        func.distinct(
                            and_(
                                UserOrganization.is_active == True,
                                UserOrganization.user_id
                            ).self_group()
                        )
                    ).label('member_count')
                )
                .outerjoin(UserOrganization, Organization.id == UserOrganization.organization_id)
                .group_by(Organization.id)
            )

            # Apply filters
            if is_active is not None:
                query = query.where(Organization.is_active == is_active)

            if search:
                search_filter = or_(
                    Organization.name.ilike(f"%{search}%"),
                    Organization.slug.ilike(f"%{search}%"),
                    Organization.description.ilike(f"%{search}%")
                )
                query = query.where(search_filter)

            # Get total count
            count_query = select(func.count(Organization.id))
            if is_active is not None:
                count_query = count_query.where(Organization.is_active == is_active)
            if search:
                count_query = count_query.where(search_filter)

            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            # Apply pagination and ordering
            query = query.order_by(Organization.created_at.desc()).offset(skip).limit(limit)

            result = await db.execute(query)
            rows = result.all()

            # Convert to list of dicts
            orgs_with_counts = [
                {
                    'organization': org,
                    'member_count': member_count
                }
                for org, member_count in rows
            ]

            return orgs_with_counts, total

        except Exception as e:
            logger.error(f"Error getting organizations with member counts: {str(e)}", exc_info=True)
            raise

    async def add_user(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole = OrganizationRole.MEMBER,
        custom_permissions: Optional[str] = None
    ) -> UserOrganization:
        """Add a user to an organization with a specific role."""
        try:
            # Check if relationship already exists
            result = await db.execute(
                select(UserOrganization).where(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Reactivate if inactive, or raise error if already active
                if not existing.is_active:
                    existing.is_active = True
                    existing.role = role
                    existing.custom_permissions = custom_permissions
                    await db.commit()
                    await db.refresh(existing)
                    return existing
                else:
                    raise ValueError("User is already a member of this organization")

            # Create new relationship
            user_org = UserOrganization(
                user_id=user_id,
                organization_id=organization_id,
                role=role,
                is_active=True,
                custom_permissions=custom_permissions
            )
            db.add(user_org)
            await db.commit()
            await db.refresh(user_org)
            return user_org
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Integrity error adding user to organization: {str(e)}")
            raise ValueError("Failed to add user to organization")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error adding user to organization: {str(e)}", exc_info=True)
            raise

    async def remove_user(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        user_id: UUID
    ) -> bool:
        """Remove a user from an organization (soft delete)."""
        try:
            result = await db.execute(
                select(UserOrganization).where(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id
                    )
                )
            )
            user_org = result.scalar_one_or_none()

            if not user_org:
                return False

            user_org.is_active = False
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"Error removing user from organization: {str(e)}", exc_info=True)
            raise

    async def update_user_role(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole,
        custom_permissions: Optional[str] = None
    ) -> Optional[UserOrganization]:
        """Update a user's role in an organization."""
        try:
            result = await db.execute(
                select(UserOrganization).where(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id
                    )
                )
            )
            user_org = result.scalar_one_or_none()

            if not user_org:
                return None

            user_org.role = role
            if custom_permissions is not None:
                user_org.custom_permissions = custom_permissions
            await db.commit()
            await db.refresh(user_org)
            return user_org
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating user role: {str(e)}", exc_info=True)
            raise

    async def get_organization_members(
        self,
        db: AsyncSession,
        *,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: bool = True
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Get members of an organization with user details.

        Returns:
            Tuple of (members list with user details, total count)
        """
        try:
            # Build query with join
            query = (
                select(UserOrganization, User)
                .join(User, UserOrganization.user_id == User.id)
                .where(UserOrganization.organization_id == organization_id)
            )

            if is_active is not None:
                query = query.where(UserOrganization.is_active == is_active)

            # Get total count
            count_query = select(func.count()).select_from(
                select(UserOrganization)
                .where(UserOrganization.organization_id == organization_id)
                .where(UserOrganization.is_active == is_active if is_active is not None else True)
                .alias()
            )
            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            # Apply ordering and pagination
            query = query.order_by(UserOrganization.created_at.desc()).offset(skip).limit(limit)
            result = await db.execute(query)
            results = result.all()

            members = []
            for user_org, user in results:
                members.append({
                    "user_id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user_org.role,
                    "is_active": user_org.is_active,
                    "joined_at": user_org.created_at
                })

            return members, total
        except Exception as e:
            logger.error(f"Error getting organization members: {str(e)}")
            raise

    async def get_user_organizations(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        is_active: bool = True
    ) -> List[Organization]:
        """Get all organizations a user belongs to."""
        try:
            query = (
                select(Organization)
                .join(UserOrganization, Organization.id == UserOrganization.organization_id)
                .where(UserOrganization.user_id == user_id)
            )

            if is_active is not None:
                query = query.where(UserOrganization.is_active == is_active)

            result = await db.execute(query)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error getting user organizations: {str(e)}")
            raise

    async def get_user_organizations_with_details(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        is_active: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get user's organizations with role and member count in SINGLE QUERY.
        Eliminates N+1 problem by using subquery for member counts.

        Returns:
            List of dicts with organization, role, and member_count
        """
        try:
            # Subquery to get member counts for each organization
            member_count_subq = (
                select(
                    UserOrganization.organization_id,
                    func.count(UserOrganization.user_id).label('member_count')
                )
                .where(UserOrganization.is_active == True)
                .group_by(UserOrganization.organization_id)
                .subquery()
            )

            # Main query with JOIN to get org, role, and member count
            query = (
                select(
                    Organization,
                    UserOrganization.role,
                    func.coalesce(member_count_subq.c.member_count, 0).label('member_count')
                )
                .join(UserOrganization, Organization.id == UserOrganization.organization_id)
                .outerjoin(member_count_subq, Organization.id == member_count_subq.c.organization_id)
                .where(UserOrganization.user_id == user_id)
            )

            if is_active is not None:
                query = query.where(UserOrganization.is_active == is_active)

            result = await db.execute(query)
            rows = result.all()

            return [
                {
                    'organization': org,
                    'role': role,
                    'member_count': member_count
                }
                for org, role, member_count in rows
            ]

        except Exception as e:
            logger.error(f"Error getting user organizations with details: {str(e)}", exc_info=True)
            raise

    async def get_user_role_in_org(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> Optional[OrganizationRole]:
        """Get a user's role in a specific organization."""
        try:
            result = await db.execute(
                select(UserOrganization).where(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                        UserOrganization.is_active == True
                    )
                )
            )
            user_org = result.scalar_one_or_none()

            return user_org.role if user_org else None
        except Exception as e:
            logger.error(f"Error getting user role in org: {str(e)}")
            raise

    async def is_user_org_owner(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> bool:
        """Check if a user is an owner of an organization."""
        role = await self.get_user_role_in_org(db, user_id=user_id, organization_id=organization_id)
        return role == OrganizationRole.OWNER

    async def is_user_org_admin(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> bool:
        """Check if a user is an owner or admin of an organization."""
        role = await self.get_user_role_in_org(db, user_id=user_id, organization_id=organization_id)
        return role in [OrganizationRole.OWNER, OrganizationRole.ADMIN]


# Create a singleton instance for use across the application
organization_async = CRUDOrganizationAsync(Organization)
