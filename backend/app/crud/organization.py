# app/crud/organization.py
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy import func, or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.organization import Organization
from app.models.user import User
from app.models.user_organization import UserOrganization, OrganizationRole
from app.schemas.organizations import (
    OrganizationCreate,
    OrganizationUpdate
)

logger = logging.getLogger(__name__)


class CRUDOrganization(CRUDBase[Organization, OrganizationCreate, OrganizationUpdate]):
    """CRUD operations for Organization model."""

    def get_by_slug(self, db: Session, *, slug: str) -> Optional[Organization]:
        """Get organization by slug."""
        return db.query(Organization).filter(Organization.slug == slug).first()

    def create(self, db: Session, *, obj_in: OrganizationCreate) -> Organization:
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
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "slug" in error_msg.lower():
                logger.warning(f"Duplicate slug attempted: {obj_in.slug}")
                raise ValueError(f"Organization with slug '{obj_in.slug}' already exists")
            logger.error(f"Integrity error creating organization: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating organization: {str(e)}", exc_info=True)
            raise

    def get_multi_with_filters(
        self,
        db: Session,
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
        query = db.query(Organization)

        # Apply filters
        if is_active is not None:
            query = query.filter(Organization.is_active == is_active)

        if search:
            search_filter = or_(
                Organization.name.ilike(f"%{search}%"),
                Organization.slug.ilike(f"%{search}%"),
                Organization.description.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(Organization, sort_by, Organization.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        organizations = query.offset(skip).limit(limit).all()

        return organizations, total

    def get_member_count(self, db: Session, *, organization_id: UUID) -> int:
        """Get the count of active members in an organization."""
        return db.query(func.count(UserOrganization.user_id)).filter(
            and_(
                UserOrganization.organization_id == organization_id,
                UserOrganization.is_active == True
            )
        ).scalar() or 0

    def add_user(
        self,
        db: Session,
        *,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole = OrganizationRole.MEMBER,
        custom_permissions: Optional[str] = None
    ) -> UserOrganization:
        """Add a user to an organization with a specific role."""
        try:
            # Check if relationship already exists
            existing = db.query(UserOrganization).filter(
                and_(
                    UserOrganization.user_id == user_id,
                    UserOrganization.organization_id == organization_id
                )
            ).first()

            if existing:
                # Reactivate if inactive, or raise error if already active
                if not existing.is_active:
                    existing.is_active = True
                    existing.role = role
                    existing.custom_permissions = custom_permissions
                    db.commit()
                    db.refresh(existing)
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
            db.commit()
            db.refresh(user_org)
            return user_org
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Integrity error adding user to organization: {str(e)}")
            raise ValueError("Failed to add user to organization")
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding user to organization: {str(e)}", exc_info=True)
            raise

    def remove_user(
        self,
        db: Session,
        *,
        organization_id: UUID,
        user_id: UUID
    ) -> bool:
        """Remove a user from an organization (soft delete)."""
        try:
            user_org = db.query(UserOrganization).filter(
                and_(
                    UserOrganization.user_id == user_id,
                    UserOrganization.organization_id == organization_id
                )
            ).first()

            if not user_org:
                return False

            user_org.is_active = False
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error removing user from organization: {str(e)}", exc_info=True)
            raise

    def update_user_role(
        self,
        db: Session,
        *,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole,
        custom_permissions: Optional[str] = None
    ) -> Optional[UserOrganization]:
        """Update a user's role in an organization."""
        try:
            user_org = db.query(UserOrganization).filter(
                and_(
                    UserOrganization.user_id == user_id,
                    UserOrganization.organization_id == organization_id
                )
            ).first()

            if not user_org:
                return None

            user_org.role = role
            if custom_permissions is not None:
                user_org.custom_permissions = custom_permissions
            db.commit()
            db.refresh(user_org)
            return user_org
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating user role: {str(e)}", exc_info=True)
            raise

    def get_organization_members(
        self,
        db: Session,
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
        query = db.query(UserOrganization, User).join(
            User, UserOrganization.user_id == User.id
        ).filter(UserOrganization.organization_id == organization_id)

        if is_active is not None:
            query = query.filter(UserOrganization.is_active == is_active)

        total = query.count()

        results = query.order_by(UserOrganization.created_at.desc()).offset(skip).limit(limit).all()

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

    def get_user_organizations(
        self,
        db: Session,
        *,
        user_id: UUID,
        is_active: bool = True
    ) -> List[Organization]:
        """Get all organizations a user belongs to."""
        query = db.query(Organization).join(
            UserOrganization, Organization.id == UserOrganization.organization_id
        ).filter(UserOrganization.user_id == user_id)

        if is_active is not None:
            query = query.filter(UserOrganization.is_active == is_active)

        return query.all()

    def get_user_role_in_org(
        self,
        db: Session,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> Optional[OrganizationRole]:
        """Get a user's role in a specific organization."""
        user_org = db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == user_id,
                UserOrganization.organization_id == organization_id,
                UserOrganization.is_active == True
            )
        ).first()

        return user_org.role if user_org else None

    def is_user_org_owner(
        self,
        db: Session,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> bool:
        """Check if a user is an owner of an organization."""
        role = self.get_user_role_in_org(db, user_id=user_id, organization_id=organization_id)
        return role == OrganizationRole.OWNER

    def is_user_org_admin(
        self,
        db: Session,
        *,
        user_id: UUID,
        organization_id: UUID
    ) -> bool:
        """Check if a user is an owner or admin of an organization."""
        role = self.get_user_role_in_org(db, user_id=user_id, organization_id=organization_id)
        return role in [OrganizationRole.OWNER, OrganizationRole.ADMIN]


# Create a singleton instance for use across the application
organization = CRUDOrganization(Organization)
