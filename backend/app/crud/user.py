# app/crud/user.py
from typing import Optional, Union, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate
from app.core.auth import get_password_hash
import logging

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

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser


# Create a singleton instance for use across the application
user = CRUDUser(User)