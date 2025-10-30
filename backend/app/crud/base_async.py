# app/crud/base_async.py
"""
Async CRUD operations base class using SQLAlchemy 2.0 async patterns.

Provides reusable create, read, update, and delete operations for all models.
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union, Tuple
import logging
import uuid

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, OperationalError, DataError

from app.core.database_async import Base

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBaseAsync(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Async CRUD operations for a model."""

    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default async methods to Create, Read, Update, Delete.

        Parameters:
            model: A SQLAlchemy model class
        """
        self.model = model

    async def get(self, db: AsyncSession, id: str) -> Optional[ModelType]:
        """Get a single record by ID with UUID validation."""
        # Validate UUID format and convert to UUID object if string
        try:
            if isinstance(id, uuid.UUID):
                uuid_obj = id
            else:
                uuid_obj = uuid.UUID(str(id))
        except (ValueError, AttributeError, TypeError) as e:
            logger.warning(f"Invalid UUID format: {id} - {str(e)}")
            return None

        try:
            result = await db.execute(
                select(self.model).where(self.model.id == uuid_obj)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving {self.model.__name__} with id {id}: {str(e)}")
            raise

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
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
            result = await db.execute(
                select(self.model).offset(skip).limit(limit)
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error retrieving multiple {self.model.__name__} records: {str(e)}")
            raise

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record with error handling."""
        try:
            obj_in_data = jsonable_encoder(obj_in)
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                logger.warning(f"Duplicate entry attempted for {self.model.__name__}: {error_msg}")
                raise ValueError(f"A {self.model.__name__} with this data already exists")
            logger.error(f"Integrity error creating {self.model.__name__}: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except (OperationalError, DataError) as e:
            await db.rollback()
            logger.error(f"Database error creating {self.model.__name__}: {str(e)}")
            raise ValueError(f"Database operation failed: {str(e)}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating {self.model.__name__}: {str(e)}", exc_info=True)
            raise

    async def update(
        self,
        db: AsyncSession,
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
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                logger.warning(f"Duplicate entry attempted for {self.model.__name__}: {error_msg}")
                raise ValueError(f"A {self.model.__name__} with this data already exists")
            logger.error(f"Integrity error updating {self.model.__name__}: {error_msg}")
            raise ValueError(f"Database integrity error: {error_msg}")
        except (OperationalError, DataError) as e:
            await db.rollback()
            logger.error(f"Database error updating {self.model.__name__}: {str(e)}")
            raise ValueError(f"Database operation failed: {str(e)}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error updating {self.model.__name__}: {str(e)}", exc_info=True)
            raise

    async def remove(self, db: AsyncSession, *, id: str) -> Optional[ModelType]:
        """Delete a record with error handling and null check."""
        # Validate UUID format and convert to UUID object if string
        try:
            if isinstance(id, uuid.UUID):
                uuid_obj = id
            else:
                uuid_obj = uuid.UUID(str(id))
        except (ValueError, AttributeError, TypeError) as e:
            logger.warning(f"Invalid UUID format for deletion: {id} - {str(e)}")
            return None

        try:
            result = await db.execute(
                select(self.model).where(self.model.id == uuid_obj)
            )
            obj = result.scalar_one_or_none()

            if obj is None:
                logger.warning(f"{self.model.__name__} with id {id} not found for deletion")
                return None

            await db.delete(obj)
            await db.commit()
            return obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Integrity error deleting {self.model.__name__}: {error_msg}")
            raise ValueError(f"Cannot delete {self.model.__name__}: referenced by other records")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting {self.model.__name__} with id {id}: {str(e)}", exc_info=True)
            raise

    async def get_multi_with_total(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
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
            count_result = await db.execute(
                select(func.count(self.model.id))
            )
            total = count_result.scalar_one()

            # Get paginated items
            items_result = await db.execute(
                select(self.model).offset(skip).limit(limit)
            )
            items = list(items_result.scalars().all())

            return items, total
        except Exception as e:
            logger.error(f"Error retrieving paginated {self.model.__name__} records: {str(e)}")
            raise

    async def count(self, db: AsyncSession) -> int:
        """Get total count of records."""
        try:
            result = await db.execute(select(func.count(self.model.id)))
            return result.scalar_one()
        except Exception as e:
            logger.error(f"Error counting {self.model.__name__} records: {str(e)}")
            raise

    async def exists(self, db: AsyncSession, id: str) -> bool:
        """Check if a record exists by ID."""
        obj = await self.get(db, id=id)
        return obj is not None
