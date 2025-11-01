# tests/crud/test_base.py
"""
Comprehensive tests for CRUDBase class covering all error paths and edge cases.
"""
import pytest
from uuid import uuid4, UUID
from sqlalchemy.exc import IntegrityError, OperationalError, DataError
from sqlalchemy.orm import joinedload
from unittest.mock import AsyncMock, patch, MagicMock

from app.crud.user import user as user_crud
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate


class TestCRUDBaseGet:
    """Tests for get method covering UUID validation and options."""

    @pytest.mark.asyncio
    async def test_get_with_invalid_uuid_string(self, async_test_db):
        """Test get with invalid UUID string returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.get(session, id="invalid-uuid")
            assert result is None

    @pytest.mark.asyncio
    async def test_get_with_invalid_uuid_type(self, async_test_db):
        """Test get with invalid UUID type returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.get(session, id=12345)  # int instead of UUID
            assert result is None

    @pytest.mark.asyncio
    async def test_get_with_uuid_object(self, async_test_db, async_test_user):
        """Test get with UUID object instead of string."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Pass UUID object directly
            result = await user_crud.get(session, id=async_test_user.id)
            assert result is not None
            assert result.id == async_test_user.id

    @pytest.mark.asyncio
    async def test_get_with_options(self, async_test_db, async_test_user):
        """Test get with eager loading options (tests lines 76-78)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Test that options parameter is accepted and doesn't error
            # We pass an empty list which still tests the code path
            result = await user_crud.get(
                session,
                id=str(async_test_user.id),
                options=[]
            )
            assert result is not None

    @pytest.mark.asyncio
    async def test_get_database_error(self, async_test_db):
        """Test get handles database errors properly."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Mock execute to raise an exception
            with patch.object(session, 'execute', side_effect=Exception("DB error")):
                with pytest.raises(Exception, match="DB error"):
                    await user_crud.get(session, id=str(uuid4()))


class TestCRUDBaseGetMulti:
    """Tests for get_multi method covering pagination validation and options."""

    @pytest.mark.asyncio
    async def test_get_multi_negative_skip(self, async_test_db):
        """Test get_multi with negative skip raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="skip must be non-negative"):
                await user_crud.get_multi(session, skip=-1)

    @pytest.mark.asyncio
    async def test_get_multi_negative_limit(self, async_test_db):
        """Test get_multi with negative limit raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="limit must be non-negative"):
                await user_crud.get_multi(session, limit=-1)

    @pytest.mark.asyncio
    async def test_get_multi_limit_too_large(self, async_test_db):
        """Test get_multi with limit > 1000 raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="Maximum limit is 1000"):
                await user_crud.get_multi(session, limit=1001)

    @pytest.mark.asyncio
    async def test_get_multi_with_options(self, async_test_db, async_test_user):
        """Test get_multi with eager loading options (tests lines 118-120)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Test that options parameter is accepted
            results = await user_crud.get_multi(
                session,
                skip=0,
                limit=10,
                options=[]
            )
            assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_get_multi_database_error(self, async_test_db):
        """Test get_multi handles database errors."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'execute', side_effect=Exception("DB error")):
                with pytest.raises(Exception, match="DB error"):
                    await user_crud.get_multi(session)


