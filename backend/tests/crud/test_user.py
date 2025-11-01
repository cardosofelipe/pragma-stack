# tests/crud/test_user_async.py
"""
Comprehensive tests for async user CRUD operations.
"""
import pytest
from datetime import datetime, timezone
from uuid import uuid4

from app.crud.user import user as user_crud
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate


class TestGetByEmail:
    """Tests for get_by_email method."""

    @pytest.mark.asyncio
    async def test_get_by_email_success(self, async_test_db, async_test_user):
        """Test getting user by email."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await user_crud.get_by_email(session, email=async_test_user.email)
            assert result is not None
            assert result.email == async_test_user.email
            assert result.id == async_test_user.id

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, async_test_db):
        """Test getting non-existent email returns None."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await user_crud.get_by_email(session, email="nonexistent@example.com")
            assert result is None


class TestCreate:
    """Tests for create method."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, async_test_db):
        """Test successfully creating a user_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="newuser@example.com",
                password="SecurePass123!",
                first_name="New",
                last_name="User",
                phone_number="+1234567890"
            )
            result = await user_crud.create(session, obj_in=user_data)

            assert result.email == "newuser@example.com"
            assert result.first_name == "New"
            assert result.last_name == "User"
            assert result.phone_number == "+1234567890"
            assert result.is_active is True
            assert result.is_superuser is False
            assert result.password_hash is not None
            assert result.password_hash != "SecurePass123!"  # Password should be hashed

    @pytest.mark.asyncio
    async def test_create_superuser_success(self, async_test_db):
        """Test creating a superuser."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="superuser@example.com",
                password="SuperPass123!",
                first_name="Super",
                last_name="User",
                is_superuser=True
            )
            result = await user_crud.create(session, obj_in=user_data)

            assert result.is_superuser is True
            assert result.email == "superuser@example.com"

    @pytest.mark.asyncio
    async def test_create_duplicate_email_fails(self, async_test_db, async_test_user):
        """Test creating user with duplicate email raises ValueError."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email=async_test_user.email,  # Duplicate email
                password="AnotherPass123!",
                first_name="Duplicate",
                last_name="User"
            )

            with pytest.raises(ValueError) as exc_info:
                await user_crud.create(session, obj_in=user_data)

            assert "already exists" in str(exc_info.value).lower()


