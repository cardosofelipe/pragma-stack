# app/api/dependencies/permissions.py
"""
Permission checking dependencies for admin and organization-based access control.

These dependencies are optional and flexible:
- Use require_superuser for global admin access
- Use require_org_role for organization-specific access control
- Projects can choose to use these or implement their own permission system
"""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.crud.organization import organization as organization_crud
from app.models.user import User
from app.models.user_organization import OrganizationRole


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure the current user is a superuser.

    Use this for admin-only endpoints that require global access.

    Example:
        @router.get("/admin/users")
        def list_users(admin: User = Depends(require_superuser)):
            ...
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user


class OrganizationPermission:
    """
    Factory for organization-based permission checking.

    This allows flexible role-based access control within organizations.
    Projects can extend this or implement custom permission logic.
    """

    def __init__(self, allowed_roles: list[OrganizationRole]):
        """
        Initialize with list of allowed roles.

        Args:
            allowed_roles: List of roles that can access the endpoint
        """
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        organization_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        """
        Check if user has required role in the organization.

        Args:
            organization_id: The organization to check access for
            current_user: The authenticated user
            db: Database session

        Returns:
            The current user if they have permission

        Raises:
            HTTPException: If user lacks permission
        """
        # Superusers bypass organization checks
        if current_user.is_superuser:
            return current_user

        # Get user's role in organization
        user_role = await organization_crud.get_user_role_in_org(
            db, user_id=current_user.id, organization_id=organization_id
        )

        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization",
            )

        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user_role} not authorized. Required: {self.allowed_roles}",
            )

        return current_user


# Common permission presets for convenience
require_org_owner = OrganizationPermission([OrganizationRole.OWNER])
require_org_admin = OrganizationPermission(
    [OrganizationRole.OWNER, OrganizationRole.ADMIN]
)
require_org_member = OrganizationPermission(
    [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER]
)


async def require_org_membership(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Ensure user is a member of the organization (any role).

    Use this for endpoints that any organization member can access.
    """
    if current_user.is_superuser:
        return current_user

    user_role = await organization_crud.get_user_role_in_org(
        db, user_id=current_user.id, organization_id=organization_id
    )

    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )

    return current_user
