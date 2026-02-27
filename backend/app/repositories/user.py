# app/repositories/user.py
"""Repository for User model async CRUD operations using SQLAlchemy 2.0 patterns."""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_password_hash_async
from app.core.repository_exceptions import DuplicateEntryError, InvalidInputError
from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.users import UserCreate, UserUpdate

logger = logging.getLogger(__name__)


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """Repository for User model."""

    async def get_by_email(self, db: AsyncSession, *, email: str) -> User | None:
        """Get user by email address."""
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e!s}")
            raise

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """Create a new user with async password hashing and error handling."""
        try:
            password_hash = await get_password_hash_async(obj_in.password)

            db_obj = User(
                email=obj_in.email,
                password_hash=password_hash,
                first_name=obj_in.first_name,
                last_name=obj_in.last_name,
                phone_number=obj_in.phone_number
                if hasattr(obj_in, "phone_number")
                else None,
                is_superuser=obj_in.is_superuser
                if hasattr(obj_in, "is_superuser")
                else False,
                preferences={},
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            if "email" in error_msg.lower():
                logger.warning(f"Duplicate email attempted: {obj_in.email}")
                raise DuplicateEntryError(f"User with email {obj_in.email} already exists")
            logger.error(f"Integrity error creating user: {error_msg}")
            raise DuplicateEntryError(f"Database integrity error: {error_msg}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating user: {e!s}", exc_info=True)
            raise

    async def create_oauth_user(
        self,
        db: AsyncSession,
        *,
        email: str,
        first_name: str = "User",
        last_name: str | None = None,
    ) -> User:
        """Create a new passwordless user for OAuth sign-in."""
        try:
            db_obj = User(
                email=email,
                password_hash=None,  # OAuth-only user
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_superuser=False,
            )
            db.add(db_obj)
            await db.flush()  # Get user.id without committing
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            if "email" in error_msg.lower():
                logger.warning(f"Duplicate email attempted: {email}")
                raise DuplicateEntryError(f"User with email {email} already exists")
            logger.error(f"Integrity error creating OAuth user: {error_msg}")
            raise DuplicateEntryError(f"Database integrity error: {error_msg}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating OAuth user: {e!s}", exc_info=True)
            raise

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate | dict[str, Any]
    ) -> User:
        """Update user with async password hashing if password is updated."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data:
            update_data["password_hash"] = await get_password_hash_async(
                update_data["password"]
            )
            del update_data["password"]

        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def update_password(
        self, db: AsyncSession, *, user: User, password_hash: str
    ) -> User:
        """Set a new password hash on a user and commit."""
        user.password_hash = password_hash
        await db.commit()
        await db.refresh(user)
        return user

    async def get_multi_with_total(
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
        """Get multiple users with total count, filtering, sorting, and search."""
        if skip < 0:
            raise InvalidInputError("skip must be non-negative")
        if limit < 0:
            raise InvalidInputError("limit must be non-negative")
        if limit > 1000:
            raise InvalidInputError("Maximum limit is 1000")

        try:
            query = select(User)
            query = query.where(User.deleted_at.is_(None))

            if filters:
                for field, value in filters.items():
                    if hasattr(User, field) and value is not None:
                        query = query.where(getattr(User, field) == value)

            if search:
                search_filter = or_(
                    User.email.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%"),
                )
                query = query.where(search_filter)

            from sqlalchemy import func

            count_query = select(func.count()).select_from(query.alias())
            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            if sort_by and hasattr(User, sort_by):
                sort_column = getattr(User, sort_by)
                if sort_order.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())

            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            users = list(result.scalars().all())

            return users, total

        except Exception as e:
            logger.error(f"Error retrieving paginated users: {e!s}")
            raise

    async def bulk_update_status(
        self, db: AsyncSession, *, user_ids: list[UUID], is_active: bool
    ) -> int:
        """Bulk update is_active status for multiple users."""
        try:
            if not user_ids:
                return 0

            stmt = (
                update(User)
                .where(User.id.in_(user_ids))
                .where(User.deleted_at.is_(None))
                .values(is_active=is_active, updated_at=datetime.now(UTC))
            )

            result = await db.execute(stmt)
            await db.commit()

            updated_count = result.rowcount
            logger.info(f"Bulk updated {updated_count} users to is_active={is_active}")
            return updated_count

        except Exception as e:
            await db.rollback()
            logger.error(f"Error bulk updating user status: {e!s}", exc_info=True)
            raise

    async def bulk_soft_delete(
        self,
        db: AsyncSession,
        *,
        user_ids: list[UUID],
        exclude_user_id: UUID | None = None,
    ) -> int:
        """Bulk soft delete multiple users."""
        try:
            if not user_ids:
                return 0

            filtered_ids = [uid for uid in user_ids if uid != exclude_user_id]

            if not filtered_ids:
                return 0

            stmt = (
                update(User)
                .where(User.id.in_(filtered_ids))
                .where(User.deleted_at.is_(None))
                .values(
                    deleted_at=datetime.now(UTC),
                    is_active=False,
                    updated_at=datetime.now(UTC),
                )
            )

            result = await db.execute(stmt)
            await db.commit()

            deleted_count = result.rowcount
            logger.info(f"Bulk soft deleted {deleted_count} users")
            return deleted_count

        except Exception as e:
            await db.rollback()
            logger.error(f"Error bulk deleting users: {e!s}", exc_info=True)
            raise

    def is_active(self, user: User) -> bool:
        """Check if user is active."""
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        """Check if user is a superuser."""
        return user.is_superuser


# Singleton instance
user_repo = UserRepository(User)
