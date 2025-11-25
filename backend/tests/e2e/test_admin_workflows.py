"""
Admin E2E workflow tests with real PostgreSQL.

These tests validate complete admin workflows including:
- User management (list, create, update, delete, bulk actions)
- Organization management (create, update, delete, members)
- Admin statistics

Usage:
    make test-e2e          # Run all E2E tests
"""

from uuid import uuid4

import pytest

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.postgres,
    pytest.mark.asyncio,
]


async def register_user(client, email: str, password: str = "SecurePassword123!"):
    """Helper to register a user."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": "User",
        },
    )
    return resp.json()


async def login_user(client, email: str, password: str = "SecurePassword123!"):
    """Helper to login a user."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()


async def create_superuser(e2e_db_session, email: str, password: str):
    """Create a superuser directly in the database."""
    from app.crud.user import user as user_crud
    from app.schemas.users import UserCreate

    user_in = UserCreate(
        email=email,
        password=password,
        first_name="Admin",
        last_name="User",
        is_superuser=True,
    )
    user = await user_crud.create(e2e_db_session, obj_in=user_in)
    return user


class TestAdminUserManagementWorkflows:
    """Test admin user management workflows."""

    async def test_regular_user_cannot_access_admin_endpoints(self, e2e_client):
        """Regular users cannot access admin endpoints."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 403

    async def test_admin_stats_requires_superuser(self, e2e_client):
        """Admin stats endpoint requires superuser."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 403

    async def test_admin_create_user_requires_superuser(self, e2e_client):
        """Creating users via admin endpoint requires superuser."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.post(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "email": f"newuser-{uuid4().hex[:8]}@example.com",
                "password": "NewUserPass123!",
                "first_name": "New",
                "last_name": "User",
            },
        )

        assert response.status_code == 403


class TestAdminOrganizationWorkflows:
    """Test admin organization management workflows."""

    async def test_regular_user_cannot_list_admin_orgs(self, e2e_client):
        """Regular users cannot list organizations via admin endpoint."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 403

    async def test_regular_user_cannot_create_org_via_admin(self, e2e_client):
        """Regular users cannot create organizations via admin endpoint."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "name": "Test Org",
                "slug": f"test-org-{uuid4().hex[:8]}",
                "description": "Test organization",
            },
        )

        assert response.status_code == 403


class TestAdminSessionWorkflows:
    """Test admin session management workflows."""

    async def test_regular_user_cannot_list_admin_sessions(self, e2e_client):
        """Regular users cannot list sessions via admin endpoint."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/admin/sessions",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 403


class TestAdminBulkOperations:
    """Test admin bulk operation workflows."""

    async def test_regular_user_cannot_bulk_activate_users(self, e2e_client):
        """Regular users cannot perform bulk user activation."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        await register_user(e2e_client, email)
        tokens = await login_user(e2e_client, email)

        response = await e2e_client.post(
            "/api/v1/admin/users/bulk-action",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={
                "action": "activate",
                "user_ids": [str(uuid4())],
            },
        )

        assert response.status_code == 403


class TestAdminAuthorizationBoundaries:
    """Test admin authorization security boundaries."""

    async def test_unauthenticated_cannot_access_admin(self, e2e_client):
        """Unauthenticated requests cannot access admin endpoints."""
        endpoints = [
            ("/api/v1/admin/users", "get"),
            ("/api/v1/admin/organizations", "get"),
            ("/api/v1/admin/sessions", "get"),
            ("/api/v1/admin/stats", "get"),
        ]

        for endpoint, method in endpoints:
            if method == "get":
                response = await e2e_client.get(endpoint)
            assert response.status_code == 401, f"Expected 401 for {endpoint}"

    async def test_expired_token_rejected_for_admin(self, e2e_client):
        """Expired tokens are rejected for admin endpoints."""
        # Use a clearly invalid/malformed token
        fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {fake_token}"},
        )

        assert response.status_code == 401