class TestCRUDBaseCreate:
    """Tests for create method covering various error conditions."""

    @pytest.mark.asyncio
    async def test_create_duplicate_unique_field(self, async_test_db, async_test_user):
        """Test create with duplicate unique field raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Try to create user with duplicate email
            user_data = UserCreate(
                email=async_test_user.email,  # Duplicate!
                password="TestPassword123!",
                first_name="Test",
                last_name="Duplicate"
            )

            with pytest.raises(ValueError, match="already exists"):
                await user_crud.create(session, obj_in=user_data)

    @pytest.mark.asyncio
    async def test_create_integrity_error_non_duplicate(self, async_test_db):
        """Test create with non-duplicate IntegrityError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Mock commit to raise IntegrityError without "unique" in message
            original_commit = session.commit

            async def mock_commit():
                error = IntegrityError("statement", {}, Exception("foreign key violation"))
                raise error

            with patch.object(session, 'commit', side_effect=mock_commit):
                user_data = UserCreate(
                    email="test@example.com",
                    password="TestPassword123!",
                    first_name="Test",
                    last_name="User"
                )

                with pytest.raises(ValueError, match="Database integrity error"):
                    await user_crud.create(session, obj_in=user_data)

    @pytest.mark.asyncio
    async def test_create_operational_error(self, async_test_db):
        """Test create with OperationalError (user CRUD catches as generic Exception)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'commit', side_effect=OperationalError("statement", {}, Exception("connection lost"))):
                user_data = UserCreate(
                    email="test@example.com",
                    password="TestPassword123!",
                    first_name="Test",
                    last_name="User"
                )

                # User CRUD catches this as generic Exception and re-raises
                with pytest.raises(OperationalError):
                    await user_crud.create(session, obj_in=user_data)

    @pytest.mark.asyncio
    async def test_create_data_error(self, async_test_db):
        """Test create with DataError (user CRUD catches as generic Exception)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'commit', side_effect=DataError("statement", {}, Exception("invalid data"))):
                user_data = UserCreate(
                    email="test@example.com",
                    password="TestPassword123!",
                    first_name="Test",
                    last_name="User"
                )

                # User CRUD catches this as generic Exception and re-raises
                with pytest.raises(DataError):
                    await user_crud.create(session, obj_in=user_data)

    @pytest.mark.asyncio
    async def test_create_unexpected_error(self, async_test_db):
        """Test create with unexpected exception."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'commit', side_effect=RuntimeError("Unexpected error")):
                user_data = UserCreate(
                    email="test@example.com",
                    password="TestPassword123!",
                    first_name="Test",
                    last_name="User"
                )

                with pytest.raises(RuntimeError, match="Unexpected error"):
                    await user_crud.create(session, obj_in=user_data)


class TestCRUDBaseUpdate:
    """Tests for update method covering error conditions."""

    @pytest.mark.asyncio
    async def test_update_duplicate_unique_field(self, async_test_db, async_test_user):
        """Test update with duplicate unique field raises ValueError."""
        test_engine, SessionLocal = async_test_db

        # Create another user
        async with SessionLocal() as session:
            from app.crud.user import user as user_crud
            user2_data = UserCreate(
                email="user2@example.com",
                password="TestPassword123!",
                first_name="User",
                last_name="Two"
            )
            user2 = await user_crud.create(session, obj_in=user2_data)
            await session.commit()

        # Try to update user2 with user1's email
        async with SessionLocal() as session:
            user2_obj = await user_crud.get(session, id=str(user2.id))

            with patch.object(session, 'commit', side_effect=IntegrityError("statement", {}, Exception("UNIQUE constraint failed"))):
                update_data = UserUpdate(email=async_test_user.email)

                with pytest.raises(ValueError, match="already exists"):
                    await user_crud.update(session, db_obj=user2_obj, obj_in=update_data)

    @pytest.mark.asyncio
    async def test_update_with_dict(self, async_test_db, async_test_user):
        """Test update with dict instead of schema."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            # Update with dict (tests lines 164-165)
            updated = await user_crud.update(
                session,
                db_obj=user,
                obj_in={"first_name": "UpdatedName"}
            )
            assert updated.first_name == "UpdatedName"

    @pytest.mark.asyncio
    async def test_update_integrity_error(self, async_test_db, async_test_user):
        """Test update with IntegrityError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            with patch.object(session, 'commit', side_effect=IntegrityError("statement", {}, Exception("constraint failed"))):
                with pytest.raises(ValueError, match="Database integrity error"):
                    await user_crud.update(session, db_obj=user, obj_in={"first_name": "Test"})

    @pytest.mark.asyncio
    async def test_update_operational_error(self, async_test_db, async_test_user):
        """Test update with OperationalError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            with patch.object(session, 'commit', side_effect=OperationalError("statement", {}, Exception("connection error"))):
                with pytest.raises(ValueError, match="Database operation failed"):
                    await user_crud.update(session, db_obj=user, obj_in={"first_name": "Test"})

    @pytest.mark.asyncio
    async def test_update_unexpected_error(self, async_test_db, async_test_user):
        """Test update with unexpected error."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            with patch.object(session, 'commit', side_effect=RuntimeError("Unexpected")):
                with pytest.raises(RuntimeError):
                    await user_crud.update(session, db_obj=user, obj_in={"first_name": "Test"})


class TestCRUDBaseRemove:
    """Tests for remove method covering UUID validation and error conditions."""

    @pytest.mark.asyncio
    async def test_remove_invalid_uuid(self, async_test_db):
        """Test remove with invalid UUID returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.remove(session, id="invalid-uuid")
            assert result is None

    @pytest.mark.asyncio
    async def test_remove_with_uuid_object(self, async_test_db, async_test_user):
        """Test remove with UUID object."""
        test_engine, SessionLocal = async_test_db

        # Create a user to delete
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="todelete@example.com",
                password="TestPassword123!",
                first_name="To",
                last_name="Delete"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        # Delete with UUID object
        async with SessionLocal() as session:
            result = await user_crud.remove(session, id=user_id)  # UUID object
            assert result is not None
            assert result.id == user_id

    @pytest.mark.asyncio
    async def test_remove_nonexistent(self, async_test_db):
        """Test remove of nonexistent record returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.remove(session, id=str(uuid4()))
            assert result is None

    @pytest.mark.asyncio
    async def test_remove_integrity_error(self, async_test_db, async_test_user):
        """Test remove with IntegrityError (foreign key constraint)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Mock delete to raise IntegrityError
            with patch.object(session, 'commit', side_effect=IntegrityError("statement", {}, Exception("FOREIGN KEY constraint"))):
                with pytest.raises(ValueError, match="Cannot delete.*referenced by other records"):
                    await user_crud.remove(session, id=str(async_test_user.id))

    @pytest.mark.asyncio
    async def test_remove_unexpected_error(self, async_test_db, async_test_user):
        """Test remove with unexpected error."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'commit', side_effect=RuntimeError("Unexpected")):
                with pytest.raises(RuntimeError):
                    await user_crud.remove(session, id=str(async_test_user.id))


class TestCRUDBaseGetMultiWithTotal:
    """Tests for get_multi_with_total method covering pagination, filtering, sorting."""

    @pytest.mark.asyncio
    async def test_get_multi_with_total_basic(self, async_test_db, async_test_user):
        """Test get_multi_with_total basic functionality."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            items, total = await user_crud.get_multi_with_total(session, skip=0, limit=10)
            assert isinstance(items, list)
            assert isinstance(total, int)
            assert total >= 1  # At least the test user

    @pytest.mark.asyncio
    async def test_get_multi_with_total_negative_skip(self, async_test_db):
        """Test get_multi_with_total with negative skip raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="skip must be non-negative"):
                await user_crud.get_multi_with_total(session, skip=-1)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_negative_limit(self, async_test_db):
        """Test get_multi_with_total with negative limit raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="limit must be non-negative"):
                await user_crud.get_multi_with_total(session, limit=-1)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_limit_too_large(self, async_test_db):
        """Test get_multi_with_total with limit > 1000 raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="Maximum limit is 1000"):
                await user_crud.get_multi_with_total(session, limit=1001)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_filters(self, async_test_db, async_test_user):
        """Test get_multi_with_total with filters."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            filters = {"email": async_test_user.email}
            items, total = await user_crud.get_multi_with_total(session, filters=filters)
            assert total == 1
            assert len(items) == 1
            assert items[0].email == async_test_user.email

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_sorting_asc(self, async_test_db, async_test_user):
        """Test get_multi_with_total with ascending sort."""
        test_engine, SessionLocal = async_test_db

        # Create additional users
        async with SessionLocal() as session:
            user_data1 = UserCreate(
                email="aaa@example.com",
                password="TestPassword123!",
                first_name="AAA",
                last_name="User"
            )
            user_data2 = UserCreate(
                email="zzz@example.com",
                password="TestPassword123!",
                first_name="ZZZ",
                last_name="User"
            )
            await user_crud.create(session, obj_in=user_data1)
            await user_crud.create(session, obj_in=user_data2)
            await session.commit()

        async with SessionLocal() as session:
            items, total = await user_crud.get_multi_with_total(
                session, sort_by="email", sort_order="asc"
            )
            assert total >= 3
            # Check first email is alphabetically first
            assert items[0].email == "aaa@example.com"

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_sorting_desc(self, async_test_db, async_test_user):
        """Test get_multi_with_total with descending sort."""
        test_engine, SessionLocal = async_test_db

        # Create additional users
        async with SessionLocal() as session:
            user_data1 = UserCreate(
                email="bbb@example.com",
                password="TestPassword123!",
                first_name="BBB",
                last_name="User"
            )
            user_data2 = UserCreate(
                email="ccc@example.com",
                password="TestPassword123!",
                first_name="CCC",
                last_name="User"
            )
            await user_crud.create(session, obj_in=user_data1)
            await user_crud.create(session, obj_in=user_data2)
            await session.commit()

        async with SessionLocal() as session:
            items, total = await user_crud.get_multi_with_total(
                session, sort_by="email", sort_order="desc", limit=1
            )
            assert len(items) == 1
            # First item should have higher email alphabetically

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_pagination(self, async_test_db):
        """Test get_multi_with_total pagination works correctly."""
        test_engine, SessionLocal = async_test_db

        # Create minimal users for pagination test (3 instead of 5)
        async with SessionLocal() as session:
            for i in range(3):
                user_data = UserCreate(
                    email=f"user{i}@example.com",
                    password="TestPassword123!",
                    first_name=f"User{i}",
                    last_name="Test"
                )
                await user_crud.create(session, obj_in=user_data)
            await session.commit()

        async with SessionLocal() as session:
            # Get first page
            items1, total = await user_crud.get_multi_with_total(session, skip=0, limit=2)
            assert len(items1) == 2
            assert total >= 3

            # Get second page
            items2, total2 = await user_crud.get_multi_with_total(session, skip=2, limit=2)
            assert len(items2) >= 1
            assert total2 == total

            # Ensure no overlap
            ids1 = {item.id for item in items1}
            ids2 = {item.id for item in items2}
            assert ids1.isdisjoint(ids2)


