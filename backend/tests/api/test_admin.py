# tests/api/test_admin.py
"""
Comprehensive tests for admin endpoints.
"""
import pytest
import pytest_asyncio
from uuid import uuid4
from fastapi import status

from app.models.organization import Organization
from app.models.user_organization import UserOrganization, OrganizationRole


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
    assert response.status_code == 200, f"Login failed: {response.json()}"
    return response.json()["access_token"]


# ===== USER MANAGEMENT TESTS =====

class TestAdminListUsers:
    """Tests for GET /admin/users endpoint."""

    @pytest.mark.asyncio
    async def test_admin_list_users_success(self, client, superuser_token):
        """Test successfully listing users as admin."""
        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_admin_list_users_with_filters(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test listing users with filters."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive user
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            inactive_user = User(
                email="inactive@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="Inactive",
                last_name="User",
                is_active=False
            )
            session.add(inactive_user)
            await session.commit()

        response = await client.get(
            "/api/v1/admin/users?is_active=false",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) >= 1

    @pytest.mark.asyncio
    async def test_admin_list_users_with_search(self, client, async_test_superuser, superuser_token):
        """Test searching users."""
        response = await client.get(
            "/api/v1/admin/users?search=superuser",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    @pytest.mark.asyncio
    async def test_admin_list_users_unauthorized(self, client, async_test_user):
        """Test non-admin cannot list users."""
        # Login as regular user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": async_test_user.email, "password": "TestPassword123!"}
        )
        token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminCreateUser:
    """Tests for POST /admin/users endpoint."""

    @pytest.mark.asyncio
    async def test_admin_create_user_success(self, client, async_test_superuser, superuser_token):
        """Test successfully creating a user as admin."""
        response = await client.post(
            "/api/v1/admin/users",
            json={
                "email": "newadminuser@example.com",
                "password": "SecurePassword123!",
                "first_name": "New",
                "last_name": "User"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newadminuser@example.com"

    @pytest.mark.asyncio
    async def test_admin_create_user_duplicate_email(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test creating user with duplicate email fails."""
        response = await client.post(
            "/api/v1/admin/users",
            json={
                "email": async_test_user.email,
                "password": "SecurePassword123!",
                "first_name": "Duplicate",
                "last_name": "User"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminGetUser:
    """Tests for GET /admin/users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_get_user_success(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test successfully getting user details."""
        response = await client.get(
            f"/api/v1/admin/users/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(async_test_user.id)
        assert data["email"] == async_test_user.email

    @pytest.mark.asyncio
    async def test_admin_get_user_not_found(self, client, async_test_superuser, superuser_token):
        """Test getting non-existent user."""
        response = await client.get(
            f"/api/v1/admin/users/{uuid4()}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminUpdateUser:
    """Tests for PUT /admin/users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_update_user_success(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test successfully updating a user."""
        response = await client.put(
            f"/api/v1/admin/users/{async_test_user.id}",
            json={"first_name": "Updated"},
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "Updated"

    @pytest.mark.asyncio
    async def test_admin_update_user_not_found(self, client, async_test_superuser, superuser_token):
        """Test updating non-existent user."""
        response = await client.put(
            f"/api/v1/admin/users/{uuid4()}",
            json={"first_name": "Updated"},
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminDeleteUser:
    """Tests for DELETE /admin/users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_delete_user_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully deleting a user."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create user to delete
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            user_to_delete = User(
                email="todelete@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="To",
                last_name="Delete"
            )
            session.add(user_to_delete)
            await session.commit()
            user_id = user_to_delete.id

        response = await client.delete(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_delete_user_not_found(self, client, async_test_superuser, superuser_token):
        """Test deleting non-existent user."""
        response = await client.delete(
            f"/api/v1/admin/users/{uuid4()}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_admin_delete_self_forbidden(self, client, async_test_superuser, superuser_token):
        """Test admin cannot delete their own account."""
        response = await client.delete(
            f"/api/v1/admin/users/{async_test_superuser.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminActivateUser:
    """Tests for POST /admin/users/{user_id}/activate endpoint."""

    @pytest.mark.asyncio
    async def test_admin_activate_user_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully activating a user."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive user
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            inactive_user = User(
                email="toactivate@example.com",
                password_hash=get_password_hash("TestPassword123!"),
                first_name="To",
                last_name="Activate",
                is_active=False
            )
            session.add(inactive_user)
            await session.commit()
            user_id = inactive_user.id

        response = await client.post(
            f"/api/v1/admin/users/{user_id}/activate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_activate_user_not_found(self, client, async_test_superuser, superuser_token):
        """Test activating non-existent user."""
        response = await client.post(
            f"/api/v1/admin/users/{uuid4()}/activate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminDeactivateUser:
    """Tests for POST /admin/users/{user_id}/deactivate endpoint."""

    @pytest.mark.asyncio
    async def test_admin_deactivate_user_success(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test successfully deactivating a user."""
        response = await client.post(
            f"/api/v1/admin/users/{async_test_user.id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_deactivate_user_not_found(self, client, async_test_superuser, superuser_token):
        """Test deactivating non-existent user."""
        response = await client.post(
            f"/api/v1/admin/users/{uuid4()}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_admin_deactivate_self_forbidden(self, client, async_test_superuser, superuser_token):
        """Test admin cannot deactivate their own account."""
        response = await client.post(
            f"/api/v1/admin/users/{async_test_superuser.id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminBulkUserAction:
    """Tests for POST /admin/users/bulk-action endpoint."""

    @pytest.mark.asyncio
    async def test_admin_bulk_activate_users(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test bulk activating users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            for i in range(3):
                user = User(
                    email=f"bulk{i}@example.com",
                    password_hash=get_password_hash("TestPassword123!"),
                    first_name=f"Bulk{i}",
                    last_name="User",
                    is_active=False
                )
                session.add(user)
                await session.flush()
                user_ids.append(str(user.id))
            await session.commit()

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            json={
                "action": "activate",
                "user_ids": user_ids
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] == 3

    @pytest.mark.asyncio
    async def test_admin_bulk_deactivate_users(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test bulk deactivating users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create active users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            for i in range(2):
                user = User(
                    email=f"deactivate{i}@example.com",
                    password_hash=get_password_hash("TestPassword123!"),
                    first_name=f"Deactivate{i}",
                    last_name="User",
                    is_active=True
                )
                session.add(user)
                await session.flush()
                user_ids.append(str(user.id))
            await session.commit()

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            json={
                "action": "deactivate",
                "user_ids": user_ids
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] == 2

    @pytest.mark.asyncio
    async def test_admin_bulk_delete_users(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test bulk deleting users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create users to delete
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash
            for i in range(2):
                user = User(
                    email=f"bulkdelete{i}@example.com",
                    password_hash=get_password_hash("TestPassword123!"),
                    first_name=f"BulkDelete{i}",
                    last_name="User"
                )
                session.add(user)
                await session.flush()
                user_ids.append(str(user.id))
            await session.commit()

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            json={
                "action": "delete",
                "user_ids": user_ids
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] >= 0


# ===== ORGANIZATION MANAGEMENT TESTS =====

class TestAdminListOrganizations:
    """Tests for GET /admin/organizations endpoint."""

    @pytest.mark.asyncio
    async def test_admin_list_organizations_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully listing organizations."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

        response = await client.get(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    @pytest.mark.asyncio
    async def test_admin_list_organizations_with_search(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test searching organizations."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Searchable Org", slug="searchable-org")
            session.add(org)
            await session.commit()

        response = await client.get(
            "/api/v1/admin/organizations?search=Searchable",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK


class TestAdminCreateOrganization:
    """Tests for POST /admin/organizations endpoint."""

    @pytest.mark.asyncio
    async def test_admin_create_organization_success(self, client, async_test_superuser, superuser_token):
        """Test successfully creating an organization."""
        response = await client.post(
            "/api/v1/admin/organizations",
            json={
                "name": "New Admin Org",
                "slug": "new-admin-org",
                "description": "Created by admin"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "New Admin Org"
        assert data["member_count"] == 0

    @pytest.mark.asyncio
    async def test_admin_create_organization_duplicate_slug(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test creating organization with duplicate slug fails."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create existing organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Existing", slug="duplicate-slug")
            session.add(org)
            await session.commit()

        response = await client.post(
            "/api/v1/admin/organizations",
            json={
                "name": "Duplicate",
                "slug": "duplicate-slug"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminGetOrganization:
    """Tests for GET /admin/organizations/{org_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_get_organization_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully getting organization details."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Get Test Org", slug="get-test-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.get(
            f"/api/v1/admin/organizations/{org_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Get Test Org"

    @pytest.mark.asyncio
    async def test_admin_get_organization_not_found(self, client, async_test_superuser, superuser_token):
        """Test getting non-existent organization."""
        response = await client.get(
            f"/api/v1/admin/organizations/{uuid4()}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminUpdateOrganization:
    """Tests for PUT /admin/organizations/{org_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_update_organization_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully updating an organization."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Update Test", slug="update-test")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.put(
            f"/api/v1/admin/organizations/{org_id}",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_admin_update_organization_not_found(self, client, async_test_superuser, superuser_token):
        """Test updating non-existent organization."""
        response = await client.put(
            f"/api/v1/admin/organizations/{uuid4()}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminDeleteOrganization:
    """Tests for DELETE /admin/organizations/{org_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_delete_organization_success(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test successfully deleting an organization."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Delete Test", slug="delete-test")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.delete(
            f"/api/v1/admin/organizations/{org_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_delete_organization_not_found(self, client, async_test_superuser, superuser_token):
        """Test deleting non-existent organization."""
        response = await client.delete(
            f"/api/v1/admin/organizations/{uuid4()}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminListOrganizationMembers:
    """Tests for GET /admin/organizations/{org_id}/members endpoint."""

    @pytest.mark.asyncio
    async def test_admin_list_organization_members_success(self, client, async_test_superuser, async_test_db, async_test_user, superuser_token):
        """Test successfully listing organization members."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization with member
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Members Test", slug="members-test")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        response = await client.get(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 1

    @pytest.mark.asyncio
    async def test_admin_list_organization_members_not_found(self, client, async_test_superuser, superuser_token):
        """Test listing members of non-existent organization."""
        response = await client.get(
            f"/api/v1/admin/organizations/{uuid4()}/members",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminAddOrganizationMember:
    """Tests for POST /admin/organizations/{org_id}/members endpoint."""

    @pytest.mark.asyncio
    async def test_admin_add_organization_member_success(self, client, async_test_superuser, async_test_db, async_test_user, superuser_token):
        """Test successfully adding a member to organization."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Add Member Test", slug="add-member-test")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            json={
                "user_id": str(async_test_user.id),
                "role": "member"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_add_organization_member_already_exists(self, client, async_test_superuser, async_test_db, async_test_user, superuser_token):
        """Test adding member who is already a member."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization with existing member
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Existing Member", slug="existing-member")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        response = await client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            json={
                "user_id": str(async_test_user.id),
                "role": "member"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_409_CONFLICT

    @pytest.mark.asyncio
    async def test_admin_add_organization_member_org_not_found(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test adding member to non-existent organization."""
        response = await client.post(
            f"/api/v1/admin/organizations/{uuid4()}/members",
            json={
                "user_id": str(async_test_user.id),
                "role": "member"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_admin_add_organization_member_user_not_found(self, client, async_test_superuser, async_test_db, superuser_token):
        """Test adding non-existent user to organization."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="User Not Found", slug="user-not-found")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            json={
                "user_id": str(uuid4()),
                "role": "member"
            },
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminRemoveOrganizationMember:
    """Tests for DELETE /admin/organizations/{org_id}/members/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_admin_remove_organization_member_success(self, client, async_test_superuser, async_test_db, async_test_user, superuser_token):
        """Test successfully removing a member from organization."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization with member
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Remove Member", slug="remove-member")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        response = await client.delete(
            f"/api/v1/admin/organizations/{org_id}/members/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_admin_remove_organization_member_not_member(self, client, async_test_superuser, async_test_db, async_test_user, superuser_token):
        """Test removing user who is not a member."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization without member
        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="No Member", slug="no-member")
            session.add(org)
            await session.commit()
            org_id = org.id

        response = await client.delete(
            f"/api/v1/admin/organizations/{org_id}/members/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_admin_remove_organization_member_org_not_found(self, client, async_test_superuser, async_test_user, superuser_token):
        """Test removing member from non-existent organization."""
        response = await client.delete(
            f"/api/v1/admin/organizations/{uuid4()}/members/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