class TestUpdate:
    """Tests for update method."""

    @pytest.mark.asyncio
    async def test_update_user_basic_fields(self, async_test_db, async_test_user):
        """Test updating basic user fields."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            # Get fresh copy of user
            user = await user_crud.get(session, id=str(async_test_user.id))

            update_data = UserUpdate(
                first_name="Updated",
                last_name="Name",
                phone_number="+9876543210"
            )
            result = await user_crud.update(session, db_obj=user, obj_in=update_data)

            assert result.first_name == "Updated"
            assert result.last_name == "Name"
            assert result.phone_number == "+9876543210"

    @pytest.mark.asyncio
    async def test_update_user_password(self, async_test_db):
        """Test updating user password."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create a fresh user for this test
        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="passwordtest@example.com",
                password="OldPassword123!",
                first_name="Pass",
                last_name="Test"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            old_password_hash = user.password_hash

        # Update the password
        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(user_id))

            update_data = UserUpdate(password="NewDifferentPassword123!")
            result = await user_crud.update(session, db_obj=user, obj_in=update_data)

            await session.refresh(result)
            assert result.password_hash != old_password_hash
            assert result.password_hash is not None
            assert "NewDifferentPassword123!" not in result.password_hash  # Should be hashed

    @pytest.mark.asyncio
    async def test_update_user_with_dict(self, async_test_db, async_test_user):
        """Test updating user with dictionary."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            update_dict = {"first_name": "DictUpdate"}
            result = await user_crud.update(session, db_obj=user, obj_in=update_dict)

            assert result.first_name == "DictUpdate"


class TestGetMultiWithTotal:
    """Tests for get_multi_with_total method."""

    @pytest.mark.asyncio
    async def test_get_multi_with_total_basic(self, async_test_db, async_test_user):
        """Test basic pagination."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10
            )
            assert total >= 1
            assert len(users) >= 1
            assert any(u.id == async_test_user.id for u in users)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_sorting_asc(self, async_test_db):
        """Test sorting in ascending order."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"sort{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"User{i}",
                    last_name="Test"
                )
                await user_crud.create(session, obj_in=user_data)

        async with AsyncTestingSessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10,
                sort_by="email",
                sort_order="asc"
            )

            # Check if sorted (at least the test users)
            test_users = [u for u in users if u.email.startswith("sort")]
            if len(test_users) > 1:
                assert test_users[0].email < test_users[1].email

    @pytest.mark.asyncio
    async def test_get_multi_with_total_sorting_desc(self, async_test_db):
        """Test sorting in descending order."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"desc{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"User{i}",
                    last_name="Test"
                )
                await user_crud.create(session, obj_in=user_data)

        async with AsyncTestingSessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10,
                sort_by="email",
                sort_order="desc"
            )

            # Check if sorted descending (at least the test users)
            test_users = [u for u in users if u.email.startswith("desc")]
            if len(test_users) > 1:
                assert test_users[0].email > test_users[1].email

    @pytest.mark.asyncio
    async def test_get_multi_with_total_filtering(self, async_test_db):
        """Test filtering by field."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create active and inactive users
        async with AsyncTestingSessionLocal() as session:
            active_user = UserCreate(
                email="active@example.com",
                password="SecurePass123!",
                first_name="Active",
                last_name="User"
            )
            await user_crud.create(session, obj_in=active_user)

            inactive_user = UserCreate(
                email="inactive@example.com",
                password="SecurePass123!",
                first_name="Inactive",
                last_name="User"
            )
            created_inactive = await user_crud.create(session, obj_in=inactive_user)

            # Deactivate the user
            await user_crud.update(
                session,
                db_obj=created_inactive,
                obj_in={"is_active": False}
            )

        async with AsyncTestingSessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=100,
                filters={"is_active": True}
            )

            # All returned users should be active
            assert all(u.is_active for u in users)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_search(self, async_test_db):
        """Test search functionality."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create user with unique name
        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="searchable@example.com",
                password="SecurePass123!",
                first_name="Searchable",
                last_name="UserName"
            )
            await user_crud.create(session, obj_in=user_data)

        async with AsyncTestingSessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=100,
                search="Searchable"
            )

            assert total >= 1
            assert any(u.first_name == "Searchable" for u in users)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_pagination(self, async_test_db):
        """Test pagination with skip and limit."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        async with AsyncTestingSessionLocal() as session:
            for i in range(5):
                user_data = UserCreate(
                    email=f"page{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"Page{i}",
                    last_name="User"
                )
                await user_crud.create(session, obj_in=user_data)

        async with AsyncTestingSessionLocal() as session:
            # Get first page
            users_page1, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=2
            )

            # Get second page
            users_page2, total2 = await user_crud.get_multi_with_total(
                session,
                skip=2,
                limit=2
            )

            # Total should be same
            assert total == total2
            # Different users on different pages
            assert users_page1[0].id != users_page2[0].id

    @pytest.mark.asyncio
    async def test_get_multi_with_total_validation_negative_skip(self, async_test_db):
        """Test validation fails for negative skip."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(ValueError) as exc_info:
                await user_crud.get_multi_with_total(session, skip=-1, limit=10)

            assert "skip must be non-negative" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_validation_negative_limit(self, async_test_db):
        """Test validation fails for negative limit."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(ValueError) as exc_info:
                await user_crud.get_multi_with_total(session, skip=0, limit=-1)

            assert "limit must be non-negative" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_validation_max_limit(self, async_test_db):
        """Test validation fails for limit > 1000."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(ValueError) as exc_info:
                await user_crud.get_multi_with_total(session, skip=0, limit=1001)

            assert "Maximum limit is 1000" in str(exc_info.value)