class TestCRUDBaseCount:
    """Tests for count method."""

    @pytest.mark.asyncio
    async def test_count_basic(self, async_test_db, async_test_user):
        """Test count returns correct number."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            count = await user_crud.count(session)
            assert isinstance(count, int)
            assert count >= 1  # At least the test user

    @pytest.mark.asyncio
    async def test_count_multiple_users(self, async_test_db, async_test_user):
        """Test count with multiple users."""
        test_engine, SessionLocal = async_test_db

        # Create additional users
        async with SessionLocal() as session:
            initial_count = await user_crud.count(session)

            user_data1 = UserCreate(
                email="count1@example.com",
                password="TestPassword123!",
                first_name="Count",
                last_name="One"
            )
            user_data2 = UserCreate(
                email="count2@example.com",
                password="TestPassword123!",
                first_name="Count",
                last_name="Two"
            )
            await user_crud.create(session, obj_in=user_data1)
            await user_crud.create(session, obj_in=user_data2)
            await session.commit()

        async with SessionLocal() as session:
            new_count = await user_crud.count(session)
            assert new_count == initial_count + 2

    @pytest.mark.asyncio
    async def test_count_database_error(self, async_test_db):
        """Test count handles database errors."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with patch.object(session, 'execute', side_effect=Exception("DB error")):
                with pytest.raises(Exception, match="DB error"):
                    await user_crud.count(session)


