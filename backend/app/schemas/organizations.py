# app/schemas/organizations.py
import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user_organization import OrganizationRole


# Organization Schemas
class OrganizationBase(BaseModel):
    """Base organization schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool = True
    settings: dict[str, Any] | None = {}

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        """Validate slug format: lowercase, alphanumeric, hyphens only."""
        if v is None:
            return v
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError(
                "Slug must contain only lowercase letters, numbers, and hyphens"
            )
        if v.startswith("-") or v.endswith("-"):
            raise ValueError("Slug cannot start or end with a hyphen")
        if "--" in v:
            raise ValueError("Slug cannot contain consecutive hyphens")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate organization name."""
        if not v or v.strip() == "":
            raise ValueError("Organization name cannot be empty")
        return v.strip()


class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization."""

    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    settings: dict[str, Any] | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        """Validate slug format."""
        if v is None:
            return v
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError(
                "Slug must contain only lowercase letters, numbers, and hyphens"
            )
        if v.startswith("-") or v.endswith("-"):
            raise ValueError("Slug cannot start or end with a hyphen")
        if "--" in v:
            raise ValueError("Slug cannot contain consecutive hyphens")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate organization name."""
        if v is not None and (not v or v.strip() == ""):
            raise ValueError("Organization name cannot be empty")
        return v.strip() if v else v


class OrganizationResponse(OrganizationBase):
    """Schema for organization API responses."""

    id: UUID
    created_at: datetime
    updated_at: datetime | None = None
    member_count: int | None = 0

    model_config = ConfigDict(from_attributes=True)


class OrganizationListResponse(BaseModel):
    """Schema for paginated organization list responses."""

    organizations: list[OrganizationResponse]
    total: int
    page: int
    page_size: int
    pages: int


# User-Organization Relationship Schemas
class UserOrganizationBase(BaseModel):
    """Base schema for user-organization relationship."""

    role: OrganizationRole = OrganizationRole.MEMBER
    is_active: bool = True
    custom_permissions: str | None = None


class UserOrganizationCreate(BaseModel):
    """Schema for adding a user to an organization."""

    user_id: UUID
    role: OrganizationRole = OrganizationRole.MEMBER
    custom_permissions: str | None = None


class UserOrganizationUpdate(BaseModel):
    """Schema for updating user's role in an organization."""

    role: OrganizationRole | None = None
    is_active: bool | None = None
    custom_permissions: str | None = None


class UserOrganizationResponse(BaseModel):
    """Schema for user-organization relationship responses."""

    user_id: UUID
    organization_id: UUID
    role: OrganizationRole
    is_active: bool
    custom_permissions: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberResponse(BaseModel):
    """Schema for organization member information."""

    user_id: UUID
    email: str
    first_name: str
    last_name: str | None = None
    role: OrganizationRole
    is_active: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberListResponse(BaseModel):
    """Schema for paginated organization member list."""

    members: list[OrganizationMemberResponse]
    total: int
    page: int
    page_size: int
    pages: int
