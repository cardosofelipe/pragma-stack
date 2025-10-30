# tests/api/routes/test_users.py
"""
Tests for user management endpoints.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.routes.users import router as users_router
from app.core.database import get_db
from app.models.user import User
from app.api.dependencies.auth import get_current_user, get_current_superuser


@pytest.fixture
def override_get_db(db_session):
    """Override get_db dependency for testing."""
    return db_session


@pytest.fixture
def app(override_get_db):
    """Create a FastAPI test application."""
    app = FastAPI()
    app.include_router(users_router, prefix="/api/v1/users", tags=["users"])

    # Override the get_db dependency
    app.dependency_overrides[get_db] = lambda: override_get_db

    return app


@pytest.fixture
def client(app):
    """Create a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def regular_user():
    """Create a mock regular user."""
    return User(
        id=uuid.uuid4(),
        email="regular@example.com",
        password_hash="hashed_password",
        first_name="Regular",
        last_name="User",
        is_active=True,
        is_superuser=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


@pytest.fixture
def super_user():
    """Create a mock superuser."""
    return User(
        id=uuid.uuid4(),
        email="admin@example.com",
        password_hash="hashed_password",
        first_name="Admin",
        last_name="User",
        is_active=True,
        is_superuser=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


class TestListUsers:
    """Tests for the list_users endpoint."""

    def test_list_users_as_superuser(self, client, app, super_user, regular_user, db_session):
        """Test that superusers can list all users."""
        from app.crud.user import user as user_crud

        # Override auth dependency
        app.dependency_overrides[get_current_superuser] = lambda: super_user

        # Mock user_crud to return test data
        mock_users = [regular_user for _ in range(3)]
        with patch.object(user_crud, 'get_multi_with_total', return_value=(mock_users, 3)):
            response = client.get("/api/v1/users?page=1&limit=20")

            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "pagination" in data
            assert len(data["data"]) == 3
            assert data["pagination"]["total"] == 3

        # Clean up
        if get_current_superuser in app.dependency_overrides:
            del app.dependency_overrides[get_current_superuser]

    def test_list_users_pagination(self, client, app, super_user, regular_user, db_session):
        """Test pagination parameters for list users."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_superuser] = lambda: super_user

        # Mock user_crud
        mock_users = [regular_user for _ in range(10)]
        with patch.object(user_crud, 'get_multi_with_total', return_value=(mock_users[:5], 10)):
            response = client.get("/api/v1/users?page=1&limit=5")

            assert response.status_code == 200
            data = response.json()
            assert data["pagination"]["page"] == 1
            assert data["pagination"]["page_size"] == 5
            assert data["pagination"]["total"] == 10
            assert data["pagination"]["total_pages"] == 2

        # Clean up
        if get_current_superuser in app.dependency_overrides:
            del app.dependency_overrides[get_current_superuser]


class TestGetCurrentUserProfile:
    """Tests for the get_current_user_profile endpoint."""

    def test_get_current_user_profile(self, client, app, regular_user):
        """Test getting current user's profile."""
        app.dependency_overrides[get_current_user] = lambda: regular_user

        response = client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == regular_user.email
        assert data["first_name"] == regular_user.first_name
        assert data["last_name"] == regular_user.last_name
        assert "password" not in data

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


class TestUpdateCurrentUser:
    """Tests for the update_current_user endpoint."""

    def test_update_current_user_success(self, client, app, regular_user, db_session):
        """Test successful profile update."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: regular_user

        updated_user = User(
            id=regular_user.id,
            email=regular_user.email,
            password_hash=regular_user.password_hash,
            first_name="Updated",
            last_name="Name",
            is_active=True,
            is_superuser=False,
            created_at=regular_user.created_at,
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'update', return_value=updated_user):
            response = client.patch(
                "/api/v1/users/me",
                json={"first_name": "Updated", "last_name": "Name"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["first_name"] == "Updated"
            assert data["last_name"] == "Name"

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_update_current_user_extra_fields_ignored(self, client, app, regular_user, db_session):
        """Test that extra fields like is_superuser are ignored by schema validation."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: regular_user

        # Create updated user without is_superuser changed
        updated_user = User(
            id=regular_user.id,
            email=regular_user.email,
            password_hash=regular_user.password_hash,
            first_name="Updated",
            last_name=regular_user.last_name,
            is_active=True,
            is_superuser=False,  # Should remain False
            created_at=regular_user.created_at,
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'update', return_value=updated_user):
            response = client.patch(
                "/api/v1/users/me",
                json={"first_name": "Updated", "is_superuser": True}  # is_superuser will be ignored
            )

            # Request should succeed but is_superuser should be unchanged
            assert response.status_code == 200
            data = response.json()
            assert data["is_superuser"] is False

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


class TestGetUserById:
    """Tests for the get_user_by_id endpoint."""

    def test_get_own_profile(self, client, app, regular_user, db_session):
        """Test that users can get their own profile."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: regular_user

        with patch.object(user_crud, 'get', return_value=regular_user):
            response = client.get(f"/api/v1/users/{regular_user.id}")

            assert response.status_code == 200
            data = response.json()
            assert data["email"] == regular_user.email

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_get_other_user_as_regular_user(self, client, app, regular_user):
        """Test that regular users cannot view other users."""
        app.dependency_overrides[get_current_user] = lambda: regular_user

        other_user_id = uuid.uuid4()
        response = client.get(f"/api/v1/users/{other_user_id}")

        assert response.status_code == 403

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_get_other_user_as_superuser(self, client, app, super_user, db_session):
        """Test that superusers can view any user."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: super_user

        other_user = User(
            id=uuid.uuid4(),
            email="other@example.com",
            password_hash="hashed",
            first_name="Other",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'get', return_value=other_user):
            response = client.get(f"/api/v1/users/{other_user.id}")

            assert response.status_code == 200
            data = response.json()
            assert data["email"] == other_user.email

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_get_nonexistent_user(self, client, app, super_user, db_session):
        """Test getting a user that doesn't exist."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: super_user

        with patch.object(user_crud, 'get', return_value=None):
            response = client.get(f"/api/v1/users/{uuid.uuid4()}")

            assert response.status_code == 404

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


class TestUpdateUser:
    """Tests for the update_user endpoint."""

    def test_update_own_profile(self, client, app, regular_user, db_session):
        """Test that users can update their own profile."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: regular_user

        updated_user = User(
            id=regular_user.id,
            email=regular_user.email,
            password_hash=regular_user.password_hash,
            first_name="NewName",
            last_name=regular_user.last_name,
            is_active=True,
            is_superuser=False,
            created_at=regular_user.created_at,
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'get', return_value=regular_user), \
             patch.object(user_crud, 'update', return_value=updated_user):
            response = client.patch(
                f"/api/v1/users/{regular_user.id}",
                json={"first_name": "NewName"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["first_name"] == "NewName"

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_update_other_user_as_regular_user(self, client, app, regular_user):
        """Test that regular users cannot update other users."""
        app.dependency_overrides[get_current_user] = lambda: regular_user

        other_user_id = uuid.uuid4()
        response = client.patch(
            f"/api/v1/users/{other_user_id}",
            json={"first_name": "NewName"}
        )

        assert response.status_code == 403

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_user_schema_ignores_extra_fields(self, client, app, regular_user, db_session):
        """Test that UserUpdate schema ignores extra fields like is_superuser."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: regular_user

        # Updated user with is_superuser unchanged
        updated_user = User(
            id=regular_user.id,
            email=regular_user.email,
            password_hash=regular_user.password_hash,
            first_name="Changed",
            last_name=regular_user.last_name,
            is_active=True,
            is_superuser=False,  # Should remain False
            created_at=regular_user.created_at,
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'get', return_value=regular_user), \
             patch.object(user_crud, 'update', return_value=updated_user):
            response = client.patch(
                f"/api/v1/users/{regular_user.id}",
                json={"first_name": "Changed", "is_superuser": True}  # is_superuser ignored
            )

            # Should succeed, extra field is ignored
            assert response.status_code == 200
            data = response.json()
            assert data["is_superuser"] is False

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

    def test_superuser_can_update_any_user(self, client, app, super_user, db_session):
        """Test that superusers can update any user."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_user] = lambda: super_user

        target_user = User(
            id=uuid.uuid4(),
            email="target@example.com",
            password_hash="hashed",
            first_name="Target",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        updated_user = User(
            id=target_user.id,
            email=target_user.email,
            password_hash=target_user.password_hash,
            first_name="Updated",
            last_name=target_user.last_name,
            is_active=True,
            is_superuser=False,
            created_at=target_user.created_at,
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'get', return_value=target_user), \
             patch.object(user_crud, 'update', return_value=updated_user):
            response = client.patch(
                f"/api/v1/users/{target_user.id}",
                json={"first_name": "Updated"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["first_name"] == "Updated"

        # Clean up
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


class TestDeleteUser:
    """Tests for the delete_user endpoint."""

    def test_delete_user_as_superuser(self, client, app, super_user, db_session):
        """Test that superusers can delete users."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_superuser] = lambda: super_user

        target_user = User(
            id=uuid.uuid4(),
            email="target@example.com",
            password_hash="hashed",
            first_name="Target",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        with patch.object(user_crud, 'get', return_value=target_user), \
             patch.object(user_crud, 'remove', return_value=target_user):
            response = client.delete(f"/api/v1/users/{target_user.id}")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "deleted successfully" in data["message"]

        # Clean up
        if get_current_superuser in app.dependency_overrides:
            del app.dependency_overrides[get_current_superuser]

    def test_delete_nonexistent_user(self, client, app, super_user, db_session):
        """Test deleting a user that doesn't exist."""
        from app.crud.user import user as user_crud

        app.dependency_overrides[get_current_superuser] = lambda: super_user

        with patch.object(user_crud, 'get', return_value=None):
            response = client.delete(f"/api/v1/users/{uuid.uuid4()}")

            assert response.status_code == 404

        # Clean up
        if get_current_superuser in app.dependency_overrides:
            del app.dependency_overrides[get_current_superuser]

    def test_cannot_delete_self(self, client, app, super_user, db_session):
        """Test that users cannot delete their own account."""
        app.dependency_overrides[get_current_superuser] = lambda: super_user

        response = client.delete(f"/api/v1/users/{super_user.id}")

        assert response.status_code == 403

        # Clean up
        if get_current_superuser in app.dependency_overrides:
            del app.dependency_overrides[get_current_superuser]
