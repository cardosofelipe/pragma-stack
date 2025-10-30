# tests/crud/test_crud_error_paths.py
"""
Tests for CRUD error handling paths to increase coverage.
These tests focus on exception handling and edge cases.
"""
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.exc import IntegrityError, OperationalError

from app.models.user import User
from app.crud.user import user as user_crud
from app.schemas.users import UserCreate, UserUpdate


class TestCRUDErrorPaths:
    """Tests for error handling in CRUD operations."""

    def test_get_database_error(self, db_session):
        """Test get method handles database errors."""
        import uuid
        user_id = uuid.uuid4()

        with patch.object(db_session, 'query') as mock_query:
            mock_query.side_effect = OperationalError("statement", "params", "orig")

            with pytest.raises(OperationalError):
                user_crud.get(db_session, id=user_id)

    def test_get_multi_database_error(self, db_session):
        """Test get_multi handles database errors."""
        with patch.object(db_session, 'query') as mock_query:
            mock_query.side_effect = OperationalError("statement", "params", "orig")

            with pytest.raises(OperationalError):
                user_crud.get_multi(db_session, skip=0, limit=10)

    def test_create_integrity_error_non_unique(self, db_session):
        """Test create handles integrity errors for non-unique constraints."""
        # Create first user
        user_data = UserCreate(
            email="unique@example.com",
            password="Password123",
            first_name="First"
        )
        user_crud.create(db_session, obj_in=user_data)

        # Try to create duplicate
        with pytest.raises(ValueError, match="already exists"):
            user_crud.create(db_session, obj_in=user_data)

    def test_create_generic_integrity_error(self, db_session):
        """Test create handles other integrity errors."""
        user_data = UserCreate(
            email="integrityerror@example.com",
            password="Password123",
            first_name="Integrity"
        )

        with patch('app.crud.base.jsonable_encoder') as mock_encoder:
            mock_encoder.return_value = {"email": "test@example.com"}

            with patch.object(db_session, 'add') as mock_add:
                # Simulate a non-unique integrity error
                error = IntegrityError("statement", "params", Exception("check constraint failed"))
                mock_add.side_effect = error

                with pytest.raises(ValueError):
                    user_crud.create(db_session, obj_in=user_data)

    def test_create_unexpected_error(self, db_session):
        """Test create handles unexpected errors."""
        user_data = UserCreate(
            email="unexpectederror@example.com",
            password="Password123",
            first_name="Unexpected"
        )

        with patch.object(db_session, 'commit') as mock_commit:
            mock_commit.side_effect = Exception("Unexpected database error")

            with pytest.raises(Exception):
                user_crud.create(db_session, obj_in=user_data)

    def test_update_integrity_error(self, db_session):
        """Test update handles integrity errors."""
        # Create a user
        user = User(
            email="updateintegrity@example.com",
            password_hash="hash",
            first_name="Update",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create another user with a different email
        user2 = User(
            email="another@example.com",
            password_hash="hash",
            first_name="Another",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user2)
        db_session.commit()

        # Try to update user to have the same email as user2
        with patch.object(db_session, 'commit') as mock_commit:
            error = IntegrityError("statement", "params", Exception("UNIQUE constraint failed"))
            mock_commit.side_effect = error

            update_data = UserUpdate(email="another@example.com")
            with pytest.raises(ValueError, match="already exists"):
                user_crud.update(db_session, db_obj=user, obj_in=update_data)

    def test_update_unexpected_error(self, db_session):
        """Test update handles unexpected errors."""
        user = User(
            email="updateunexpected@example.com",
            password_hash="hash",
            first_name="Update",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        with patch.object(db_session, 'commit') as mock_commit:
            mock_commit.side_effect = Exception("Unexpected database error")

            update_data = UserUpdate(first_name="Error")
            with pytest.raises(Exception):
                user_crud.update(db_session, db_obj=user, obj_in=update_data)

    def test_remove_with_relationships(self, db_session):
        """Test remove handles cascade deletes."""
        user = User(
            email="removerelations@example.com",
            password_hash="hash",
            first_name="Remove",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Remove should succeed even with potential relationships
        removed = user_crud.remove(db_session, id=user.id)
        assert removed is not None
        assert removed.id == user.id

    def test_soft_delete_database_error(self, db_session):
        """Test soft_delete handles database errors."""
        user = User(
            email="softdeleteerror@example.com",
            password_hash="hash",
            first_name="SoftDelete",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        with patch.object(db_session, 'commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            with pytest.raises(Exception):
                user_crud.soft_delete(db_session, id=user.id)

    def test_restore_database_error(self, db_session):
        """Test restore handles database errors."""
        user = User(
            email="restoreerror@example.com",
            password_hash="hash",
            first_name="Restore",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # First soft delete
        user_crud.soft_delete(db_session, id=user.id)

        # Then try to restore with error
        with patch.object(db_session, 'commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            with pytest.raises(Exception):
                user_crud.restore(db_session, id=user.id)

    def test_get_multi_with_total_error_recovery(self, db_session):
        """Test get_multi_with_total handles errors gracefully."""
        # Test that it doesn't crash on invalid sort fields
        users, total = user_crud.get_multi_with_total(
            db_session,
            sort_by="nonexistent_field_xyz",
            sort_order="asc"
        )
        # Should still return results, just ignore invalid sort
        assert isinstance(users, list)
        assert isinstance(total, int)

    def test_update_with_model_dict(self, db_session):
        """Test update works with dict input."""
        user = User(
            email="updatedict2@example.com",
            password_hash="hash",
            first_name="Original",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Update with plain dict
        update_data = {"first_name": "DictUpdated"}
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        assert updated.first_name == "DictUpdated"

    def test_update_preserves_unchanged_fields(self, db_session):
        """Test that update doesn't modify unspecified fields."""
        user = User(
            email="preserve@example.com",
            password_hash="original_hash",
            first_name="Original",
            last_name="Name",
            phone_number="+1234567890",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        original_password = user.password_hash
        original_phone = user.phone_number

        # Only update first_name
        update_data = UserUpdate(first_name="Updated")
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        assert updated.first_name == "Updated"
        assert updated.password_hash == original_password  # Unchanged
        assert updated.phone_number == original_phone  # Unchanged
        assert updated.last_name == "Name"  # Unchanged


class TestCRUDValidation:
    """Tests for validation in CRUD operations."""

    def test_get_multi_with_empty_results(self, db_session):
        """Test get_multi with no results."""
        # Query with filters that return no results
        users, total = user_crud.get_multi_with_total(
            db_session,
            filters={"email": "nonexistent@example.com"}
        )

        assert users == []
        assert total == 0

    def test_get_multi_with_large_offset(self, db_session):
        """Test get_multi with offset larger than total records."""
        users = user_crud.get_multi(db_session, skip=10000, limit=10)
        assert users == []

    def test_update_with_no_changes(self, db_session):
        """Test update when no fields are changed."""
        user = User(
            email="nochanges@example.com",
            password_hash="hash",
            first_name="NoChanges",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Update with empty dict
        update_data = {}
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        # Should still return the user, unchanged
        assert updated.id == user.id
        assert updated.first_name == "NoChanges"
