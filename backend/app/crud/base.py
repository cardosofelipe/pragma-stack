from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union, Tuple
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError, DataError
from sqlalchemy import func
from app.core.database import Base
import logging
import uuid

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).

        Parameters:
            model: A SQLAlchemy model class
        """
        self.model = model

    def get(self, db: Session, id: str) -> Optional[ModelType]:
        """Get a single record by ID with UUID validation."""
        # Validate UUID format
        try:
            uuid.UUID(id)
        except (ValueError, AttributeError):
            logger.warning(f"Invalid UUID format: {id}")
            return None

        try:
            return db.query(self.model).filter(self.model.id == id).first()
        except Exception as e:
            logger.error(f"Error retrieving {self.model.__name__} with id {id}: {str(e)}")
            raise

    def get_multi(
            self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with pagination validation."""
        # Validate pagination parameters
        if skip < 0:
            raise ValueError("skip must be non-negative")
        if limit < 0:
            raise ValueError("limit must be non-negative")
        if limit > 1000:
            raise ValueError("Maximum limit is 1000")

        try:
            return db.query(self.model).offset(skip).limit(limit).all()
        except Exception as e:
            logger.error(f"Error retrieving multiple {self.model.__name__} records: {str(e)}")
            raise

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record with error handling."""
        try:
            obj_in_data = jsonable_encoder(obj_in)
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                logger.warning(f"Duplicate entry attempted for {self.model.__name__}: {error_msg}")
                raise ValueError(f"A {self.model.__name__} with this data already exists")
            logger.error(f"Integrity error creating {self.model.__name__}: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except (OperationalError, DataError) as e:
            db.rollback()
            logger.error(f"Database error creating {self.model.__name__}: {str(e)}")
            raise ValueError(f"Database operation failed: {str(e)}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating {self.model.__name__}: {str(e)}", exc_info=True)
            raise

    def update(
            self,
            db: Session,
            *,
            db_obj: ModelType,
            obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Update a record with error handling."""
        try:
            obj_data = jsonable_encoder(db_obj)
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.model_dump(exclude_unset=True)
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                logger.warning(f"Duplicate entry attempted for {self.model.__name__}: {error_msg}")
                raise ValueError(f"A {self.model.__name__} with this data already exists")
            logger.error(f"Integrity error updating {self.model.__name__}: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except (OperationalError, DataError) as e:
            db.rollback()
            logger.error(f"Database error updating {self.model.__name__}: {str(e)}")
            raise ValueError(f"Database operation failed: {str(e)}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error updating {self.model.__name__}: {str(e)}", exc_info=True)
            raise

    def remove(self, db: Session, *, id: str) -> Optional[ModelType]:
        """Delete a record with error handling and null check."""
        # Validate UUID format
        try:
            uuid.UUID(id)
        except (ValueError, AttributeError):
            logger.warning(f"Invalid UUID format for deletion: {id}")
            return None

        try:
            obj = db.query(self.model).filter(self.model.id == id).first()
            if obj is None:
                logger.warning(f"{self.model.__name__} with id {id} not found for deletion")
                return None

            db.delete(obj)
            db.commit()
            return obj
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Integrity error deleting {self.model.__name__}: {error_msg}")
            raise ValueError(f"Cannot delete {self.model.__name__}: referenced by other records")
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting {self.model.__name__} with id {id}: {str(e)}", exc_info=True)
            raise

    def get_multi_with_total(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> Tuple[List[ModelType], int]:
        """
        Get multiple records with total count for pagination.

        Returns:
            Tuple of (items, total_count)
        """
        # Validate pagination parameters
        if skip < 0:
            raise ValueError("skip must be non-negative")
        if limit < 0:
            raise ValueError("limit must be non-negative")
        if limit > 1000:
            raise ValueError("Maximum limit is 1000")

        try:
            # Get total count
            total = db.query(func.count(self.model.id)).scalar()

            # Get paginated items
            items = db.query(self.model).offset(skip).limit(limit).all()

            return items, total
        except Exception as e:
            logger.error(f"Error retrieving paginated {self.model.__name__} records: {str(e)}")
            raise