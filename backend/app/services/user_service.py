# app/services/user_service.py
"""Service layer for user operations — delegates to UserRepository."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories.user import UserRepository, user_repo
from app.schemas.users import UserCreate, UserUpdate

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management operations."""

    def __init__(self, user_repository: UserRepository | None = None) -> None:
        self._repo = user_repository or user_repo

    async def get_user(self, db: AsyncSession, user_id: str) -> User:
        """Get user by ID, raising NotFoundError if not found."""
        user = await self._repo.get(db, id=user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """Get user by email address."""
        return await self._repo.get_by_email(db, email=email)

    async def create_user(self, db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user."""
        return await self._repo.create(db, obj_in=user_data)

    async def update_user(
        self, db: AsyncSession, *, user: User, obj_in: UserUpdate | dict[str, Any]
    ) -> User:
        """Update an existing user."""
        return await self._repo.update(db, db_obj=user, obj_in=obj_in)

    async def soft_delete_user(self, db: AsyncSession, user_id: str) -> None:
        """Soft-delete a user by ID."""
        await self._repo.soft_delete(db, id=user_id)

    async def list_users(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        sort_by: str | None = None,
        sort_order: str = "asc",
        filters: dict[str, Any] | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        """List users with pagination, sorting, filtering, and search."""
        return await self._repo.get_multi_with_total(
            db,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            filters=filters,
            search=search,
        )

    async def bulk_update_status(
        self, db: AsyncSession, *, user_ids: list[UUID], is_active: bool
    ) -> int:
        """Bulk update active status for multiple users. Returns count updated."""
        return await self._repo.bulk_update_status(
            db, user_ids=user_ids, is_active=is_active
        )

    async def bulk_soft_delete(
        self,
        db: AsyncSession,
        *,
        user_ids: list[UUID],
        exclude_user_id: UUID | None = None,
    ) -> int:
        """Bulk soft-delete multiple users. Returns count deleted."""
        return await self._repo.bulk_soft_delete(
            db, user_ids=user_ids, exclude_user_id=exclude_user_id
        )

    async def get_stats(self, db: AsyncSession) -> dict[str, Any]:
        """Return user stats needed for the admin dashboard."""
        from sqlalchemy import func, select

        total_users = (
            await db.execute(select(func.count()).select_from(User))
        ).scalar() or 0
        active_count = (
            await db.execute(select(func.count()).select_from(User).where(User.is_active))
        ).scalar() or 0
        inactive_count = (
            await db.execute(
                select(func.count()).select_from(User).where(User.is_active.is_(False))
            )
        ).scalar() or 0
        all_users = list(
            (
                await db.execute(select(User).order_by(User.created_at))
            ).scalars().all()
        )
        return {
            "total_users": total_users,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "all_users": all_users,
        }


# Default singleton
user_service = UserService()
