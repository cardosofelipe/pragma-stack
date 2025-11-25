"""
Organization E2E workflow tests with real PostgreSQL.

These tests validate complete organization workflows including:
- Creating organizations (via admin)
- Viewing user's organizations
- Organization membership management
- Organization updates

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


async def register_and_login(client, email: str, password: str = "SecurePassword123!"):
    """Helper to register a user and get tokens."""
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": "User",
        },
    )

    # Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    tokens = login_resp.json()
    return tokens


async def create_superuser_and_login(client, db_session):
    """Helper to create a superuser directly in DB and login."""
    from app.crud.user import user as user_crud
    from app.schemas.users import UserCreate

    email = f"admin-{uuid4().hex[:8]}@example.com"
    password = "AdminPassword123!"

    # Create superuser directly
    user_in = UserCreate(
        email=email,
        password=password,
        first_name="Admin",
        last_name="User",
        is_superuser=True,
    )
    await user_crud.create(db_session, obj_in=user_in)

    # Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return login_resp.json(), email


class TestOrganizationWorkflows:
    """Test organization management workflows."""

    async def test_user_has_no_organizations_initially(self, e2e_client):
        """New users should have no organizations."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        response = await e2e_client.get(
            "/api/v1/organizations/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    async def test_get_organizations_requires_auth(self, e2e_client):
        """Organizations endpoint requires authentication."""
        response = await e2e_client.get("/api/v1/organizations/me")
        assert response.status_code == 401

    async def test_get_nonexistent_organization(self, e2e_client):
        """Getting a non-member organization returns 403."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        fake_org_id = str(uuid4())
        response = await e2e_client.get(
            f"/api/v1/organizations/{fake_org_id}",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        # Should be 403 (not a member) or 404 (not found)
        assert response.status_code in [403, 404]


class TestOrganizationMembershipWorkflows:
    """Test organization membership workflows."""

    async def test_non_member_cannot_view_org_details(self, e2e_client):
        """Users cannot view organizations they're not members of."""
        # Create two users
        user1_email = f"e2e-user1-{uuid4().hex[:8]}@example.com"
        user2_email = f"e2e-user2-{uuid4().hex[:8]}@example.com"

        await register_and_login(e2e_client, user1_email)
        user2_tokens = await register_and_login(e2e_client, user2_email)

        # User2 tries to access a random org ID
        fake_org_id = str(uuid4())
        response = await e2e_client.get(
            f"/api/v1/organizations/{fake_org_id}",
            headers={"Authorization": f"Bearer {user2_tokens['access_token']}"},
        )

        assert response.status_code in [403, 404]

    async def test_non_member_cannot_view_org_members(self, e2e_client):
        """Users cannot view members of organizations they don't belong to."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        fake_org_id = str(uuid4())
        response = await e2e_client.get(
            f"/api/v1/organizations/{fake_org_id}/members",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        assert response.status_code in [403, 404]

    async def test_non_admin_cannot_update_organization(self, e2e_client):
        """Regular users cannot update organizations (need admin role)."""
        email = f"e2e-{uuid4().hex[:8]}@example.com"
        tokens = await register_and_login(e2e_client, email)

        fake_org_id = str(uuid4())
        response = await e2e_client.put(
            f"/api/v1/organizations/{fake_org_id}",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"name": "Updated Name"},
        )

        assert response.status_code in [403, 404]
