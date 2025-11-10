import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID


# noinspection PyUnresolvedReferences
from app.core.database import Base


class TimestampMixin:
    """Mixin to add created_at and updated_at timestamps to models"""

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class UUIDMixin:
    """Mixin to add UUID primary keys to models"""

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
