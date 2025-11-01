# app/crud/user_async.py
"""Async CRUD operations for User model using SQLAlchemy 2.0 patterns."""
from typing import Optional, Union, Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, select, update
from app.crud.base_async import CRUDBaseAsync
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate
from app.core.auth import get_password_hash_async
import logging

logger = logging.getLogger(__name__)


class CRUDUserAsync(CRUDBaseAsync[User, UserCreate, UserUpdate]):
    """Async CRUD operations for User model."""

    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get user by email address."""
        try:
            result = await db.execute(
                select(User).where(User.email == email)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {str(e)}")
            raise

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """Create a new user with async password hashing and error handling."""
        try:
            # Hash password asynchronously to avoid blocking event loop
            password_hash = await get_password_hash_async(obj_in.password)

            db_obj = User(
                email=obj_in.email,
                password_hash=password_hash,
                first_name=obj_in.first_name,
                last_name=obj_in.last_name,
                phone_number=obj_in.phone_number if hasattr(obj_in, 'phone_number') else None,
                is_superuser=obj_in.is_superuser if hasattr(obj_in, 'is_superuser') else False,
                preferences={}
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "email" in error_msg.lower():
                logger.warning(f"Duplicate email attempted: {obj_in.email}")
                raise ValueError(f"User with email {obj_in.email} already exists")
            logger.error(f"Integrity error creating user: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating user: {str(e)}", exc_info=True)
            raise

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: User,
        obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """Update user with async password hashing if password is updated."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # Handle password separately if it exists in update data
        # Hash password asynchronously to avoid blocking event loop
        if "password" in update_data:
            update_data["password_hash"] = await get_password_hash_async(update_data["password"])
            del update_data["password"]

        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def get_multi_with_total(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """
        Get multiple users with total count, filtering, sorting, and search.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            sort_by: Field name to sort by
            sort_order: Sort order ("asc" or "desc")
            filters: Dictionary of filters (field_name: value)
            search: Search term to match against email, first_name, last_name

        Returns:
            Tuple of (users list, total count)
        """
        # Validate pagination
        if skip < 0:
            raise ValueError("skip must be non-negative")
        if limit < 0:
            raise ValueError("limit must be non-negative")
        if limit > 1000:
            raise ValueError("Maximum limit is 1000")

        try:
            # Build base query
            query = select(User)

            # Exclude soft-deleted users
            query = query.where(User.deleted_at.is_(None))

            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(User, field) and value is not None:
                        query = query.where(getattr(User, field) == value)

            # Apply search
            if search:
                search_filter = or_(
                    User.email.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%")
                )
                query = query.where(search_filter)

            # Get total count
            from sqlalchemy import func
            count_query = select(func.count()).select_from(query.alias())
            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            # Apply sorting
            if sort_by and hasattr(User, sort_by):
                sort_column = getattr(User, sort_by)
                if sort_order.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())

            # Apply pagination
            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            users = list(result.scalars().all())

            return users, total

        except Exception as e:
            logger.error(f"Error retrieving paginated users: {str(e)}")
            raise

    async def bulk_update_status(
        self,
        db: AsyncSession,
        *,
        user_ids: List[UUID],
        is_active: bool
    ) -> int:
        """
        Bulk update is_active status for multiple users.

        Args:
            db: Database session
            user_ids: List of user IDs to update
            is_active: New active status

        Returns:
            Number of users updated
        """
        try:
            if not user_ids:
                return 0

            # Use UPDATE with WHERE IN for efficiency
            stmt = (
                update(User)
                .where(User.id.in_(user_ids))
                .where(User.deleted_at.is_(None))  # Don't update deleted users
                .values(is_active=is_active, updated_at=datetime.now(timezone.utc))
            )

            result = await db.execute(stmt)
            await db.commit()

            updated_count = result.rowcount
            logger.info(f"Bulk updated {updated_count} users to is_active={is_active}")
            return updated_count

        except Exception as e:
            await db.rollback()
            logger.error(f"Error bulk updating user status: {str(e)}", exc_info=True)
            raise

    async def bulk_soft_delete(
        self,
        db: AsyncSession,
        *,
        user_ids: List[UUID],
        exclude_user_id: Optional[UUID] = None
    ) -> int:
        """
        Bulk soft delete multiple users.

        Args:
            db: Database session
            user_ids: List of user IDs to delete
            exclude_user_id: Optional user ID to exclude (e.g., the admin performing the action)

        Returns:
            Number of users deleted
        """
        try:
            if not user_ids:
                return 0

            # Remove excluded user from list
            filtered_ids = [uid for uid in user_ids if uid != exclude_user_id]

            if not filtered_ids:
                return 0

            # Use UPDATE with WHERE IN for efficiency
            stmt = (
                update(User)
                .where(User.id.in_(filtered_ids))
                .where(User.deleted_at.is_(None))  # Don't re-delete already deleted users
                .values(
                    deleted_at=datetime.now(timezone.utc),
                    is_active=False,
                    updated_at=datetime.now(timezone.utc)
                )
            )

            result = await db.execute(stmt)
            await db.commit()

            deleted_count = result.rowcount
            logger.info(f"Bulk soft deleted {deleted_count} users")
            return deleted_count

        except Exception as e:
            await db.rollback()
            logger.error(f"Error bulk deleting users: {str(e)}", exc_info=True)
            raise

    def is_active(self, user: User) -> bool:
        """Check if user is active."""
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        """Check if user is a superuser."""
        return user.is_superuser


# Create a singleton instance for use across the application
user_async = CRUDUserAsync(User)