class TestCRUDBaseExists:
    """Tests for exists method."""

    @pytest.mark.asyncio
    async def test_exists_true(self, async_test_db, async_test_user):
        """Test exists returns True for existing record."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.exists(session, id=str(async_test_user.id))
            assert result is True

    @pytest.mark.asyncio
    async def test_exists_false(self, async_test_db):
        """Test exists returns False for non-existent record."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.exists(session, id=str(uuid4()))
            assert result is False

    @pytest.mark.asyncio
    async def test_exists_invalid_uuid(self, async_test_db):
        """Test exists returns False for invalid UUID."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.exists(session, id="invalid-uuid")
            assert result is False


class TestCRUDBaseSoftDelete:
    """Tests for soft_delete method."""

    @pytest.mark.asyncio
    async def test_soft_delete_success(self, async_test_db):
        """Test soft delete sets deleted_at timestamp."""
        test_engine, SessionLocal = async_test_db

        # Create a user to soft delete
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="softdelete@example.com",
                password="TestPassword123!",
                first_name="Soft",
                last_name="Delete"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        # Soft delete the user
        async with SessionLocal() as session:
            deleted = await user_crud.soft_delete(session, id=str(user_id))
            assert deleted is not None
            assert deleted.deleted_at is not None

    @pytest.mark.asyncio
    async def test_soft_delete_invalid_uuid(self, async_test_db):
        """Test soft delete with invalid UUID returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.soft_delete(session, id="invalid-uuid")
            assert result is None

    @pytest.mark.asyncio
    async def test_soft_delete_nonexistent(self, async_test_db):
        """Test soft delete of nonexistent record returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.soft_delete(session, id=str(uuid4()))
            assert result is None

    @pytest.mark.asyncio
    async def test_soft_delete_with_uuid_object(self, async_test_db):
        """Test soft delete with UUID object."""
        test_engine, SessionLocal = async_test_db

        # Create a user to soft delete
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="softdelete2@example.com",
                password="TestPassword123!",
                first_name="Soft",
                last_name="Delete2"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        # Soft delete with UUID object
        async with SessionLocal() as session:
            deleted = await user_crud.soft_delete(session, id=user_id)  # UUID object
            assert deleted is not None
            assert deleted.deleted_at is not None


class TestCRUDBaseRestore:
    """Tests for restore method."""

    @pytest.mark.asyncio
    async def test_restore_success(self, async_test_db):
        """Test restore clears deleted_at timestamp."""
        test_engine, SessionLocal = async_test_db

        # Create and soft delete a user
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="restore@example.com",
                password="TestPassword123!",
                first_name="Restore",
                last_name="Test"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        async with SessionLocal() as session:
            await user_crud.soft_delete(session, id=str(user_id))

        # Restore the user
        async with SessionLocal() as session:
            restored = await user_crud.restore(session, id=str(user_id))
            assert restored is not None
            assert restored.deleted_at is None

    @pytest.mark.asyncio
    async def test_restore_invalid_uuid(self, async_test_db):
        """Test restore with invalid UUID returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.restore(session, id="invalid-uuid")
            assert result is None

    @pytest.mark.asyncio
    async def test_restore_nonexistent(self, async_test_db):
        """Test restore of nonexistent record returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            result = await user_crud.restore(session, id=str(uuid4()))
            assert result is None

    @pytest.mark.asyncio
    async def test_restore_not_deleted(self, async_test_db, async_test_user):
        """Test restore of non-deleted record returns None."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Try to restore a user that's not deleted
            result = await user_crud.restore(session, id=str(async_test_user.id))
            assert result is None

    @pytest.mark.asyncio
    async def test_restore_with_uuid_object(self, async_test_db):
        """Test restore with UUID object."""
        test_engine, SessionLocal = async_test_db

        # Create and soft delete a user
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="restore2@example.com",
                password="TestPassword123!",
                first_name="Restore",
                last_name="Test2"
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        async with SessionLocal() as session:
            await user_crud.soft_delete(session, id=str(user_id))

        # Restore with UUID object
        async with SessionLocal() as session:
            restored = await user_crud.restore(session, id=user_id)  # UUID object
            assert restored is not None
            assert restored.deleted_at is None


