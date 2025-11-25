"""
E2E Test Fixtures using Testcontainers.

This module provides fixtures for end-to-end testing with:
- Real PostgreSQL containers (via Testcontainers)
- ASGI test clients connected to real database

Requirements:
    - Docker must be running
    - Install E2E deps: make install-e2e (or uv sync --extra e2e)

Usage:
    make test-e2e          # Run all E2E tests
    make test-e2e-schema   # Run schema tests only
"""

import os
import subprocess

# Disable Testcontainers Ryuk (Reaper) to avoid port mapping issues in some environments.
# Ryuk is used for automatic cleanup of containers, but can cause issues with port 8080.
# Containers will still be cleaned up when the test session ends via explicit stop() calls.
os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")

import pytest
import pytest_asyncio


def is_docker_available() -> bool:
    """Check if Docker daemon is accessible."""
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=10,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


DOCKER_AVAILABLE = is_docker_available()

# Conditional import - only import testcontainers if Docker is available
if DOCKER_AVAILABLE:
    try:
        from testcontainers.postgres import PostgresContainer

        TESTCONTAINERS_AVAILABLE = True
    except ImportError:
        TESTCONTAINERS_AVAILABLE = False
else:
    TESTCONTAINERS_AVAILABLE = False


def pytest_collection_modifyitems(config, items):
    """Skip E2E tests if Docker is not available."""
    if not DOCKER_AVAILABLE:
        skip_marker = pytest.mark.skip(
            reason="Docker not available - start Docker to run E2E tests"
        )
        for item in items:
            if (
                "e2e" in item.keywords
                or "postgres" in item.keywords
                or "schemathesis" in item.keywords
            ):
                item.add_marker(skip_marker)
    elif not TESTCONTAINERS_AVAILABLE:
        skip_marker = pytest.mark.skip(
            reason="testcontainers not installed - run: make install-e2e"
        )
        for item in items:
            if "e2e" in item.keywords or "postgres" in item.keywords:
                item.add_marker(skip_marker)


# Store container at module level to share across tests
_postgres_container = None
_postgres_url = None


@pytest.fixture(scope="session")
def postgres_container():
    """
    Session-scoped PostgreSQL container.

    Starts once per test session and is shared across all E2E tests.
    This significantly improves test performance compared to per-test containers.
    """
    global _postgres_container, _postgres_url

    if not DOCKER_AVAILABLE:
        pytest.skip("Docker not available")

    if not TESTCONTAINERS_AVAILABLE:
        pytest.skip("testcontainers not installed - run: make install-e2e")

    _postgres_container = PostgresContainer("postgres:17-alpine")
    _postgres_container.start()
    _postgres_url = _postgres_container.get_connection_url()

    yield _postgres_container

    _postgres_container.stop()
    _postgres_container = None
    _postgres_url = None


@pytest.fixture(scope="session")
def postgres_url(postgres_container) -> str:
    """Get sync PostgreSQL URL from container."""
    return _postgres_url


@pytest.fixture(scope="session")
def async_postgres_url(postgres_url) -> str:
    """
    Get async-compatible PostgreSQL URL from container.

    Converts the sync URL to use asyncpg driver.
    Testcontainers returns postgresql+psycopg2:// format.
    """
    # Testcontainers uses psycopg2 by default, convert to asyncpg
    return postgres_url.replace(
        "postgresql+psycopg2://", "postgresql+asyncpg://"
    ).replace("postgresql://", "postgresql+asyncpg://")


