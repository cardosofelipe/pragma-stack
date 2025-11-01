# tests/api/test_admin_error_handlers.py
"""
Tests for admin route exception handlers, error paths, and success paths.
Focus on code coverage of both error handling and normal operation branches.
"""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock
from fastapi import status
from uuid import uuid4
from app.models.user_organization import OrganizationRole


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


# ===== USER MANAGEMENT ERROR TESTS =====

class TestAdminListUsersFilters:
    """Test admin list users with various filters."""

    @pytest.mark.asyncio
    async def test_list_users_with_is_superuser_filter(self, client, superuser_token):
        """Test listing users with is_superuser filter (covers line 96)."""
        response = await client.get(
            "/api/v1/admin/users?is_superuser=true",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    @pytest.mark.asyncio
    async def test_list_users_database_error_propagates(self, client, superuser_token):
        """Test that database errors propagate correctly (covers line 118-120)."""
        with patch('app.api.routes.admin.user_crud.get_multi_with_total', side_effect=Exception("DB error")):
            with pytest.raises(Exception):
                await client.get(
                    "/api/v1/admin/users",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminCreateUserErrors:
    """Test admin create user error handling."""

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, client, async_test_user, superuser_token):
        """Test creating user with duplicate email (covers line 145-150)."""
        response = await client.post(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "email": async_test_user.email,
                "password": "NewPassword123!",
                "first_name": "Duplicate",
                "last_name": "User"
            }
        )

        # Should get error for duplicate email
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_user_unexpected_error_propagates(self, client, superuser_token):
        """Test unexpected errors during user creation (covers line 151-153)."""
        with patch('app.api.routes.admin.user_crud.create', side_effect=RuntimeError("Unexpected error")):
            with pytest.raises(RuntimeError):
                await client.post(
                    "/api/v1/admin/users",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={
                        "email": "newerror@example.com",
                        "password": "NewPassword123!",
                        "first_name": "New",
                        "last_name": "User"
                    }
                )


