# tests/api/test_organizations.py
"""
Tests for organization routes (user endpoints).

These test the routes in app/api/routes/organizations.py which allow
users to view and manage organizations they belong to.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import status

from app.core.auth import get_password_hash
from app.models.organization import Organization
from app.models.user import User
from app.models.user_organization import OrganizationRole, UserOrganization


@pytest_asyncio.fixture
async def user_token(client, async_test_user):
    """Get access token for regular user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "TestPassword123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def second_user(async_test_db):
    """Create a second test user."""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid4(),
            email="seconduser@example.com",
            password_hash=get_password_hash("TestPassword123!"),
            first_name="Second",
            last_name="User",
            phone_number="+1234567891",
            is_active=True,
            is_superuser=False,
            preferences=None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def test_org_with_user_member(async_test_db, async_test_user):
    """Create a test organization with async_test_user as a member."""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        org = Organization(
            name="Member Org",
            slug="member-org",
            description="Test organization where user is a member",
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)

        # Add user as member
        membership = UserOrganization(
            user_id=async_test_user.id,
            organization_id=org.id,
            role=OrganizationRole.MEMBER,
            is_active=True,
        )
        session.add(membership)
        await session.commit()

        return org


@pytest_asyncio.fixture
async def test_org_with_user_admin(async_test_db, async_test_user):
    """Create a test organization with async_test_user as an admin."""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        org = Organization(
            name="Admin Org",
            slug="admin-org",
            description="Test organization where user is an admin",
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)

        # Add user as admin
        membership = UserOrganization(
            user_id=async_test_user.id,
            organization_id=org.id,
            role=OrganizationRole.ADMIN,
            is_active=True,
        )
        session.add(membership)
        await session.commit()

        return org


@pytest_asyncio.fixture
async def test_org_with_user_owner(async_test_db, async_test_user):
    """Create a test organization with async_test_user as owner."""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        org = Organization(
            name="Owner Org",
            slug="owner-org",
            description="Test organization where user is owner",
        )
        session.add(org)
        await session.commit()
        await session.refresh(org)

        # Add user as owner
        membership = UserOrganization(
            user_id=async_test_user.id,
            organization_id=org.id,
            role=OrganizationRole.OWNER,
            is_active=True,
        )
        session.add(membership)
        await session.commit()

        return org


# ===== GET /api/v1/organizations/me =====


