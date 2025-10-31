# app/models/organization.py
from sqlalchemy import Column, String, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class Organization(Base, UUIDMixin, TimestampMixin):
    """
    Organization model for multi-tenant support.
    Users can belong to multiple organizations with different roles.
    """
    __tablename__ = 'organizations'

    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    settings = Column(JSONB, default={})

    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_organizations_name_active', 'name', 'is_active'),
        Index('ix_organizations_slug_active', 'slug', 'is_active'),
    )

    def __repr__(self):
        return f"<Organization {self.name} ({self.slug})>"
