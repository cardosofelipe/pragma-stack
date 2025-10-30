# tests/conftest.py
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db
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


@pytest.fixture(scope="function")  # Define a fixture
async def async_test_db():
    """Fixture provides new testing engine and session for each test run to improve isolation."""

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


@pytest.fixture(scope="function")
def client(test_db):
    """
    Create a FastAPI test client with a test database.

    This overrides the get_db dependency to use the test database.
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db):
    """
    Create a test user in the database.

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
    Create a test superuser in the database.

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