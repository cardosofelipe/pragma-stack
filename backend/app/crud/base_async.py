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
from sqlalchemy.orm import Load

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

    async def get(
        self,
        db: AsyncSession,
        id: str,
        options: Optional[List[Load]] = None
    ) -> Optional[ModelType]:
        """
        Get a single record by ID with UUID validation and optional eager loading.

        Args:
            db: Database session
            id: Record UUID
            options: Optional list of SQLAlchemy load options (e.g., joinedload, selectinload)
                    for eager loading relationships to prevent N+1 queries

        Returns:
            Model instance or None if not found

        Example:
            # Eager load user relationship
            from sqlalchemy.orm import joinedload
            session = await session_crud.get(db, id=session_id, options=[joinedload(UserSession.user)])
        """
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
            query = select(self.model).where(self.model.id == uuid_obj)

            # Apply eager loading options if provided
            if options:
                for option in options:
                    query = query.options(option)

            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving {self.model.__name__} with id {id}: {str(e)}")
            raise

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        options: Optional[List[Load]] = None
    ) -> List[ModelType]:
        """
        Get multiple records with pagination validation and optional eager loading.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            options: Optional list of SQLAlchemy load options for eager loading

        Returns:
            List of model instances
        """
        # Validate pagination parameters
        if skip < 0:
            raise ValueError("skip must be non-negative")
        if limit < 0:
            raise ValueError("limit must be non-negative")
        if limit > 1000:
            raise ValueError("Maximum limit is 1000")

        try:
            query = select(self.model).offset(skip).limit(limit)

            # Apply eager loading options if provided
            if options:
                for option in options:
                    query = query.options(option)

            result = await db.execute(query)
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
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[ModelType], int]:
        """
        Get multiple records with total count, filtering, and sorting.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            sort_by: Field name to sort by (must be a valid model attribute)
            sort_order: Sort order ("asc" or "desc")
            filters: Dictionary of filters (field_name: value)

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
            # Build base query
            query = select(self.model)

            # Exclude soft-deleted records by default
            if hasattr(self.model, 'deleted_at'):
                query = query.where(self.model.deleted_at.is_(None))

            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field) and value is not None:
                        query = query.where(getattr(self.model, field) == value)

            # Get total count (before pagination)
            count_query = select(func.count()).select_from(query.alias())
            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            # Apply sorting
            if sort_by and hasattr(self.model, sort_by):
                sort_column = getattr(self.model, sort_by)
                if sort_order.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())

            # Apply pagination
            query = query.offset(skip).limit(limit)
            items_result = await db.execute(query)
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

    async def soft_delete(self, db: AsyncSession, *, id: str) -> Optional[ModelType]:
        """
        Soft delete a record by setting deleted_at timestamp.

        Only works if the model has a 'deleted_at' column.
        """
        from datetime import datetime, timezone

        # Validate UUID format and convert to UUID object if string
        try:
            if isinstance(id, uuid.UUID):
                uuid_obj = id
            else:
                uuid_obj = uuid.UUID(str(id))
        except (ValueError, AttributeError, TypeError) as e:
            logger.warning(f"Invalid UUID format for soft deletion: {id} - {str(e)}")
            return None

        try:
            result = await db.execute(
                select(self.model).where(self.model.id == uuid_obj)
            )
            obj = result.scalar_one_or_none()

            if obj is None:
                logger.warning(f"{self.model.__name__} with id {id} not found for soft deletion")
                return None

            # Check if model supports soft deletes
            if not hasattr(self.model, 'deleted_at'):
                logger.error(f"{self.model.__name__} does not support soft deletes")
                raise ValueError(f"{self.model.__name__} does not have a deleted_at column")

            # Set deleted_at timestamp
            obj.deleted_at = datetime.now(timezone.utc)
            db.add(obj)
            await db.commit()
            await db.refresh(obj)
            return obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error soft deleting {self.model.__name__} with id {id}: {str(e)}", exc_info=True)
            raise

    async def restore(self, db: AsyncSession, *, id: str) -> Optional[ModelType]:
        """
        Restore a soft-deleted record by clearing the deleted_at timestamp.

        Only works if the model has a 'deleted_at' column.
        """
        # Validate UUID format
        try:
            if isinstance(id, uuid.UUID):
                uuid_obj = id
            else:
                uuid_obj = uuid.UUID(str(id))
        except (ValueError, AttributeError, TypeError) as e:
            logger.warning(f"Invalid UUID format for restoration: {id} - {str(e)}")
            return None

        try:
            # Find the soft-deleted record
            if hasattr(self.model, 'deleted_at'):
                result = await db.execute(
                    select(self.model).where(
                        self.model.id == uuid_obj,
                        self.model.deleted_at.isnot(None)
                    )
                )
                obj = result.scalar_one_or_none()
            else:
                logger.error(f"{self.model.__name__} does not support soft deletes")
                raise ValueError(f"{self.model.__name__} does not have a deleted_at column")

            if obj is None:
                logger.warning(f"Soft-deleted {self.model.__name__} with id {id} not found for restoration")
                return None

            # Clear deleted_at timestamp
            obj.deleted_at = None
            db.add(obj)
            await db.commit()
            await db.refresh(obj)
            return obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error restoring {self.model.__name__} with id {id}: {str(e)}", exc_info=True)
            raise
