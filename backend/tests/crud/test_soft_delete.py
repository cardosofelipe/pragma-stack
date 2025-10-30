# tests/crud/test_soft_delete.py
"""
Tests for soft delete functionality in CRUD operations.
"""
import pytest
from datetime import datetime, timezone

from app.models.user import User
from app.crud.user import user as user_crud


class TestSoftDelete:
    """Tests for soft delete functionality."""

    def test_soft_delete_marks_deleted_at(self, db_session):
        """Test that soft delete sets deleted_at timestamp."""
        # Create a user
        test_user = User(
            email="softdelete@example.com",
            password_hash="hashedpassword",
            first_name="Soft",
            last_name="Delete",
            is_active=True,
            is_superuser=False
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        user_id = test_user.id
        assert test_user.deleted_at is None

        # Soft delete the user
        deleted_user = user_crud.soft_delete(db_session, id=user_id)

        assert deleted_user is not None
        assert deleted_user.deleted_at is not None
        assert isinstance(deleted_user.deleted_at, datetime)

    def test_soft_delete_excludes_from_get_multi(self, db_session):
        """Test that soft deleted records are excluded from get_multi."""
        # Create two users
        user1 = User(
            email="user1@example.com",
            password_hash="hash1",
            first_name="User",
            last_name="One",
            is_active=True,
            is_superuser=False
        )
        user2 = User(
            email="user2@example.com",
            password_hash="hash2",
            first_name="User",
            last_name="Two",
            is_active=True,
            is_superuser=False
        )
        db_session.add_all([user1, user2])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)

        # Both users should be returned
        users, total = user_crud.get_multi_with_total(db_session)
        assert total >= 2
        user_emails = [u.email for u in users]
        assert "user1@example.com" in user_emails
        assert "user2@example.com" in user_emails

        # Soft delete user1
        user_crud.soft_delete(db_session, id=user1.id)

        # Only user2 should be returned
        users, total = user_crud.get_multi_with_total(db_session)
        user_emails = [u.email for u in users]
        assert "user1@example.com" not in user_emails
        assert "user2@example.com" in user_emails

    def test_soft_delete_still_retrievable_by_get(self, db_session):
        """Test that soft deleted records can still be retrieved by get() method."""
        # Create a user
        user = User(
            email="gettest@example.com",
            password_hash="hash",
            first_name="Get",
            last_name="Test",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id

        # User should be retrievable
        retrieved = user_crud.get(db_session, id=user_id)
        assert retrieved is not None
        assert retrieved.email == "gettest@example.com"
        assert retrieved.deleted_at is None

        # Soft delete the user
        user_crud.soft_delete(db_session, id=user_id)

        # User should still be retrievable by ID (soft delete doesn't prevent direct access)
        retrieved = user_crud.get(db_session, id=user_id)
        assert retrieved is not None
        assert retrieved.deleted_at is not None

    def test_soft_delete_nonexistent_record(self, db_session):
        """Test soft deleting a record that doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        result = user_crud.soft_delete(db_session, id=fake_id)
        assert result is None

    def test_restore_sets_deleted_at_to_none(self, db_session):
        """Test that restore clears the deleted_at timestamp."""
        # Create and soft delete a user
        user = User(
            email="restore@example.com",
            password_hash="hash",
            first_name="Restore",
            last_name="Test",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id

        # Soft delete
        user_crud.soft_delete(db_session, id=user_id)
        db_session.refresh(user)
        assert user.deleted_at is not None

        # Restore
        restored_user = user_crud.restore(db_session, id=user_id)

        assert restored_user is not None
        assert restored_user.deleted_at is None

    def test_restore_makes_record_available(self, db_session):
        """Test that restored records appear in queries."""
        # Create and soft delete a user
        user = User(
            email="available@example.com",
            password_hash="hash",
            first_name="Available",
            last_name="Test",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id
        user_email = user.email

        # Soft delete
        user_crud.soft_delete(db_session, id=user_id)

        # User should not be in query results
        users, _ = user_crud.get_multi_with_total(db_session)
        emails = [u.email for u in users]
        assert user_email not in emails

        # Restore
        user_crud.restore(db_session, id=user_id)

        # User should now be in query results
        users, _ = user_crud.get_multi_with_total(db_session)
        emails = [u.email for u in users]
        assert user_email in emails

    def test_restore_nonexistent_record(self, db_session):
        """Test restoring a record that doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()

        result = user_crud.restore(db_session, id=fake_id)
        assert result is None

    def test_restore_already_active_record(self, db_session):
        """Test restoring a record that was never deleted returns None."""
        # Create a user (not deleted)
        user = User(
            email="never_deleted@example.com",
            password_hash="hash",
            first_name="Never",
            last_name="Deleted",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id
        assert user.deleted_at is None

        # Restore should return None (record is not soft-deleted)
        restored = user_crud.restore(db_session, id=user_id)
        assert restored is None

    def test_soft_delete_multiple_times(self, db_session):
        """Test soft deleting the same record multiple times."""
        # Create a user
        user = User(
            email="multiple_delete@example.com",
            password_hash="hash",
            first_name="Multiple",
            last_name="Delete",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id

        # First soft delete
        first_deleted = user_crud.soft_delete(db_session, id=user_id)
        assert first_deleted is not None
        first_timestamp = first_deleted.deleted_at

        # Restore
        user_crud.restore(db_session, id=user_id)

        # Second soft delete
        second_deleted = user_crud.soft_delete(db_session, id=user_id)
        assert second_deleted is not None
        second_timestamp = second_deleted.deleted_at

        # Timestamps should be different
        assert second_timestamp != first_timestamp
        assert second_timestamp > first_timestamp

    def test_get_multi_with_filters_excludes_deleted(self, db_session):
        """Test that get_multi_with_total with filters excludes deleted records."""
        # Create active and inactive users
        active_user = User(
            email="active_not_deleted@example.com",
            password_hash="hash",
            first_name="Active",
            last_name="NotDeleted",
            is_active=True,
            is_superuser=False
        )
        inactive_user = User(
            email="inactive_not_deleted@example.com",
            password_hash="hash",
            first_name="Inactive",
            last_name="NotDeleted",
            is_active=False,
            is_superuser=False
        )
        deleted_active_user = User(
            email="active_deleted@example.com",
            password_hash="hash",
            first_name="Active",
            last_name="Deleted",
            is_active=True,
            is_superuser=False
        )

        db_session.add_all([active_user, inactive_user, deleted_active_user])
        db_session.commit()
        db_session.refresh(deleted_active_user)

        # Soft delete one active user
        user_crud.soft_delete(db_session, id=deleted_active_user.id)

        # Filter for active users - should only return non-deleted active user
        users, total = user_crud.get_multi_with_total(
            db_session,
            filters={"is_active": True}
        )

        emails = [u.email for u in users]
        assert "active_not_deleted@example.com" in emails
        assert "active_deleted@example.com" not in emails
        assert "inactive_not_deleted@example.com" not in emails

    def test_soft_delete_preserves_other_fields(self, db_session):
        """Test that soft delete doesn't modify other fields."""
        # Create a user with specific data
        user = User(
            email="preserve@example.com",
            password_hash="original_hash",
            first_name="Preserve",
            last_name="Fields",
            phone_number="+1234567890",
            is_active=True,
            is_superuser=False,
            preferences={"theme": "dark"}
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id
        original_email = user.email
        original_hash = user.password_hash
        original_first_name = user.first_name
        original_phone = user.phone_number
        original_preferences = user.preferences

        # Soft delete
        deleted = user_crud.soft_delete(db_session, id=user_id)

        # All other fields should remain unchanged
        assert deleted.email == original_email
        assert deleted.password_hash == original_hash
        assert deleted.first_name == original_first_name
        assert deleted.phone_number == original_phone
        assert deleted.preferences == original_preferences
        assert deleted.is_active is True  # is_active unchanged
