# app/crud/user.py
import logging
from typing import Optional, Union, Dict, Any, List, Tuple

from sqlalchemy import or_, asc, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_password_hash
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate

logger = logging.getLogger(__name__)


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create a new user with password hashing and error handling."""
        try:
            db_obj = User(
                email=obj_in.email,
                password_hash=get_password_hash(obj_in.password),
                first_name=obj_in.first_name,
                last_name=obj_in.last_name,
                phone_number=obj_in.phone_number if hasattr(obj_in, 'phone_number') else None,
                is_superuser=obj_in.is_superuser if hasattr(obj_in, 'is_superuser') else False,
                preferences={}
            )
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "email" in error_msg.lower():
                logger.warning(f"Duplicate email attempted: {obj_in.email}")
                raise ValueError(f"User with email {obj_in.email} already exists")
            logger.error(f"Integrity error creating user: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating user: {str(e)}", exc_info=True)
            raise

    def update(
            self,
            db: Session,
            *,
            db_obj: User,
            obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # Handle password separately if it exists in update data
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data["password"])
            del update_data["password"]

        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def get_multi_with_total(
        self,
        db: Session,
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
            query = db.query(User)

            # Exclude soft-deleted users
            query = query.filter(User.deleted_at.is_(None))

            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(User, field) and value is not None:
                        query = query.filter(getattr(User, field) == value)

            # Apply search
            if search:
                search_filter = or_(
                    User.email.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%")
                )
                query = query.filter(search_filter)

            # Get total count
            total = query.count()

            # Apply sorting
            if sort_by and hasattr(User, sort_by):
                sort_column = getattr(User, sort_by)
                if sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))

            # Apply pagination
            users = query.offset(skip).limit(limit).all()

            return users, total

        except Exception as e:
            logger.error(f"Error retrieving paginated users: {str(e)}")
            raise

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser


# Create a singleton instance for use across the application
user = CRUDUser(User)