class TestBulkUpdateStatus:
    """Tests for bulk_update_status method."""

    @pytest.mark.asyncio
    async def test_bulk_update_status_success(self, async_test_db):
        """Test bulk updating user status."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"bulk{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"Bulk{i}",
                    last_name="User"
                )
                user = await user_crud.create(session, obj_in=user_data)
                user_ids.append(user.id)

        # Bulk deactivate
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_update_status(
                session,
                user_ids=user_ids,
                is_active=False
            )
            assert count == 3

        # Verify all are inactive
        async with AsyncTestingSessionLocal() as session:
            for user_id in user_ids:
                user = await user_crud.get(session, id=str(user_id))
                assert user.is_active is False

    @pytest.mark.asyncio
    async def test_bulk_update_status_empty_list(self, async_test_db):
        """Test bulk update with empty list returns 0."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_update_status(
                session,
                user_ids=[],
                is_active=False
            )
            assert count == 0

    @pytest.mark.asyncio
    async def test_bulk_update_status_reactivate(self, async_test_db):
        """Test bulk reactivating users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create inactive user
        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="reactivate@example.com",
                password="SecurePass123!",
                first_name="Reactivate",
                last_name="User"
            )
            user = await user_crud.create(session, obj_in=user_data)
            # Deactivate
            await user_crud.update(session, db_obj=user, obj_in={"is_active": False})
            user_id = user.id

        # Reactivate
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_update_status(
                session,
                user_ids=[user_id],
                is_active=True
            )
            assert count == 1

        # Verify active
        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(user_id))
            assert user.is_active is True


class TestBulkSoftDelete:
    """Tests for bulk_soft_delete method."""

    @pytest.mark.asyncio
    async def test_bulk_soft_delete_success(self, async_test_db):
        """Test bulk soft deleting users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"delete{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"Delete{i}",
                    last_name="User"
                )
                user = await user_crud.create(session, obj_in=user_data)
                user_ids.append(user.id)

        # Bulk delete
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_soft_delete(
                session,
                user_ids=user_ids
            )
            assert count == 3

        # Verify all are soft deleted
        async with AsyncTestingSessionLocal() as session:
            for user_id in user_ids:
                user = await user_crud.get(session, id=str(user_id))
                assert user.deleted_at is not None
                assert user.is_active is False

    @pytest.mark.asyncio
    async def test_bulk_soft_delete_with_exclusion(self, async_test_db):
        """Test bulk soft delete with excluded user_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create multiple users
        user_ids = []
        async with AsyncTestingSessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"exclude{i}@example.com",
                    password="SecurePass123!",
                    first_name=f"Exclude{i}",
                    last_name="User"
                )
                user = await user_crud.create(session, obj_in=user_data)
                user_ids.append(user.id)

        # Bulk delete, excluding first user
        exclude_id = user_ids[0]
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_soft_delete(
                session,
                user_ids=user_ids,
                exclude_user_id=exclude_id
            )
            assert count == 2  # Only 2 deleted

        # Verify excluded user is NOT deleted
        async with AsyncTestingSessionLocal() as session:
            excluded_user = await user_crud.get(session, id=str(exclude_id))
            assert excluded_user.deleted_at is None

    @pytest.mark.asyncio
    async def test_bulk_soft_delete_empty_list(self, async_test_db):
        """Test bulk delete with empty list returns 0."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_soft_delete(
                session,
                user_ids=[]
            )
            assert count == 0

    @pytest.mark.asyncio
    async def test_bulk_soft_delete_all_excluded(self, async_test_db):
        """Test bulk delete where all users are excluded."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create user
        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="onlyuser@example.com",
                password="SecurePass123!",
                first_name="Only",
                last_name="User"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id

        # Try to delete but exclude
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_soft_delete(
                session,
                user_ids=[user_id],
                exclude_user_id=user_id
            )
            assert count == 0

    @pytest.mark.asyncio
    async def test_bulk_soft_delete_already_deleted(self, async_test_db):
        """Test bulk delete doesn't re-delete already deleted users."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create and delete user
        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="predeleted@example.com",
                password="SecurePass123!",
                first_name="PreDeleted",
                last_name="User"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id

            # First deletion
            await user_crud.bulk_soft_delete(session, user_ids=[user_id])

        # Try to delete again
        async with AsyncTestingSessionLocal() as session:
            count = await user_crud.bulk_soft_delete(
                session,
                user_ids=[user_id]
            )
            assert count == 0  # Already deleted


class TestUtilityMethods:
    """Tests for utility methods."""

    @pytest.mark.asyncio
    async def test_is_active_true(self, async_test_db, async_test_user):
        """Test is_active returns True for active user_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))
            assert user_crud.is_active(user) is True

    @pytest.mark.asyncio
    async def test_is_active_false(self, async_test_db):
        """Test is_active returns False for inactive user_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user_data = UserCreate(
                email="inactive2@example.com",
                password="SecurePass123!",
                first_name="Inactive",
                last_name="User"
            )
            user = await user_crud.create(session, obj_in=user_data)
            await user_crud.update(session, db_obj=user, obj_in={"is_active": False})

            assert user_crud.is_active(user) is False

    @pytest.mark.asyncio
    async def test_is_superuser_true(self, async_test_db, async_test_superuser):
        """Test is_superuser returns True for superuser."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_superuser.id))
            assert user_crud.is_superuser(user) is True

    @pytest.mark.asyncio
    async def test_is_superuser_false(self, async_test_db, async_test_user):
        """Test is_superuser returns False for regular user_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))
            assert user_crud.is_superuser(user) is False
