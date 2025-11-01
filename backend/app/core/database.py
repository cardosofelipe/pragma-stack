# app/core/database.py
import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# SQLite compatibility for testing
@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, 'sqlite')
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"

# Declarative base for models
Base = declarative_base()

# Create engine with optimized settings for PostgreSQL
def create_production_engine():
    return create_engine(
        settings.database_url,
        # Connection pool settings
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
        # Query execution settings
        connect_args={
            "application_name": "eventspace",
            "keepalives": 1,
            "keepalives_idle": 60,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "options": "-c timezone=UTC",
        },
        isolation_level="READ COMMITTED",
        echo=settings.sql_echo,
        echo_pool=settings.sql_echo_pool,
    )

# Default production engine and session factory
engine = create_production_engine()
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent unnecessary queries after commit
)

# FastAPI dependency
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def transaction_scope() -> Generator[Session, None, None]:
    """
    Provide a transactional scope for database operations.

    Automatically commits on success or rolls back on exception.
    Useful for grouping multiple operations in a single transaction.

    Usage:
        with transaction_scope() as db:
            user = user_crud.create(db, obj_in=user_create)
            profile = profile_crud.create(db, obj_in=profile_create)
            # Both operations committed together
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
        logger.debug("Transaction committed successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed, rolling back: {str(e)}")
        raise
    finally:
        db.close()


def check_database_health() -> bool:
    """
    Check if database connection is healthy.
    Returns True if connection is successful, False otherwise.
    """
    try:
        with transaction_scope() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return False