# tests/api/test_users.py
"""
Tests for user routes.
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import status


@pytest_asyncio.fixture
async def superuser_token(client, async_test_superuser):
    """Get access token for superuser."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "superuser@example.com", "password": "SuperPassword123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def user_token(client, async_test_user):
    """Get access token for regular user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "testuser@example.com", "password": "TestPassword123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class TestListUsers:
    """Tests for GET /users endpoint (superuser only)."""

    @pytest.mark.asyncio
    async def test_list_users_success(self, client, superuser_token):
        """Test listing users successfully (covers lines 87-100)."""
        response = await client.get(
            "/api/v1/users", headers={"Authorization": f"Bearer {superuser_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_list_users_with_is_superuser_filter(self, client, superuser_token):
        """Test listing users with is_superuser filter (covers line 74)."""
        response = await client.get(
            "/api/v1/users?is_superuser=true",
            headers={"Authorization": f"Bearer {superuser_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data


class TestGetCurrentUser:
    """Tests for GET /users/me endpoint."""

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, client, async_test_user, user_token):
        """Test getting current user profile."""
        response = await client.get(
            "/api/v1/users/me", headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "testuser@example.com"
        assert data["id"] == str(async_test_user.id)


class TestUpdateCurrentUser:
    """Tests for PATCH /users/me endpoint."""

    @pytest.mark.asyncio
    async def test_update_current_user_success(self, client, user_token):
        """Test updating current user profile (covers lines 150-151)."""
        response = await client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"first_name": "UpdatedName"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "UpdatedName"

    @pytest.mark.asyncio
    async def test_update_current_user_database_error(self, client, user_token):
        """Test database error handling during update (covers lines 162-169)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.update", side_effect=Exception("DB error")
        ):
            with pytest.raises(Exception):
                await client.patch(
                    "/api/v1/users/me",
                    headers={"Authorization": f"Bearer {user_token}"},
                    json={"first_name": "Updated"},
                )

    @pytest.mark.asyncio
    async def test_update_current_user_cannot_make_superuser(self, client, user_token):
        """Test that users cannot make themselves superuser (Pydantic validation)."""
        response = await client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"is_superuser": True},
        )

        # Pydantic validation should reject this at the schema level
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        data = response.json()
        assert data["success"] is False
        assert "errors" in data
        # Check that the error mentions is_superuser
        error_fields = [err["field"] for err in data["errors"]]
        assert "is_superuser" in error_fields
        error_messages = [err["message"] for err in data["errors"]]
        assert any("superuser" in msg.lower() for msg in error_messages)

    @pytest.mark.asyncio
    async def test_update_current_user_value_error(self, client, user_token):
        """Test ValueError handling during update (covers lines 165-166)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.update",
            side_effect=ValueError("Invalid value"),
        ):
            with pytest.raises(ValueError):
                await client.patch(
                    "/api/v1/users/me",
                    headers={"Authorization": f"Bearer {user_token}"},
                    json={"first_name": "Updated"},
                )


class TestGetUser:
    """Tests for GET /users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_user_success(self, client, async_test_user, superuser_token):
        """Test getting user by ID."""
        response = await client.get(
            f"/api/v1/users/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(async_test_user.id)

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client, superuser_token):
        """Test getting non-existent user (covers lines 210-216)."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/v1/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateUserById:
    """Tests for PATCH /users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_user_by_id_not_found(self, client, superuser_token):
        """Test updating non-existent user (covers lines 261-265)."""
        fake_id = uuid4()
        response = await client.patch(
            f"/api/v1/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"first_name": "Updated"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_user_by_id_non_superuser_cannot_change_superuser_status(
        self, client, async_test_user, user_token
    ):
        """Test non-superuser cannot modify superuser status (Pydantic validation)."""
        response = await client.patch(
            f"/api/v1/users/{async_test_user.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"is_superuser": True},
        )

        # Pydantic validation should reject this at the schema level
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_user_by_id_success(
        self, client, async_test_user, superuser_token
    ):
        """Test updating user successfully (covers lines 276-278)."""
        response = await client.patch(
            f"/api/v1/users/{async_test_user.id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
            json={"first_name": "SuperUpdated"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "SuperUpdated"

    @pytest.mark.asyncio
    async def test_update_user_by_id_value_error(
        self, client, async_test_user, superuser_token
    ):
        """Test ValueError handling (covers lines 280-281)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.update", side_effect=ValueError("Invalid")
        ):
            with pytest.raises(ValueError):
                await client.patch(
                    f"/api/v1/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={"first_name": "Updated"},
                )

    @pytest.mark.asyncio
    async def test_update_user_by_id_unexpected_error(
        self, client, async_test_user, superuser_token
    ):
        """Test unexpected error handling (covers lines 283-284)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.update", side_effect=Exception("Unexpected")
        ):
            with pytest.raises(Exception):
                await client.patch(
                    f"/api/v1/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                    json={"first_name": "Updated"},
                )


class TestChangePassword:
    """Tests for PATCH /users/me/password endpoint."""

    @pytest.mark.asyncio
    async def test_change_password_success(self, client, async_test_db):
        """Test changing password successfully."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a fresh user
        async with AsyncTestingSessionLocal() as session:
            from app.core.auth import get_password_hash
            from app.models.user import User

            new_user = User(
                email="changepass@example.com",
                password_hash=get_password_hash("OldPassword123!"),
                first_name="Change",
                last_name="Pass",
            )
            session.add(new_user)
            await session.commit()

        # Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "changepass@example.com", "password": "OldPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Change password
        response = await client.patch(
            "/api/v1/users/me/password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "OldPassword123!",
                "new_password": "NewPassword456!",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

        # Verify new password works
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "changepass@example.com", "password": "NewPassword456!"},
        )
        assert login_response.status_code == status.HTTP_200_OK


class TestDeleteUserById:
    """Tests for DELETE /users/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, client, superuser_token):
        """Test deleting non-existent user (covers lines 375-379)."""
        fake_id = uuid4()
        response = await client.delete(
            f"/api/v1/users/{fake_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_user_success(self, client, async_test_db, superuser_token):
        """Test deleting user successfully (covers lines 383-388)."""
        _test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a user to delete
        async with AsyncTestingSessionLocal() as session:
            from app.core.auth import get_password_hash
            from app.models.user import User

            user_to_delete = User(
                email=f"delete{uuid4().hex[:8]}@example.com",
                password_hash=get_password_hash("Password123!"),
                first_name="Delete",
                last_name="Me",
            )
            session.add(user_to_delete)
            await session.commit()
            await session.refresh(user_to_delete)
            user_id = user_to_delete.id

        response = await client.delete(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {superuser_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_delete_user_value_error(
        self, client, async_test_user, superuser_token
    ):
        """Test ValueError handling during delete (covers lines 390-391)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.soft_delete",
            side_effect=ValueError("Cannot delete"),
        ):
            with pytest.raises(ValueError):
                await client.delete(
                    f"/api/v1/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                )

    @pytest.mark.asyncio
    async def test_delete_user_unexpected_error(
        self, client, async_test_user, superuser_token
    ):
        """Test unexpected error handling during delete (covers lines 393-394)."""
        from unittest.mock import patch

        with patch(
            "app.api.routes.users.user_crud.soft_delete",
            side_effect=Exception("Unexpected"),
        ):
            with pytest.raises(Exception):
                await client.delete(
                    f"/api/v1/users/{async_test_user.id}",
                    headers={"Authorization": f"Bearer {superuser_token}"},
                )