@pytest_asyncio.fixture
async def e2e_db_session(async_postgres_url):
    """
    Function-scoped async database session with fresh tables.

    Each test gets:
    - Fresh database schema (tables dropped and recreated)
    - Isolated session that doesn't leak state between tests
    """
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    from app.models.base import Base

    engine = create_async_engine(async_postgres_url, echo=False)

    # Drop and recreate all tables for isolation
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with AsyncSessionLocal() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def e2e_client(async_postgres_url):
    """
    ASGI test client with real PostgreSQL backend.

    Provides an httpx AsyncClient connected to the FastAPI app,
    with database dependency overridden to use real PostgreSQL.
    """
    os.environ["IS_TEST"] = "True"

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    from app.core.database import get_db
    from app.main import app
    from app.models.base import Base

    engine = create_async_engine(async_postgres_url, echo=False)

    # Drop and recreate all tables for isolation
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    AsyncTestingSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with AsyncTestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://e2e-test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def e2e_superuser(e2e_client):
    """
    Create a superuser and return credentials + tokens.

    Returns dict with: email, password, tokens, user_id
    """
    from uuid import uuid4

    from app.crud.user import user as user_crud
    from app.schemas.users import UserCreate

    email = f"admin-{uuid4().hex[:8]}@example.com"
    password = "SuperAdmin123!"

    # Register via API first to get proper password hashing
    await e2e_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Super",
            "last_name": "Admin",
        },
    )

    # Login to get tokens
    login_resp = await e2e_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    tokens = login_resp.json()

    # Now we need to make this user a superuser directly via SQL
    # Get the db session from the client's override
    from sqlalchemy import text

    from app.core.database import get_db
    from app.main import app

    async for db in app.dependency_overrides[get_db]():
        # Update user to be superuser
        await db.execute(
            text("UPDATE users SET is_superuser = true WHERE email = :email"),
            {"email": email},
        )
        await db.commit()

        # Get user ID
        result = await db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        )
        user_id = str(result.scalar())
        break

    return {
        "email": email,
        "password": password,
        "tokens": tokens,
        "user_id": user_id,
    }


@pytest_asyncio.fixture
async def e2e_org_with_members(e2e_client, e2e_superuser):
    """
    Create an organization with owner and member.

    Returns dict with: org_id, org_slug, owner (tokens), member (tokens)
    """
    from uuid import uuid4

    # Create organization via admin API
    org_name = f"Test Org {uuid4().hex[:8]}"
    org_slug = f"test-org-{uuid4().hex[:8]}"

    create_resp = await e2e_client.post(
        "/api/v1/admin/organizations",
        headers={"Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"},
        json={
            "name": org_name,
            "slug": org_slug,
            "description": "Test organization for E2E tests",
        },
    )
    org_data = create_resp.json()
    org_id = org_data["id"]

    # Create owner user
    owner_email = f"owner-{uuid4().hex[:8]}@example.com"
    owner_password = "OwnerPass123!"

    await e2e_client.post(
        "/api/v1/auth/register",
        json={
            "email": owner_email,
            "password": owner_password,
            "first_name": "Org",
            "last_name": "Owner",
        },
    )
    owner_login = await e2e_client.post(
        "/api/v1/auth/login",
        json={"email": owner_email, "password": owner_password},
    )
    owner_tokens = owner_login.json()

    # Get owner user ID
    owner_me = await e2e_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {owner_tokens['access_token']}"},
    )
    owner_id = owner_me.json()["id"]

    # Add owner to organization as owner role
    await e2e_client.post(
        f"/api/v1/admin/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"},
        json={"user_id": owner_id, "role": "owner"},
    )

    # Create member user
    member_email = f"member-{uuid4().hex[:8]}@example.com"
    member_password = "MemberPass123!"

    await e2e_client.post(
        "/api/v1/auth/register",
        json={
            "email": member_email,
            "password": member_password,
            "first_name": "Org",
            "last_name": "Member",
        },
    )
    member_login = await e2e_client.post(
        "/api/v1/auth/login",
        json={"email": member_email, "password": member_password},
    )
    member_tokens = member_login.json()

    # Get member user ID
    member_me = await e2e_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {member_tokens['access_token']}"},
    )
    member_id = member_me.json()["id"]

    # Add member to organization
    await e2e_client.post(
        f"/api/v1/admin/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"},
        json={"user_id": member_id, "role": "member"},
    )

    return {
        "org_id": org_id,
        "org_slug": org_slug,
        "org_name": org_name,
        "owner": {"email": owner_email, "tokens": owner_tokens, "user_id": owner_id},
        "member": {
            "email": member_email,
            "tokens": member_tokens,
            "user_id": member_id,
        },
    }
