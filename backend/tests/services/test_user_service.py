# tests/services/test_user_service.py
"""Tests for the UserService class."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate
from app.services.user_service import UserService, user_service


class TestGetUser:
    """Tests for UserService.get_user method."""

    @pytest.mark.asyncio
    async def test_get_user_found(self, async_test_db, async_test_user):
        """Test getting an existing user by ID returns the user."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await user_service.get_user(session, str(async_test_user.id))
            assert result is not None
            assert result.id == async_test_user.id
            assert result.email == async_test_user.email

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, async_test_db):
        """Test getting a non-existent user raises NotFoundError."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        non_existent_id = str(uuid.uuid4())
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(NotFoundError):
                await user_service.get_user(session, non_existent_id)


class TestGetByEmail:
    """Tests for UserService.get_by_email method."""

    @pytest.mark.asyncio
    async def test_get_by_email_found(self, async_test_db, async_test_user):
        """Test getting an existing user by email returns the user."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await user_service.get_by_email(session, async_test_user.email)
            assert result is not None
            assert result.id == async_test_user.id
            assert result.email == async_test_user.email

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, async_test_db):
        """Test getting a user by non-existent email returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await user_service.get_by_email(session, "nonexistent@example.com")
            assert result is None


class TestCreateUser:
    """Tests for UserService.create_user method."""

    @pytest.mark.asyncio
    async def test_create_user(self, async_test_db):
        """Test creating a new user with valid data."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        unique_email = f"test_{uuid.uuid4()}@example.com"
        user_data = UserCreate(
            email=unique_email,
            password="TestPassword123!",
            first_name="New",
            last_name="User",
        )
        async with AsyncTestingSessionLocal() as session:
            result = await user_service.create_user(session, user_data)
            assert result is not None
            assert result.email == unique_email
            assert result.first_name == "New"
            assert result.last_name == "User"
            assert result.is_active is True


class TestUpdateUser:
    """Tests for UserService.update_user method."""

    @pytest.mark.asyncio
    async def test_update_user(self, async_test_db, async_test_user):
        """Test updating a user's first_name."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            user = await user_service.get_user(session, str(async_test_user.id))
            updated = await user_service.update_user(
                session,
                user=user,
                obj_in=UserUpdate(first_name="Updated"),
            )
            assert updated.first_name == "Updated"
            assert updated.id == async_test_user.id


class TestSoftDeleteUser:
    """Tests for UserService.soft_delete_user method."""

    @pytest.mark.asyncio
    async def test_soft_delete_user(self, async_test_db, async_test_user):
        """Test soft-deleting a user sets deleted_at."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            await user_service.soft_delete_user(session, str(async_test_user.id))

        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == async_test_user.id)
            )
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.deleted_at is not None


class TestListUsers:
    """Tests for UserService.list_users method."""

    @pytest.mark.asyncio
    async def test_list_users(self, async_test_db, async_test_user):
        """Test listing users with pagination returns correct results."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            users, count = await user_service.list_users(session, skip=0, limit=10)
            assert isinstance(users, list)
            assert isinstance(count, int)
            assert count >= 1
            assert len(users) >= 1

    @pytest.mark.asyncio
    async def test_list_users_with_search(self, async_test_db, async_test_user):
        """Test listing users with email fragment search returns matching users."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        # Search by partial email fragment of the test user
        email_fragment = async_test_user.email.split("@")[0]
        async with AsyncTestingSessionLocal() as session:
            users, count = await user_service.list_users(
                session, skip=0, limit=10, search=email_fragment
            )
            assert isinstance(users, list)
            assert count >= 1
            emails = [u.email for u in users]
            assert async_test_user.email in emails


class TestBulkUpdateStatus:
    """Tests for UserService.bulk_update_status method."""

    @pytest.mark.asyncio
    async def test_bulk_update_status(self, async_test_db, async_test_user):
        """Test bulk activating users returns correct count."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            count = await user_service.bulk_update_status(
                session,
                user_ids=[async_test_user.id],
                is_active=True,
            )
            assert count >= 1

        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == async_test_user.id)
            )
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.is_active is True


class TestBulkSoftDelete:
    """Tests for UserService.bulk_soft_delete method."""

    @pytest.mark.asyncio
    async def test_bulk_soft_delete(self, async_test_db, async_test_user):
        """Test bulk soft-deleting users returns correct count."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            count = await user_service.bulk_soft_delete(
                session,
                user_ids=[async_test_user.id],
            )
            assert count >= 1

        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == async_test_user.id)
            )
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.deleted_at is not None


class TestGetStats:
    """Tests for UserService.get_stats method."""

    @pytest.mark.asyncio
    async def test_get_stats(self, async_test_db, async_test_user):
        """Test get_stats returns dict with expected keys and correct counts."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            stats = await user_service.get_stats(session)
            assert "total_users" in stats
            assert "active_count" in stats
            assert "inactive_count" in stats
            assert "all_users" in stats
            assert stats["total_users"] >= 1
            assert stats["active_count"] >= 1
            assert isinstance(stats["all_users"], list)
            assert len(stats["all_users"]) >= 1
