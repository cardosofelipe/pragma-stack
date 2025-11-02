# tests/api/test_permissions.py
"""
Tests for permission dependencies - CRITICAL SECURITY PATHS.

These tests ensure superusers can bypass organization checks correctly,
and that regular users are properly blocked.
"""
import pytest
import pytest_asyncio
from fastapi import status
from uuid import uuid4

from app.models.organization import Organization
from app.models.user import User
from app.models.user_organization import UserOrganization, OrganizationRole
from app.core.auth import get_password_hash


@pytest_asyncio.fixture
async def superuser_token(client, async_test_superuser):
    """Get access token for superuser."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "superuser@example.com",
            "password": "SuperPassword123!"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def regular_user_token(client, async_test_user):
    """Get access token for regular user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "TestPassword123!"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def test_org_no_members(async_test_db):
    """Create a test organization with NO members."""
    test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        org = Organization(
            name="No Members Org",
            slug="no-members-org",
            description="Test org with no members"
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)
        return org


@pytest_asyncio.fixture
async def test_org_with_member(async_test_db, async_test_user):
    """Create a test organization with async_test_user as member (not admin)."""
    test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        org = Organization(
            name="Member Only Org",
            slug="member-only-org",
            description="Test org where user is just a member"
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)

        # Add user as MEMBER (not admin/owner)
        membership = UserOrganization(
            user_id=async_test_user.id,
            organization_id=org.id,
            role=OrganizationRole.MEMBER,
            is_active=True
        )
        session.add(membership)
        await session.commit()

        return org


# ===== CRITICAL SECURITY TESTS: Superuser Bypass =====

class TestSuperuserBypass:
    """
    CRITICAL: Test that superusers can bypass organization checks.

    Missing coverage lines: 99, 154-155, 175
    These are critical security paths that MUST work correctly.
    """

    @pytest.mark.asyncio
    async def test_superuser_can_access_org_not_member_of(
        self,
        client,
        superuser_token,
        test_org_no_members
    ):
        """
        CRITICAL: Superuser should bypass membership check (covers line 175).

        Bug scenario: If this fails, superusers can't manage orgs they're not members of.
        """
        response = await client.get(
            f"/api/v1/organizations/{test_org_no_members.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        # Superuser should succeed even though they're not a member
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(test_org_no_members.id)

    @pytest.mark.asyncio
    async def test_regular_user_cannot_access_org_not_member_of(
        self,
        client,
        regular_user_token,
        test_org_no_members
    ):
        """Regular user should be blocked from org they're not a member of."""
        response = await client.get(
            f"/api/v1/organizations/{test_org_no_members.id}",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )

        # Regular user should fail permission check
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_superuser_can_update_org_not_admin_of(
        self,
        client,
        superuser_token,
        test_org_no_members
    ):
        """
        CRITICAL: Superuser should bypass admin check (covers line 99).

        Bug scenario: If this fails, superusers can't manage orgs.
        """
        response = await client.put(
            f"/api/v1/organizations/{test_org_no_members.id}",
            json={"name": "Updated by Superuser"},
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        # Superuser should succeed in updating org
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated by Superuser"

    @pytest.mark.asyncio
    async def test_regular_member_cannot_update_org(
        self,
        client,
        regular_user_token,
        test_org_with_member
    ):
        """Regular member (not admin) should NOT be able to update org."""
        response = await client.put(
            f"/api/v1/organizations/{test_org_with_member.id}",
            json={"name": "Should Fail"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )

        # Member should fail - need admin or owner role
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_superuser_can_list_org_members_not_member_of(
        self,
        client,
        superuser_token,
        test_org_no_members
    ):
        """CRITICAL: Superuser should bypass membership check to list members."""
        response = await client.get(
            f"/api/v1/organizations/{test_org_no_members.id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        # Superuser should succeed
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data


# ===== Edge Cases and Security Tests =====

class TestPermissionEdgeCases:
    """Test edge cases in permission system."""

    @pytest.mark.asyncio
    async def test_inactive_user_blocked(self, client, async_test_db):
        """Test that inactive users are blocked."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive user
        async with AsyncTestingSessionLocal() as session:
            user = User(
                id=uuid4(),
                email="inactive@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="Inactive",
                last_name="User",
                is_active=False  # INACTIVE
            )
            session.add(user)
            await session.commit()

        # Try to login (should work - auth checks active status separately)
        # But accessing protected endpoints should fail
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@example.com", "password": "TestPassword123!"}
        )

        # Login might fail for inactive users depending on auth implementation
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]

            # Try to access protected endpoint
            response = await client.get(
                "/api/v1/users/me",
                headers={"Authorization": f"Bearer {token}"}
            )

            # Should be blocked
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    @pytest.mark.asyncio
    async def test_nonexistent_organization_returns_403_not_404(
        self,
        client,
        regular_user_token
    ):
        """
        Test that accessing nonexistent org returns 403, not 404.

        This is correct behavior - don't leak info about org existence.
        The permission check runs BEFORE the org lookup, so if user
        is not a member, they get 403 regardless of org existence.
        """
        fake_org_id = uuid4()
        response = await client.get(
            f"/api/v1/organizations/{fake_org_id}",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )

        # Should get 403 (not a member), not 404 (doesn't exist)
        # This prevents leaking information about org existence
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ===== Admin Role Tests =====

class TestAdminRolePermissions:
    """Test admin role can perform admin actions."""

    @pytest_asyncio.fixture
    async def test_org_with_admin(self, async_test_db, async_test_user):
        """Create org where user is ADMIN."""
        test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            org = Organization(
                name="Admin Org",
                slug="admin-org"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)

            membership = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.ADMIN,
                is_active=True
            )
            session.add(membership)
            await session.commit()

            return org

    @pytest.mark.asyncio
    async def test_admin_can_update_org(
        self,
        client,
        regular_user_token,
        test_org_with_admin
    ):
        """Admin should be able to update organization."""
        response = await client.put(
            f"/api/v1/organizations/{test_org_with_admin.id}",
            json={"name": "Updated by Admin"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated by Admin"