class TestAdminGetUserErrors:
    """Test admin get user error handling."""

    @pytest.mark.asyncio
    async def test_get_nonexistent_user(self, client, superuser_token):
        """Test getting a user that doesn't exist (covers line 170-175)."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/admin/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminUpdateUserErrors:
    """Test admin update user error handling."""

    @pytest.mark.asyncio
    async def test_update_nonexistent_user(self, client, superuser_token):
        """Test updating a user that doesn't exist (covers line 194-198)."""
        fake_id = uuid4()
        response = await client.put(
            f"/api/v1/admin/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"first_name": "Updated"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_user_unexpected_error(self, client, async_test_user, superuser_token):
        """Test unexpected errors during user update (covers line 206-208)."""
        with patch('app.api.routes.admin.user_crud.update', side_effect=RuntimeError("Update failed")):
            with pytest.raises(RuntimeError):
                await client.put(
                    f"/api/v1/admin/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={"first_name": "Updated"}
                )


class TestAdminDeleteUserErrors:
    """Test admin delete user error handling."""

    @pytest.mark.asyncio
    async def test_delete_nonexistent_user(self, client, superuser_token):
        """Test deleting a user that doesn't exist (covers line 226-230)."""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/admin/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_user_unexpected_error(self, client, async_test_user, superuser_token):
        """Test unexpected errors during user deletion (covers line 238-240)."""
        with patch('app.api.routes.admin.user_crud.soft_delete', side_effect=Exception("Delete failed")):
            with pytest.raises(Exception):
                await client.delete(
                    f"/api/v1/admin/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminActivateUserErrors:
    """Test admin activate user error handling."""

    @pytest.mark.asyncio
    async def test_activate_nonexistent_user(self, client, superuser_token):
        """Test activating a user that doesn't exist (covers line 270-274)."""
        fake_id = uuid4()
        response = await client.post(
            f"/api/v1/admin/users/{fake_id}/activate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_activate_user_unexpected_error(self, client, async_test_user, superuser_token):
        """Test unexpected errors during user activation (covers line 282-284)."""
        with patch('app.api.routes.admin.user_crud.update', side_effect=Exception("Activation failed")):
            with pytest.raises(Exception):
                await client.post(
                    f"/api/v1/admin/users/{async_test_user.id}/activate",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminDeactivateUserErrors:
    """Test admin deactivate user error handling."""

    @pytest.mark.asyncio
    async def test_deactivate_nonexistent_user(self, client, superuser_token):
        """Test deactivating a user that doesn't exist (covers line 306-310)."""
        fake_id = uuid4()
        response = await client.post(
            f"/api/v1/admin/users/{fake_id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_deactivate_self_forbidden(self, client, async_test_superuser, superuser_token):
        """Test that admin cannot deactivate themselves (covers line 319-323)."""
        response = await client.post(
            f"/api/v1/admin/users/{async_test_superuser.id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_deactivate_user_unexpected_error(self, client, async_test_user, superuser_token):
        """Test unexpected errors during user deactivation (covers line 326-328)."""
        with patch('app.api.routes.admin.user_crud.update', side_effect=Exception("Deactivation failed")):
            with pytest.raises(Exception):
                await client.post(
                    f"/api/v1/admin/users/{async_test_user.id}/deactivate",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


# ===== ORGANIZATION MANAGEMENT ERROR TESTS =====

class TestAdminListOrganizationsErrors:
    """Test admin list organizations error handling."""

    @pytest.mark.asyncio
    async def test_list_organizations_database_error(self, client, superuser_token):
        """Test list organizations with database error (covers line 427-456)."""
        with patch('app.api.routes.admin.organization_crud.get_multi_with_member_counts', side_effect=Exception("DB error")):
            with pytest.raises(Exception):
                await client.get(
                    "/api/v1/admin/organizations",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminCreateOrganizationErrors:
    """Test admin create organization error handling."""

    @pytest.mark.asyncio
    async def test_create_organization_duplicate_slug(self, client, async_test_db, superuser_token):
        """Test creating organization with duplicate slug (covers line 480-483)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create an organization first
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Existing Org",
                slug="existing-org",
                description="Test org"
            )
            session.add(org)
            await session.commit()

        # Try to create another with same slug
        response = await client.post(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "name": "New Org",
                "slug": "existing-org",
                "description": "Duplicate slug"
            }
        )

        # Should get error for duplicate slug
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_create_organization_unexpected_error(self, client, superuser_token):
        """Test unexpected errors during organization creation (covers line 484-485)."""
        with patch('app.api.routes.admin.organization_crud.create', side_effect=RuntimeError("Creation failed")):
            with pytest.raises(RuntimeError):
                await client.post(
                    "/api/v1/admin/organizations",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={
                        "name": "New Org",
                        "slug": "new-org",
                        "description": "Test"
                    }
                )


class TestAdminGetOrganizationErrors:
    """Test admin get organization error handling."""

    @pytest.mark.asyncio
    async def test_get_nonexistent_organization(self, client, superuser_token):
        """Test getting an organization that doesn't exist (covers line 516-520)."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/admin/organizations/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdminUpdateOrganizationErrors:
    """Test admin update organization error handling."""

    @pytest.mark.asyncio
    async def test_update_nonexistent_organization(self, client, superuser_token):
        """Test updating an organization that doesn't exist (covers line 552-556)."""
        fake_id = uuid4()
        response = await client.put(
            f"/api/v1/admin/organizations/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"name": "Updated Org"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_organization_unexpected_error(self, client, async_test_db, superuser_token):
        """Test unexpected errors during organization update (covers line 573-575)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create an organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Test Org",
                slug="test-org-update-error",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        with patch('app.api.routes.admin.organization_crud.update', side_effect=Exception("Update failed")):
            with pytest.raises(Exception):
                await client.put(
                    f"/api/v1/admin/organizations/{org_id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={"name": "Updated"}
                )


class TestAdminDeleteOrganizationErrors:
    """Test admin delete organization error handling."""

    @pytest.mark.asyncio
    async def test_delete_nonexistent_organization(self, client, superuser_token):
        """Test deleting an organization that doesn't exist (covers line 596-600)."""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/admin/organizations/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_organization_unexpected_error(self, client, async_test_db, superuser_token):
        """Test unexpected errors during organization deletion (covers line 611-613)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Error Org",
                slug="error-org-delete",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        with patch('app.api.routes.admin.organization_crud.remove', side_effect=Exception("Delete failed")):
            with pytest.raises(Exception):
                await client.delete(
                    f"/api/v1/admin/organizations/{org_id}",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminListOrganizationMembersErrors:
    """Test admin list organization members error handling."""

    @pytest.mark.asyncio
    async def test_list_members_nonexistent_organization(self, client, superuser_token):
        """Test listing members of non-existent organization (covers line 634-638)."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/admin/organizations/{fake_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_list_members_database_error(self, client, async_test_db, superuser_token):
        """Test database errors during member listing (covers line 660-662)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Members Error Org",
                slug="members-error-org",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        with patch('app.api.routes.admin.organization_crud.get_organization_members', side_effect=Exception("DB error")):
            with pytest.raises(Exception):
                await client.get(
                    f"/api/v1/admin/organizations/{org_id}/members",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


class TestAdminAddOrganizationMemberErrors:
    """Test admin add organization member error handling."""

    @pytest.mark.asyncio
    async def test_add_member_nonexistent_organization(self, client, async_test_user, superuser_token):
        """Test adding member to non-existent organization (covers line 689-693)."""
        fake_id = uuid4()
        response = await client.post(
            f"/api/v1/admin/organizations/{fake_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "user_id": str(async_test_user.id),
                "role": "member"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_add_nonexistent_user_to_organization(self, client, async_test_db, superuser_token):
        """Test adding non-existent user to organization (covers line 696-700)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Add Member Org",
                slug="add-member-org",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        fake_user_id = uuid4()
        response = await client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "user_id": str(fake_user_id),
                "role": "member"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_add_member_unexpected_error(self, client, async_test_db, async_test_user, superuser_token):
        """Test unexpected errors during member addition (covers line 727-729)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            org = Organization(
                name="Error Add Org",
                slug="error-add-org",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        with patch('app.api.routes.admin.organization_crud.add_user', side_effect=Exception("Add failed")):
            with pytest.raises(Exception):
                await client.post(
                    f"/api/v1/admin/organizations/{org_id}/members",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={
                        "user_id": str(async_test_user.id),
                        "role": "member"
                    }
                )


class TestAdminRemoveOrganizationMemberErrors:
    """Test admin remove organization member error handling."""

    @pytest.mark.asyncio
    async def test_remove_member_nonexistent_organization(self, client, async_test_user, superuser_token):
        """Test removing member from non-existent organization (covers line 750-754)."""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/admin/organizations/{fake_id}/members/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_remove_member_unexpected_error(self, client, async_test_db, async_test_user, superuser_token):
        """Test unexpected errors during member removal (covers line 780-782)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization with member
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            from app.models.user_organization import UserOrganization, OrganizationRole

            org = Organization(
                name="Remove Member Org",
                slug="remove-member-org",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)

            member = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER
            )
            session.add(member)
            await session.commit()
            org_id = org.id

        with patch('app.api.routes.admin.organization_crud.remove_user', side_effect=Exception("Remove failed")):
            with pytest.raises(Exception):
                await client.delete(
                    f"/api/v1/admin/organizations/{org_id}/members/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"}
                )


# ===== SUCCESS PATH TESTS =====

class TestAdminListUsersSuccess:
    """Test admin list users success paths."""

    @pytest.mark.asyncio
    async def test_list_users_with_pagination(self, client, superuser_token):
        """Test listing users with pagination (covers lines 109-116)."""
        response = await client.get(
            "/api/v1/admin/users?page=1&limit=10",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestAdminCreateUserSuccess:
    """Test admin create user success paths."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, client, superuser_token):
        """Test creating a user successfully (covers lines 142-144)."""
        response = await client.post(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "email": f"newuser{uuid4().hex[:8]}@example.com",
                "password": "NewPassword123!",
                "first_name": "New",
                "last_name": "User"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "email" in data
        assert "id" in data


class TestAdminUpdateUserSuccess:
    """Test admin update user success paths."""

    @pytest.mark.asyncio
    async def test_update_user_success(self, client, async_test_user, superuser_token):
        """Test updating user successfully (covers lines 194-202)."""
        response = await client.put(
            f"/api/v1/admin/users/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"first_name": "Updated"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "Updated"


class TestAdminDeleteUserSuccess:
    """Test admin delete user success paths."""

    @pytest.mark.asyncio
    async def test_delete_user_success(self, client, async_test_db, superuser_token):
        """Test deleting user successfully (covers lines 226-246)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a user to delete
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash

            user_to_delete = User(
                email=f"delete{uuid4().hex[:8]}@example.com",
                password_hash=get_password_hash("Password123!"),
                first_name="Delete",
                last_name="Me"
            )
            session.add(user_to_delete)
            await session.commit()
            await session.refresh(user_to_delete)
            user_id = user_to_delete.id

        response = await client.delete(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_delete_self_fails(self, client, async_test_superuser, superuser_token):
        """Test that admin cannot delete themselves (covers lines 233-238)."""
        response = await client.delete(
            f"/api/v1/admin/users/{async_test_superuser.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminActivateUserSuccess:
    """Test admin activate user success paths."""

    @pytest.mark.asyncio
    async def test_activate_user_success(self, client, async_test_db, superuser_token):
        """Test activating user successfully (covers lines 270-282)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive user
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash

            inactive_user = User(
                email=f"inactive{uuid4().hex[:8]}@example.com",
                password_hash=get_password_hash("Password123!"),
                first_name="Inactive",
                last_name="User",
                is_active=False
            )
            session.add(inactive_user)
            await session.commit()
            await session.refresh(inactive_user)
            user_id = inactive_user.id

        response = await client.post(
            f"/api/v1/admin/users/{user_id}/activate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestAdminDeactivateUserSuccess:
    """Test admin deactivate user success paths."""

    @pytest.mark.asyncio
    async def test_deactivate_user_success(self, client, async_test_user, superuser_token):
        """Test deactivating user successfully (covers lines 306-326)."""
        response = await client.post(
            f"/api/v1/admin/users/{async_test_user.id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_deactivate_self_fails(self, client, async_test_superuser, superuser_token):
        """Test that admin cannot deactivate themselves (covers lines 313-318)."""
        response = await client.post(
            f"/api/v1/admin/users/{async_test_superuser.id}/deactivate",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminBulkUserActionSuccess:
    """Test admin bulk user action success paths."""

    @pytest.mark.asyncio
    async def test_bulk_activate_success(self, client, async_test_db, superuser_token):
        """Test bulk activate users (covers lines 355-360, 375-392)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash

            for i in range(2):
                user = User(
                    email=f"bulkuser{i}{uuid4().hex[:8]}@example.com",
                    password_hash=get_password_hash("Password123!"),
                    first_name="Bulk",
                    last_name=f"User{i}",
                    is_active=False
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                user_ids.append(str(user.id))

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "action": "activate",
                "user_ids": user_ids
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] >= 0

    @pytest.mark.asyncio
    async def test_bulk_deactivate_success(self, client, async_test_db, superuser_token):
        """Test bulk deactivate users (covers lines 361-366)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create active users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash

            for i in range(2):
                user = User(
                    email=f"bulkdeact{i}{uuid4().hex[:8]}@example.com",
                    password_hash=get_password_hash("Password123!"),
                    first_name="Bulk",
                    last_name=f"Deactivate{i}",
                    is_active=True
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                user_ids.append(str(user.id))

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "action": "deactivate",
                "user_ids": user_ids
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] >= 0

    @pytest.mark.asyncio
    async def test_bulk_delete_success(self, client, async_test_db, superuser_token):
        """Test bulk delete users (covers lines 367-373)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create users to delete
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            from app.models.user import User
            from app.core.auth import get_password_hash

            for i in range(2):
                user = User(
                    email=f"bulkdel{i}{uuid4().hex[:8]}@example.com",
                    password_hash=get_password_hash("Password123!"),
                    first_name="Bulk",
                    last_name=f"Delete{i}"
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                user_ids.append(str(user.id))

        response = await client.post(
            "/api/v1/admin/users/bulk-action",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "action": "delete",
                "user_ids": user_ids
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["affected_count"] >= 0


class TestAdminListOrganizationsSuccess:
    """Test admin list organizations success paths."""

    @pytest.mark.asyncio
    async def test_list_organizations_with_pagination(self, client, superuser_token):
        """Test listing organizations with pagination (covers lines 427-452)."""
        response = await client.get(
            "/api/v1/admin/organizations?page=1&limit=10",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestAdminCreateOrganizationSuccess:
    """Test admin create organization success paths."""

    @pytest.mark.asyncio
    async def test_create_organization_success(self, client, superuser_token):
        """Test creating organization successfully (covers lines 475-489)."""
        unique_slug = f"neworg{uuid4().hex[:8]}"
        response = await client.post(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "name": "New Organization",
                "slug": unique_slug,
                "description": "Test org"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["slug"] == unique_slug


class TestAdminGetOrganizationSuccess:
    """Test admin get organization success paths."""

    @pytest.mark.asyncio
    async def test_get_organization_success(self, client, async_test_db, superuser_token):
        """Test getting organization successfully (covers lines 516-533)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization

            org = Organization(
                name="Get Org",
                slug=f"getorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        response = await client.get(
            f"/api/v1/admin/organizations/{org_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(org_id)


class TestAdminUpdateOrganizationSuccess:
    """Test admin update organization success paths."""

    @pytest.mark.asyncio
    async def test_update_organization_success(self, client, async_test_db, superuser_token):
        """Test updating organization successfully (covers lines 552-572)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization

            org = Organization(
                name="Update Org",
                slug=f"updateorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        response = await client.put(
            f"/api/v1/admin/organizations/{org_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"name": "Updated Org Name"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Org Name"


class TestAdminDeleteOrganizationSuccess:
    """Test admin delete organization success paths."""

    @pytest.mark.asyncio
    async def test_delete_organization_success(self, client, async_test_db, superuser_token):
        """Test deleting organization successfully (covers lines 596-608)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization

            org = Organization(
                name="Delete Org",
                slug=f"deleteorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        response = await client.delete(
            f"/api/v1/admin/organizations/{org_id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestAdminListOrganizationMembersSuccess:
    """Test admin list organization members success paths."""

    @pytest.mark.asyncio
    async def test_list_organization_members_success(self, client, async_test_db, async_test_user, superuser_token):
        """Test listing organization members successfully (covers lines 634-658)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization with member
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            from app.models.user_organization import UserOrganization, OrganizationRole

            org = Organization(
                name="Members Org",
                slug=f"membersorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)

            member = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER
            )
            session.add(member)
            await session.commit()
            org_id = org.id

        response = await client.get(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data


class TestAdminAddOrganizationMemberSuccess:
    """Test admin add organization member success paths."""

    @pytest.mark.asyncio
    async def test_add_member_success(self, client, async_test_db, async_test_user, superuser_token):
        """Test adding member to organization successfully (covers lines 689-717)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization

            org = Organization(
                name="Add Member Org",
                slug=f"addmemberorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        response = await client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={
                "user_id": str(async_test_user.id),
                "role": "member"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestAdminRemoveOrganizationMemberSuccess:
    """Test admin remove organization member success paths."""

    @pytest.mark.asyncio
    async def test_remove_member_success(self, client, async_test_db, async_test_user, superuser_token):
        """Test removing member from organization successfully (covers lines 750-780)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization with member
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization
            from app.models.user_organization import UserOrganization, OrganizationRole

            org = Organization(
                name="Remove Member Success Org",
                slug=f"removemembersuccess{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)

            member = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER
            )
            session.add(member)
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
    async def test_remove_nonmember_fails(self, client, async_test_db, async_test_user, superuser_token):
        """Test removing non-member fails (covers lines 769-773)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create organization without member
        async with AsyncTestingSessionLocal() as session:
            from app.models.organization import Organization

            org = Organization(
                name="No Member Org",
                slug=f"nomemberorg{uuid4().hex[:8]}",
                description="Test"
            )
            session.add(org)
            await session.commit()
            await session.refresh(org)
            org_id = org.id

        response = await client.delete(
            f"/api/v1/admin/organizations/{org_id}/members/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