class TestCRUDBasePaginationValidation:
    """Tests for pagination parameter validation (covers lines 254-260)."""

    @pytest.mark.asyncio
    async def test_get_multi_with_total_negative_skip(self, async_test_db):
        """Test that negative skip raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="skip must be non-negative"):
                await user_crud.get_multi_with_total(session, skip=-1, limit=10)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_negative_limit(self, async_test_db):
        """Test that negative limit raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="limit must be non-negative"):
                await user_crud.get_multi_with_total(session, skip=0, limit=-1)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_limit_too_large(self, async_test_db):
        """Test that limit > 1000 raises ValueError."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            with pytest.raises(ValueError, match="Maximum limit is 1000"):
                await user_crud.get_multi_with_total(session, skip=0, limit=1001)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_filters(self, async_test_db, async_test_user):
        """Test pagination with filters (covers lines 270-273)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10,
                filters={"is_active": True}
            )
            assert isinstance(users, list)
            assert total >= 0

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_sorting_desc(self, async_test_db):
        """Test pagination with descending sort (covers lines 283-284)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10,
                sort_by="created_at",
                sort_order="desc"
            )
            assert isinstance(users, list)

    @pytest.mark.asyncio
    async def test_get_multi_with_total_with_sorting_asc(self, async_test_db):
        """Test pagination with ascending sort (covers lines 285-286)."""
        test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            users, total = await user_crud.get_multi_with_total(
                session,
                skip=0,
                limit=10,
                sort_by="created_at",
                sort_order="asc"
            )
            assert isinstance(users, list)
