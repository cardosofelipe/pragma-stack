# tests/crud/test_base_db_failures.py
"""
Comprehensive tests for base CRUD database failure scenarios.
Tests exception handling, rollbacks, and error messages.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.exc import DataError, OperationalError

from app.core.repository_exceptions import IntegrityConstraintError
from app.repositories.user import user_repo as user_crud
from app.schemas.users import UserCreate


class TestBaseCRUDCreateFailures:
    """Test base CRUD create method exception handling."""

    @pytest.mark.asyncio
    async def test_create_operational_error_triggers_rollback(self, async_test_db):
        """Test that OperationalError triggers rollback (User CRUD catches as Exception)."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise OperationalError(
                    "Connection lost", {}, Exception("DB connection failed")
                )

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    user_data = UserCreate(
                        email="operror@example.com",
                        password="TestPassword123!",
                        first_name="Test",
                        last_name="User",
                    )

                    # User CRUD catches this as generic Exception and re-raises
                    with pytest.raises(OperationalError):
                        await user_crud.create(session, obj_in=user_data)

                    # Verify rollback was called
                    mock_rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_data_error_triggers_rollback(self, async_test_db):
        """Test that DataError triggers rollback (User CRUD catches as Exception)."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise DataError("Invalid data type", {}, Exception("Data overflow"))

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    user_data = UserCreate(
                        email="dataerror@example.com",
                        password="TestPassword123!",
                        first_name="Test",
                        last_name="User",
                    )

                    # User CRUD catches this as generic Exception and re-raises
                    with pytest.raises(DataError):
                        await user_crud.create(session, obj_in=user_data)

                    mock_rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_unexpected_exception_triggers_rollback(self, async_test_db):
        """Test that unexpected exceptions trigger rollback and re-raise."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise RuntimeError("Unexpected database error")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    user_data = UserCreate(
                        email="unexpected@example.com",
                        password="TestPassword123!",
                        first_name="Test",
                        last_name="User",
                    )

                    with pytest.raises(RuntimeError, match="Unexpected database error"):
                        await user_crud.create(session, obj_in=user_data)

                    mock_rollback.assert_called_once()


class TestBaseCRUDUpdateFailures:
    """Test base CRUD update method exception handling."""

    @pytest.mark.asyncio
    async def test_update_operational_error(self, async_test_db, async_test_user):
        """Test update with OperationalError."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            async def mock_commit():
                raise OperationalError("Connection timeout", {}, Exception("Timeout"))

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(IntegrityConstraintError, match="Database operation failed"):
                        await user_crud.update(
                            session, db_obj=user, obj_in={"first_name": "Updated"}
                        )

                    mock_rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_data_error(self, async_test_db, async_test_user):
        """Test update with DataError."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            async def mock_commit():
                raise DataError("Invalid data", {}, Exception("Data type mismatch"))

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(IntegrityConstraintError, match="Database operation failed"):
                        await user_crud.update(
                            session, db_obj=user, obj_in={"first_name": "Updated"}
                        )

                    mock_rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_unexpected_error(self, async_test_db, async_test_user):
        """Test update with unexpected error."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            user = await user_crud.get(session, id=str(async_test_user.id))

            async def mock_commit():
                raise KeyError("Unexpected error")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(KeyError):
                        await user_crud.update(
                            session, db_obj=user, obj_in={"first_name": "Updated"}
                        )

                    mock_rollback.assert_called_once()


class TestBaseCRUDRemoveFailures:
    """Test base CRUD remove method exception handling."""

    @pytest.mark.asyncio
    async def test_remove_unexpected_error_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test that unexpected errors in remove trigger rollback."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise RuntimeError("Database write failed")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(RuntimeError, match="Database write failed"):
                        await user_crud.remove(session, id=str(async_test_user.id))

                    mock_rollback.assert_called_once()


class TestBaseCRUDGetMultiWithTotalFailures:
    """Test get_multi_with_total exception handling."""

    @pytest.mark.asyncio
    async def test_get_multi_with_total_database_error(self, async_test_db):
        """Test get_multi_with_total handles database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:
            # Mock execute to raise an error

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Query failed", {}, Exception("Database error"))

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await user_crud.get_multi_with_total(session, skip=0, limit=10)


class TestBaseCRUDCountFailures:
    """Test count method exception handling."""

    @pytest.mark.asyncio
    async def test_count_database_error_propagates(self, async_test_db):
        """Test count propagates database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Count failed", {}, Exception("DB error"))

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await user_crud.count(session)


class TestBaseCRUDSoftDeleteFailures:
    """Test soft_delete method exception handling."""

    @pytest.mark.asyncio
    async def test_soft_delete_unexpected_error_triggers_rollback(
        self, async_test_db, async_test_user
    ):
        """Test soft_delete handles unexpected errors with rollback."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_commit():
                raise RuntimeError("Soft delete failed")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(RuntimeError, match="Soft delete failed"):
                        await user_crud.soft_delete(session, id=str(async_test_user.id))

                    mock_rollback.assert_called_once()


class TestBaseCRUDRestoreFailures:
    """Test restore method exception handling."""

    @pytest.mark.asyncio
    async def test_restore_unexpected_error_triggers_rollback(self, async_test_db):
        """Test restore handles unexpected errors with rollback."""
        _test_engine, SessionLocal = async_test_db

        # First create and soft delete a user
        async with SessionLocal() as session:
            user_data = UserCreate(
                email="restore_test@example.com",
                password="TestPassword123!",
                first_name="Restore",
                last_name="Test",
            )
            user = await user_crud.create(session, obj_in=user_data)
            user_id = user.id
            await session.commit()

        async with SessionLocal() as session:
            await user_crud.soft_delete(session, id=str(user_id))

        # Now test restore failure
        async with SessionLocal() as session:

            async def mock_commit():
                raise RuntimeError("Restore failed")

            with patch.object(session, "commit", side_effect=mock_commit):
                with patch.object(
                    session, "rollback", new_callable=AsyncMock
                ) as mock_rollback:
                    with pytest.raises(RuntimeError, match="Restore failed"):
                        await user_crud.restore(session, id=str(user_id))

                    mock_rollback.assert_called_once()


class TestBaseCRUDGetFailures:
    """Test get method exception handling."""

    @pytest.mark.asyncio
    async def test_get_database_error_propagates(self, async_test_db):
        """Test get propagates database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Get failed", {}, Exception("DB error"))

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await user_crud.get(session, id=str(uuid4()))


class TestBaseCRUDGetMultiFailures:
    """Test get_multi method exception handling."""

    @pytest.mark.asyncio
    async def test_get_multi_database_error_propagates(self, async_test_db):
        """Test get_multi propagates database errors."""
        _test_engine, SessionLocal = async_test_db

        async with SessionLocal() as session:

            async def mock_execute(*args, **kwargs):
                raise OperationalError("Query failed", {}, Exception("DB error"))

            with patch.object(session, "execute", side_effect=mock_execute):
                with pytest.raises(OperationalError):
                    await user_crud.get_multi(session, skip=0, limit=10)
