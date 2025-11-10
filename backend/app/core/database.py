# app/core/database.py
"""
Database configuration using SQLAlchemy 2.0 and asyncpg.

This module provides async database connectivity with proper connection pooling
and session management for FastAPI endpoints.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


# SQLite compatibility for testing
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"


@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"


# Declarative base for models (SQLAlchemy 2.0 style)
class Base(DeclarativeBase):
    """Base class for all database models."""


def get_async_database_url(url: str) -> str:
    """
    Convert sync database URL to async URL.

    postgresql:// -> postgresql+asyncpg://
    sqlite:// -> sqlite+aiosqlite://
    """
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://")
    elif url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://")
    return url


# Create async engine with optimized settings
def create_async_production_engine() -> AsyncEngine:
    """Create an async database engine with production settings."""
    async_url = get_async_database_url(settings.database_url)

    # Base engine config
    engine_config = {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout,
        "pool_recycle": settings.db_pool_recycle,
        "pool_pre_ping": True,
        "echo": settings.sql_echo,
        "echo_pool": settings.sql_echo_pool,
    }

    # Add PostgreSQL-specific connect_args
    if "postgresql" in async_url:
        engine_config["connect_args"] = {  # type: ignore[assignment]
            "server_settings": {
                "application_name": settings.PROJECT_NAME,
                "timezone": "UTC",
            },
            # asyncpg-specific settings
            "command_timeout": 60,
            "timeout": 10,
        }

    return create_async_engine(async_url, **engine_config)


# Create async engine and session factory
engine = create_async_production_engine()
SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # Prevent unnecessary queries after commit
)


# FastAPI dependency for async database sessions
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.
    Automatically closes the session after the request completes.

    Usage:
        @router.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def async_transaction_scope() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an async transactional scope for database operations.

    Automatically commits on success or rolls back on exception.
    Useful for grouping multiple operations in a single transaction.

    Usage:
        async with async_transaction_scope() as db:
            user = await user_crud.create(db, obj_in=user_create)
            profile = await profile_crud.create(db, obj_in=profile_create)
            # Both operations committed together
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
            logger.debug("Async transaction committed successfully")
        except Exception as e:
            await session.rollback()
            logger.error(f"Async transaction failed, rolling back: {e!s}")
            raise
        finally:
            await session.close()


async def check_async_database_health() -> bool:
    """
    Check if async database connection is healthy.
    Returns True if connection is successful, False otherwise.
    """
    try:
        async with async_transaction_scope() as db:
            await db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Async database health check failed: {e!s}")
        return False


# Alias for consistency with main.py
check_database_health = check_async_database_health


async def init_async_db() -> None:
    """
    Initialize async database tables.

    This creates all tables defined in the models.
    Should only be used in development or testing.
    In production, use Alembic migrations.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Async database tables created")


async def close_async_db() -> None:
    """
    Close all async database connections.

    Should be called during application shutdown.
    """
    await engine.dispose()
    logger.info("Async database connections closed")