class TestGetMyOrganizations:
    """Tests for GET /api/v1/organizations/me endpoint."""

    @pytest.mark.asyncio
    async def test_get_my_organizations_success(
        self, client, user_token, test_org_with_user_member, test_org_with_user_admin
    ):
        """Test successfully getting user's organizations (covers lines 54-79)."""
        response = await client.get(
            "/api/v1/organizations/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least the two test orgs

        # Verify structure
        for org in data:
            assert "id" in org
            assert "name" in org
            assert "slug" in org
            assert "member_count" in org

    @pytest.mark.asyncio
    async def test_get_my_organizations_filter_active(
        self, client, async_test_db, async_test_user, user_token
    ):
        """Test filtering organizations by active status."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create active org
        async with AsyncTestingSessionLocal() as session:
            active_org = Organization(
                name="Active Org", slug="active-org-filter", is_active=True
            )
            session.add(active_org)
            await session.commit()
            await session.refresh(active_org)

            # Add user membership
            membership = UserOrganization(
                user_id=async_test_user.id,
                organization_id=active_org.id,
                role=OrganizationRole.MEMBER,
                is_active=True,
            )
            session.add(membership)
            await session.commit()

        response = await client.get(
            "/api/v1/organizations/me?is_active=true",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_my_organizations_empty(self, client, async_test_db):
        """Test getting organizations when user has none."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create user with no org memberships
        async with AsyncTestingSessionLocal() as session:
            user = User(
                id=uuid4(),
                email="noorg@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="No",
                last_name="Org",
                is_active=True,
            )
            session.add(user)
            await session.commit()

        # Login to get token
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "noorg@example.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/organizations/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []


# ===== GET /api/v1/organizations/{organization_id} =====


class TestGetOrganization:
    """Tests for GET /api/v1/organizations/{organization_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_organization_success(
        self, client, user_token, test_org_with_user_member
    ):
        """Test successfully getting organization details (covers lines 103-122)."""
        response = await client.get(
            f"/api/v1/organizations/{test_org_with_user_member.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(test_org_with_user_member.id)
        assert data["name"] == "Member Org"
        assert data["slug"] == "member-org"
        assert "member_count" in data

    @pytest.mark.asyncio
    async def test_get_organization_not_found(self, client, user_token):
        """Test getting nonexistent organization returns 403 (permission check happens first)."""
        fake_org_id = uuid4()
        response = await client.get(
            f"/api/v1/organizations/{fake_org_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        # Permission dependency checks membership before endpoint logic
        # So non-existent org returns 403 (not a member) instead of 404
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "errors" in data or "detail" in data

    @pytest.mark.asyncio
    async def test_get_organization_not_member(
        self, client, async_test_db, async_test_user
    ):
        """Test getting organization where user is not a member fails."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create org without adding user
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Not Member Org", slug="not-member-org")
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        # Login as user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        response = await client.get(
            f"/api/v1/organizations/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should fail permission check
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ===== GET /api/v1/organizations/{organization_id}/members =====


class TestGetOrganizationMembers:
    """Tests for GET /api/v1/organizations/{organization_id}/members endpoint."""

    @pytest.mark.asyncio
    async def test_get_organization_members_success(
        self,
        client,
        async_test_db,
        async_test_user,
        second_user,
        user_token,
        test_org_with_user_member,
    ):
        """Test successfully getting organization members (covers lines 150-168)."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Add second user to org
        async with AsyncTestingSessionLocal() as session:
            membership = UserOrganization(
                user_id=second_user.id,
                organization_id=test_org_with_user_member.id,
                role=OrganizationRole.MEMBER,
                is_active=True,
            )
            session.add(membership)
            await session.commit()

        response = await client.get(
            f"/api/v1/organizations/{test_org_with_user_member.id}/members",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert len(data["data"]) >= 2  # At least the two users

    @pytest.mark.asyncio
    async def test_get_organization_members_with_pagination(
        self, client, user_token, test_org_with_user_member
    ):
        """Test pagination parameters."""
        response = await client.get(
            f"/api/v1/organizations/{test_org_with_user_member.id}/members?page=1&limit=10",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["pagination"]["page"] == 1
        assert "page_size" in data["pagination"]  # Uses page_size, not limit
        assert "total" in data["pagination"]

    @pytest.mark.asyncio
    async def test_get_organization_members_filter_active(
        self,
        client,
        async_test_db,
        async_test_user,
        second_user,
        user_token,
        test_org_with_user_member,
    ):
        """Test filtering members by active status."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Add second user as inactive member
        async with AsyncTestingSessionLocal() as session:
            membership = UserOrganization(
                user_id=second_user.id,
                organization_id=test_org_with_user_member.id,
                role=OrganizationRole.MEMBER,
                is_active=False,
            )
            session.add(membership)
            await session.commit()

        # Filter for active only
        response = await client.get(
            f"/api/v1/organizations/{test_org_with_user_member.id}/members?is_active=true",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should only see active members
        for member in data["data"]:
            assert member["is_active"] is True


# ===== PUT /api/v1/organizations/{organization_id} =====


class TestUpdateOrganization:
    """Tests for PUT /api/v1/organizations/{organization_id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_organization_as_admin_success(
        self, client, async_test_user, test_org_with_user_admin
    ):
        """Test successfully updating organization as admin (covers lines 193-215)."""
        # Login as admin user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        admin_token = login_response.json()["access_token"]

        response = await client.put(
            f"/api/v1/organizations/{test_org_with_user_admin.id}",
            json={"name": "Updated Admin Org", "description": "Updated description"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Admin Org"
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_organization_as_owner_success(
        self, client, async_test_user, test_org_with_user_owner
    ):
        """Test successfully updating organization as owner."""
        # Login as owner user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        owner_token = login_response.json()["access_token"]

        response = await client.put(
            f"/api/v1/organizations/{test_org_with_user_owner.id}",
            json={"name": "Updated Owner Org"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Owner Org"

    @pytest.mark.asyncio
    async def test_update_organization_as_member_fails(
        self, client, user_token, test_org_with_user_member
    ):
        """Test updating organization as regular member fails."""
        response = await client.put(
            f"/api/v1/organizations/{test_org_with_user_member.id}",
            json={"name": "Should Fail"},
            headers={"Authorization": f"Bearer {user_token}"},
        )

        # Should fail permission check (need admin or owner)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_update_organization_not_found(
        self, client, test_org_with_user_admin
    ):
        """Test updating nonexistent organization returns 403 (permission check first)."""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        admin_token = login_response.json()["access_token"]

        fake_org_id = uuid4()
        response = await client.put(
            f"/api/v1/organizations/{fake_org_id}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Permission dependency checks admin role before endpoint logic
        # So non-existent org returns 403 (not an admin) instead of 404
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "errors" in data or "detail" in data


# ===== Authentication Tests =====


class TestOrganizationAuthentication:
    """Test authentication requirements for organization endpoints."""

    @pytest.mark.asyncio
    async def test_get_my_organizations_unauthenticated(self, client):
        """Test unauthenticated access to /me fails."""
        response = await client.get("/api/v1/organizations/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_organization_unauthenticated(self, client):
        """Test unauthenticated access to organization details fails."""
        fake_id = uuid4()
        response = await client.get(f"/api/v1/organizations/{fake_id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_members_unauthenticated(self, client):
        """Test unauthenticated access to members list fails."""
        fake_id = uuid4()
        response = await client.get(f"/api/v1/organizations/{fake_id}/members")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_update_organization_unauthenticated(self, client):
        """Test unauthenticated access to update fails."""
        fake_id = uuid4()
        response = await client.put(
            f"/api/v1/organizations/{fake_id}", json={"name": "Test"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ===== Exception Handler Tests (Database Error Scenarios) =====


class TestOrganizationExceptionHandlers:
    """
    Test exception handlers in organization endpoints.

    These tests use mocks to trigger database errors and verify
    proper error handling. Covers lines: 81-83, 124-128, 170-172, 217-221
    """

    @pytest.mark.asyncio
    async def test_get_my_organizations_database_error(
        self, client, user_token, test_org_with_user_member
    ):
        """Test generic exception handler in get_my_organizations (covers lines 81-83)."""
        with patch(
            "app.api.routes.organizations.organization_service.get_user_organizations_with_details",
            side_effect=Exception("Database connection lost"),
        ):
            # The exception handler logs and re-raises, so we expect the exception
            # to propagate (which proves the handler executed)
            with pytest.raises(Exception, match="Database connection lost"):
                await client.get(
                    "/api/v1/organizations/me",
                    headers={"Authorization": f"Bearer {user_token}"},
                )

    @pytest.mark.asyncio
    async def test_get_organization_database_error(
        self, client, user_token, test_org_with_user_member
    ):
        """Test generic exception handler in get_organization (covers lines 124-128)."""
        with patch(
            "app.api.routes.organizations.organization_service.get_organization",
            side_effect=Exception("Database timeout"),
        ):
            with pytest.raises(Exception, match="Database timeout"):
                await client.get(
                    f"/api/v1/organizations/{test_org_with_user_member.id}",
                    headers={"Authorization": f"Bearer {user_token}"},
                )

    @pytest.mark.asyncio
    async def test_get_organization_members_database_error(
        self, client, user_token, test_org_with_user_member
    ):
        """Test generic exception handler in get_organization_members (covers lines 170-172)."""
        with patch(
            "app.api.routes.organizations.organization_service.get_organization_members",
            side_effect=Exception("Connection pool exhausted"),
        ):
            with pytest.raises(Exception, match="Connection pool exhausted"):
                await client.get(
                    f"/api/v1/organizations/{test_org_with_user_member.id}/members",
                    headers={"Authorization": f"Bearer {user_token}"},
                )

    @pytest.mark.asyncio
    async def test_update_organization_database_error(
        self, client, async_test_user, test_org_with_user_admin
    ):
        """Test generic exception handler in update_organization (covers lines 217-221)."""
        # Login as admin user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "TestPassword123!"},
        )
        admin_token = login_response.json()["access_token"]

        with patch(
            "app.api.routes.organizations.organization_service.get_organization",
            return_value=test_org_with_user_admin,
        ):
            with patch(
                "app.api.routes.organizations.organization_service.update_organization",
                side_effect=Exception("Write lock timeout"),
            ):
                with pytest.raises(Exception, match="Write lock timeout"):
                    await client.put(
                        f"/api/v1/organizations/{test_org_with_user_admin.id}",
                        json={"name": "Should Fail"},
                        headers={"Authorization": f"Bearer {admin_token}"},
                    )
