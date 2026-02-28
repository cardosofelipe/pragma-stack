import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base

logger = logging.getLogger(__name__)


def get_test_engine():
    """Create an SQLite in-memory engine specifically for testing"""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # Use static pool for in-memory testing
        echo=False,
    )

    return test_engine


def setup_test_db():
    """Create a test database and session factory"""
    # Create a new engine for this test run
    test_engine = get_test_engine()

    # Create tables
    Base.metadata.create_all(test_engine)

    # Create session factory
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False
    )

    return test_engine, TestingSessionLocal


def teardown_test_db(engine):
    """Clean up after tests"""
    # Drop all tables
    Base.metadata.drop_all(engine)

    # Dispose of engine
    engine.dispose()


async def get_async_test_engine():
    """Create an async SQLite in-memory engine specifically for testing"""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # Use static pool for in-memory testing
        echo=False,
    )
    return test_engine


async def setup_async_test_db():
    """Create an async test database and session factory"""
    test_engine = await get_async_test_engine()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncTestingSessionLocal = sessionmaker(  # pyright: ignore[reportCallIssue]
        autocommit=False,
        autoflush=False,
        bind=test_engine,  # pyright: ignore[reportArgumentType]
        expire_on_commit=False,
        class_=AsyncSession,
    )

    return test_engine, AsyncTestingSessionLocal


async def teardown_async_test_db(engine):
    """Clean up after async tests"""
    await engine.dispose()
