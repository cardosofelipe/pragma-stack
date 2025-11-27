# app/models/user_organization.py
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class OrganizationRole(str, PyEnum):
    """
    Built-in organization roles.
    These provide a baseline role system that can be optionally used.
    Projects can extend this or implement their own permission system.
    """

    OWNER = "owner"  # Full control over organization
    ADMIN = "admin"  # Can manage users and settings
    MEMBER = "member"  # Regular member with standard access
    GUEST = "guest"  # Limited read-only access


class UserOrganization(Base, TimestampMixin):
    """
    Junction table for many-to-many relationship between Users and Organizations.
    Includes role information for flexible RBAC.
    """

    __tablename__ = "user_organizations"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    organization_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )

    role: Column[OrganizationRole] = Column(
        Enum(OrganizationRole),
        default=OrganizationRole.MEMBER,
        nullable=False,
        # Note: index defined in __table_args__ as ix_user_org_role
    )
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Optional: Custom permissions override for specific users
    custom_permissions = Column(
        String(500), nullable=True
    )  # JSON array of permission strings

    # Relationships
    user = relationship("User", back_populates="user_organizations")
    organization = relationship("Organization", back_populates="user_organizations")

    __table_args__ = (
        Index("ix_user_org_user_active", "user_id", "is_active"),
        Index("ix_user_org_org_active", "organization_id", "is_active"),
        Index("ix_user_org_role", "role"),
    )

    def __repr__(self):
        return f"<UserOrganization user={self.user_id} org={self.organization_id} role={self.role}>"
