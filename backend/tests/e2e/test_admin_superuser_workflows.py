"""
Admin superuser E2E workflow tests with real PostgreSQL.

These tests validate admin operations with actual superuser privileges:
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


class TestAdminUserManagement:
    """Test admin user management with superuser."""

    async def test_admin_list_users(self, e2e_client, e2e_superuser):
        """Superuser can list all users."""
        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert len(data["data"]) >= 1  # At least the superuser

    async def test_admin_list_users_with_pagination(self, e2e_client, e2e_superuser):
        """Superuser can list users with pagination."""
        # Create a few more users
        for i in range(3):
            await e2e_client.post(
                "/api/v1/auth/register",
                json={
                    "email": f"user{i}-{uuid4().hex[:8]}@example.com",
                    "password": "TestPass123!",
                    "first_name": f"User{i}",
                    "last_name": "Test",
                },
            )

        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"page": 1, "limit": 2},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 2
        assert data["pagination"]["page_size"] <= 2

    async def test_admin_create_user(self, e2e_client, e2e_superuser):
        """Superuser can create new users."""
        email = f"newuser-{uuid4().hex[:8]}@example.com"

        response = await e2e_client.post(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={
                "email": email,
                "password": "NewUserPass123!",
                "first_name": "New",
                "last_name": "User",
            },
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["email"] == email

    async def test_admin_get_user_by_id(self, e2e_client, e2e_superuser):
        """Superuser can get any user by ID."""
        # Create a user
        email = f"target-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "TargetPass123!",
                "first_name": "Target",
                "last_name": "User",
            },
        )

        # Get user list to find the ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        target_user = next(u for u in users if u["email"] == email)

        # Get user by ID
        response = await e2e_client.get(
            f"/api/v1/admin/users/{target_user['id']}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        assert response.json()["email"] == email

    async def test_admin_update_user(self, e2e_client, e2e_superuser):
        """Superuser can update any user."""
        # Create a user
        email = f"update-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "UpdatePass123!",
                "first_name": "Update",
                "last_name": "User",
            },
        )

        # Get user ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        target_user = next(u for u in users if u["email"] == email)

        # Update user
        response = await e2e_client.put(
            f"/api/v1/admin/users/{target_user['id']}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"first_name": "Updated", "last_name": "Name"},
        )

        assert response.status_code == 200
        assert response.json()["first_name"] == "Updated"

    async def test_admin_deactivate_user(self, e2e_client, e2e_superuser):
        """Superuser can deactivate users."""
        # Create a user
        email = f"deactivate-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "DeactivatePass123!",
                "first_name": "Deactivate",
                "last_name": "User",
            },
        )

        # Get user ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        target_user = next(u for u in users if u["email"] == email)

        # Deactivate user
        response = await e2e_client.post(
            f"/api/v1/admin/users/{target_user['id']}/deactivate",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200

    async def test_admin_bulk_action(self, e2e_client, e2e_superuser):
        """Superuser can perform bulk actions on users."""
        # Create users for bulk action
        user_ids = []
        for i in range(2):
            email = f"bulk-{i}-{uuid4().hex[:8]}@example.com"
            await e2e_client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": "BulkPass123!",
                    "first_name": f"Bulk{i}",
                    "last_name": "User",
                },
            )

        # Get user IDs
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        bulk_users = [u for u in users if u["email"].startswith("bulk-")]
        user_ids = [u["id"] for u in bulk_users]

        # Bulk deactivate
        response = await e2e_client.post(
            "/api/v1/admin/users/bulk-action",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"action": "deactivate", "user_ids": user_ids},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["affected_count"] >= 1


class TestAdminOrganizationManagement:
    """Test admin organization management with superuser."""

    async def test_admin_list_organizations(self, e2e_client, e2e_superuser):
        """Superuser can list all organizations."""
        response = await e2e_client.get(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    async def test_admin_create_organization(self, e2e_client, e2e_superuser):
        """Superuser can create organizations."""
        org_name = f"Admin Org {uuid4().hex[:8]}"
        org_slug = f"admin-org-{uuid4().hex[:8]}"

        response = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={
                "name": org_name,
                "slug": org_slug,
                "description": "Created by admin",
            },
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == org_name
        assert data["slug"] == org_slug

    async def test_admin_get_organization(self, e2e_client, e2e_superuser):
        """Superuser can get organization details."""
        # Create org first
        org_slug = f"get-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={
                "name": "Get Org Test",
                "slug": org_slug,
            },
        )
        org_id = create_resp.json()["id"]

        # Get org
        response = await e2e_client.get(
            f"/api/v1/admin/organizations/{org_id}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        assert response.json()["slug"] == org_slug

    async def test_admin_update_organization(self, e2e_client, e2e_superuser):
        """Superuser can update organizations."""
        # Create org
        org_slug = f"update-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "Update Org Test", "slug": org_slug},
        )
        org_id = create_resp.json()["id"]

        # Update org
        response = await e2e_client.put(
            f"/api/v1/admin/organizations/{org_id}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "Updated Org Name", "description": "Updated description"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Org Name"

    async def test_admin_add_member_to_organization(self, e2e_client, e2e_superuser):
        """Superuser can add members to organizations."""
        # Create org
        org_slug = f"member-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "Member Org Test", "slug": org_slug},
        )
        org_id = create_resp.json()["id"]

        # Create user to add
        email = f"new-member-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "MemberPass123!",
                "first_name": "New",
                "last_name": "Member",
            },
        )

        # Get user ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        new_user = next(u for u in users if u["email"] == email)

        # Add to org
        response = await e2e_client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"user_id": new_user["id"], "role": "member"},
        )

        assert response.status_code in [200, 201]

    async def test_admin_list_organization_members(self, e2e_client, e2e_superuser):
        """Superuser can list organization members."""
        # Create org with member
        org_slug = f"list-members-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "List Members Org", "slug": org_slug},
        )
        org_id = create_resp.json()["id"]

        # List members
        response = await e2e_client.get(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200


class TestAdminStats:
    """Test admin statistics endpoints."""

    async def test_admin_get_stats(self, e2e_client, e2e_superuser):
        """Superuser can get admin statistics."""
        response = await e2e_client.get(
            "/api/v1/admin/stats",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Stats should have user growth, org distribution, etc.
        assert "user_growth" in data or "user_status" in data


class TestAdminSessionManagement:
    """Test admin session management."""

    async def test_admin_list_all_sessions(self, e2e_client, e2e_superuser):
        """Superuser can list all sessions."""
        response = await e2e_client.get(
            "/api/v1/admin/sessions",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

class TestAdminDeleteOperations:
    """Test admin delete operations."""

    async def test_admin_delete_user(self, e2e_client, e2e_superuser):
        """Superuser can delete users."""
        # Create user
        email = f"delete-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "DeletePass123!",
                "first_name": "Delete",
                "last_name": "User",
            },
        )

        # Get user ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        target_user = next(u for u in users if u["email"] == email)

        # Delete user
        response = await e2e_client.delete(
            f"/api/v1/admin/users/{target_user['id']}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code in [200, 204]

    async def test_admin_delete_organization(self, e2e_client, e2e_superuser):
        """Superuser can delete organizations."""
        # Create org
        org_slug = f"delete-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "Delete Org Test", "slug": org_slug},
        )
        org_id = create_resp.json()["id"]

        # Delete org
        response = await e2e_client.delete(
            f"/api/v1/admin/organizations/{org_id}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code in [200, 204]

    async def test_admin_remove_org_member(self, e2e_client, e2e_superuser):
        """Superuser can remove members from organizations."""
        # Create org
        org_slug = f"remove-member-org-{uuid4().hex[:8]}"
        create_resp = await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": "Remove Member Org", "slug": org_slug},
        )
        org_id = create_resp.json()["id"]

        # Create user
        email = f"remove-member-{uuid4().hex[:8]}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "RemovePass123!",
                "first_name": "Remove",
                "last_name": "Member",
            },
        )

        # Get user ID
        list_resp = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )
        users = list_resp.json()["data"]
        target_user = next(u for u in users if u["email"] == email)

        # Add to org
        await e2e_client.post(
            f"/api/v1/admin/organizations/{org_id}/members",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"user_id": target_user["id"], "role": "member"},
        )

        # Remove from org
        response = await e2e_client.delete(
            f"/api/v1/admin/organizations/{org_id}/members/{target_user['id']}",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
        )

        assert response.status_code in [200, 204]


class TestAdminSearchAndFilter:
    """Test admin search and filter capabilities."""

    async def test_admin_search_users_by_email(self, e2e_client, e2e_superuser):
        """Superuser can search users by email."""
        # Create user with unique prefix
        prefix = f"searchable-{uuid4().hex[:8]}"
        email = f"{prefix}@example.com"
        await e2e_client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SearchPass123!",
                "first_name": "Search",
                "last_name": "User",
            },
        )

        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"search": prefix},
        )

        assert response.status_code == 200
        data = response.json()
        # Search should find the user
        assert len(data["data"]) >= 1
        emails = [u["email"] for u in data["data"]]
        assert any(prefix in e for e in emails)

    async def test_admin_filter_active_users(self, e2e_client, e2e_superuser):
        """Superuser can filter by active status."""
        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"is_active": True},
        )

        assert response.status_code == 200
        data = response.json()
        # All returned users should be active
        for user in data["data"]:
            assert user["is_active"] is True

    async def test_admin_filter_superusers(self, e2e_client, e2e_superuser):
        """Superuser can filter superusers."""
        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"is_superuser": True},
        )

        assert response.status_code == 200
        data = response.json()
        # Should find at least the test superuser
        assert len(data["data"]) >= 1

    async def test_admin_sort_users(self, e2e_client, e2e_superuser):
        """Superuser can sort users by different fields."""
        response = await e2e_client.get(
            "/api/v1/admin/users",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"sort_by": "created_at", "sort_order": "desc"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    async def test_admin_search_organizations(self, e2e_client, e2e_superuser):
        """Superuser can search organizations."""
        # Create org with unique name
        prefix = f"searchorg-{uuid4().hex[:8]}"
        await e2e_client.post(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            json={"name": f"{prefix} Test", "slug": f"{prefix}-slug"},
        )

        response = await e2e_client.get(
            "/api/v1/admin/organizations",
            headers={
                "Authorization": f"Bearer {e2e_superuser['tokens']['access_token']}"
            },
            params={"search": prefix},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1


