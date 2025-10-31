# tests/conftest.py
import os
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Set IS_TEST environment variable BEFORE importing app
# This prevents the scheduler from starting during tests
os.environ["IS_TEST"] = "True"

from app.main import app
from app.core.database_async import get_async_db
from app.models.user import User
from app.core.auth import get_password_hash
from app.utils.test_utils import setup_test_db, teardown_test_db, setup_async_test_db, teardown_async_test_db


@pytest.fixture(scope="function")
def db_session():
    """
    Creates a fresh SQLite in-memory database for each test function.
    
    Yields a SQLAlchemy session that can be used for testing.
    """
    # Set up the database
    test_engine, TestingSessionLocal = setup_test_db()

    # Create a session
    with TestingSessionLocal() as session:
        yield session

    # Clean up
    teardown_test_db(test_engine)


@pytest_asyncio.fixture(scope="function")  # Function scope for isolation
async def async_test_db():
    """Fixture provides testing engine and session for each test.

    Each test gets a fresh database for complete isolation.
    """
    test_engine, AsyncTestingSessionLocal = await setup_async_test_db()
    yield test_engine, AsyncTestingSessionLocal
    await teardown_async_test_db(test_engine)

@pytest.fixture
def user_create_data():
    return {
        "email": "newtest@example.com",  # Changed to avoid conflict with mock_user
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+1234567890",
        "is_superuser": False,
        "preferences": None
    }


@pytest.fixture
def mock_user(db_session):
    """Fixture to create and return a mock User instance."""
    mock_user = User(
        id=uuid.uuid4(),
        email="mockuser@example.com",
        password_hash="mockhashedpassword",
        first_name="Mock",
        last_name="User",
        phone_number="1234567890",
        is_active=True,
        is_superuser=False,
        preferences=None,
    )
    db_session.add(mock_user)
    db_session.commit()
    return mock_user


@pytest.fixture(scope="function")
def test_db():
    """
    Creates a test database for integration tests.

    This creates a fresh database for each test to ensure isolation.
    """
    test_engine, TestingSessionLocal = setup_test_db()

    # Create a session
    with TestingSessionLocal() as session:
        yield session

    # Clean up
    teardown_test_db(test_engine)


@pytest_asyncio.fixture(scope="function")
async def client(async_test_db):
    """
    Create a FastAPI async test client with a test database.

    This overrides the get_async_db dependency to use the test database.
    """
    test_engine, AsyncTestingSessionLocal = async_test_db

    async def override_get_async_db():
        async with AsyncTestingSessionLocal() as session:
            try:
                yield session
            finally:
                pass

    app.dependency_overrides[get_async_db] = override_get_async_db

    # Use ASGITransport for httpx >= 0.27
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db):
    """
    Create a test user in the database (sync version for legacy tests).

    Password: TestPassword123
    """
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        password_hash=get_password_hash("TestPassword123"),
        first_name="Test",
        last_name="User",
        phone_number="+1234567890",
        is_active=True,
        is_superuser=False,
        preferences=None,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_superuser(test_db):
    """
    Create a test superuser in the database (sync version for legacy tests).

    Password: SuperPassword123
    """
    user = User(
        id=uuid.uuid4(),
        email="superuser@example.com",
        password_hash=get_password_hash("SuperPassword123"),
        first_name="Super",
        last_name="User",
        phone_number="+9876543210",
        is_active=True,
        is_superuser=True,
        preferences=None,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def async_test_user(async_test_db):
    """
    Create a test user in the database (async version).

    Password: TestPassword123
    """
    test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="testuser@example.com",
            password_hash=get_password_hash("TestPassword123"),
            first_name="Test",
            last_name="User",
            phone_number="+1234567890",
            is_active=True,
            is_superuser=False,
            preferences=None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def async_test_superuser(async_test_db):
    """
    Create a test superuser in the database (async version).

    Password: SuperPassword123
    """
    test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="superuser@example.com",
            password_hash=get_password_hash("SuperPassword123"),
            first_name="Super",
            last_name="User",
            phone_number="+9876543210",
            is_active=True,
            is_superuser=True,
            preferences=None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user