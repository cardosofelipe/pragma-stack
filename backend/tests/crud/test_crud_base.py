# tests/crud/test_crud_base.py
"""
Tests for CRUD base operations.
"""
import pytest
from uuid import uuid4

from app.models.user import User
from app.crud.user import user as user_crud
from app.schemas.users import UserCreate, UserUpdate


class TestCRUDGet:
    """Tests for CRUD get operations."""

    def test_get_by_valid_uuid(self, db_session):
        """Test getting a record by valid UUID."""
        user = User(
            email="get_uuid@example.com",
            password_hash="hash",
            first_name="Get",
            last_name="UUID",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        retrieved = user_crud.get(db_session, id=user.id)
        assert retrieved is not None
        assert retrieved.id == user.id
        assert retrieved.email == user.email

    def test_get_by_string_uuid(self, db_session):
        """Test getting a record by UUID string."""
        user = User(
            email="get_string@example.com",
            password_hash="hash",
            first_name="Get",
            last_name="String",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        retrieved = user_crud.get(db_session, id=str(user.id))
        assert retrieved is not None
        assert retrieved.id == user.id

    def test_get_nonexistent(self, db_session):
        """Test getting a non-existent record."""
        fake_id = uuid4()
        result = user_crud.get(db_session, id=fake_id)
        assert result is None

    def test_get_invalid_uuid(self, db_session):
        """Test getting with invalid UUID format."""
        result = user_crud.get(db_session, id="not-a-uuid")
        assert result is None


class TestCRUDGetMulti:
    """Tests for get_multi operations."""

    def test_get_multi_basic(self, db_session):
        """Test basic get_multi functionality."""
        # Create multiple users
        users = [
            User(email=f"multi{i}@example.com", password_hash="hash", first_name=f"User{i}",
                 is_active=True, is_superuser=False)
            for i in range(5)
        ]
        db_session.add_all(users)
        db_session.commit()

        results = user_crud.get_multi(db_session, skip=0, limit=10)
        assert len(results) >= 5

    def test_get_multi_pagination(self, db_session):
        """Test pagination with get_multi."""
        # Create users
        users = [
            User(email=f"page{i}@example.com", password_hash="hash", first_name=f"Page{i}",
                 is_active=True, is_superuser=False)
            for i in range(10)
        ]
        db_session.add_all(users)
        db_session.commit()

        # First page
        page1 = user_crud.get_multi(db_session, skip=0, limit=3)
        assert len(page1) == 3

        # Second page
        page2 = user_crud.get_multi(db_session, skip=3, limit=3)
        assert len(page2) == 3

        # Pages should have different users
        page1_ids = {u.id for u in page1}
        page2_ids = {u.id for u in page2}
        assert len(page1_ids.intersection(page2_ids)) == 0

    def test_get_multi_negative_skip(self, db_session):
        """Test that negative skip raises ValueError."""
        with pytest.raises(ValueError, match="skip must be non-negative"):
            user_crud.get_multi(db_session, skip=-1, limit=10)

    def test_get_multi_negative_limit(self, db_session):
        """Test that negative limit raises ValueError."""
        with pytest.raises(ValueError, match="limit must be non-negative"):
            user_crud.get_multi(db_session, skip=0, limit=-1)

    def test_get_multi_limit_too_large(self, db_session):
        """Test that limit over 1000 raises ValueError."""
        with pytest.raises(ValueError, match="Maximum limit is 1000"):
            user_crud.get_multi(db_session, skip=0, limit=1001)


class TestCRUDGetMultiWithTotal:
    """Tests for get_multi_with_total operations."""

    def test_get_multi_with_total_basic(self, db_session):
        """Test basic get_multi_with_total functionality."""
        # Create users
        users = [
            User(email=f"total{i}@example.com", password_hash="hash", first_name=f"Total{i}",
                 is_active=True, is_superuser=False)
            for i in range(7)
        ]
        db_session.add_all(users)
        db_session.commit()

        results, total = user_crud.get_multi_with_total(db_session, skip=0, limit=10)
        assert total >= 7
        assert len(results) >= 7

    def test_get_multi_with_total_pagination(self, db_session):
        """Test pagination returns correct total."""
        # Create users
        users = [
            User(email=f"pagetotal{i}@example.com", password_hash="hash", first_name=f"PageTotal{i}",
                 is_active=True, is_superuser=False)
            for i in range(15)
        ]
        db_session.add_all(users)
        db_session.commit()

        # First page
        page1, total1 = user_crud.get_multi_with_total(db_session, skip=0, limit=5)
        assert len(page1) == 5
        assert total1 >= 15

        # Second page should have same total
        page2, total2 = user_crud.get_multi_with_total(db_session, skip=5, limit=5)
        assert len(page2) == 5
        assert total2 == total1

    def test_get_multi_with_total_sorting_asc(self, db_session):
        """Test sorting in ascending order."""
        # Create users
        users = [
            User(email=f"sort{i}@example.com", password_hash="hash", first_name=f"User{chr(90-i)}",
                 is_active=True, is_superuser=False)
            for i in range(5)
        ]
        db_session.add_all(users)
        db_session.commit()

        results, _ = user_crud.get_multi_with_total(
            db_session,
            sort_by="first_name",
            sort_order="asc"
        )

        # Check that results are sorted
        first_names = [u.first_name for u in results if u.first_name.startswith("User")]
        assert first_names == sorted(first_names)

    def test_get_multi_with_total_sorting_desc(self, db_session):
        """Test sorting in descending order."""
        # Create users
        users = [
            User(email=f"desc{i}@example.com", password_hash="hash", first_name=f"User{chr(65+i)}",
                 is_active=True, is_superuser=False)
            for i in range(5)
        ]
        db_session.add_all(users)
        db_session.commit()

        results, _ = user_crud.get_multi_with_total(
            db_session,
            sort_by="first_name",
            sort_order="desc"
        )

        # Check that results are sorted descending
        first_names = [u.first_name for u in results if u.first_name.startswith("User")]
        assert first_names == sorted(first_names, reverse=True)

    def test_get_multi_with_total_filtering(self, db_session):
        """Test filtering with get_multi_with_total."""
        # Create active and inactive users
        active_user = User(
            email="active_filter@example.com",
            password_hash="hash",
            first_name="Active",
            is_active=True,
            is_superuser=False
        )
        inactive_user = User(
            email="inactive_filter@example.com",
            password_hash="hash",
            first_name="Inactive",
            is_active=False,
            is_superuser=False
        )
        db_session.add_all([active_user, inactive_user])
        db_session.commit()

        # Filter for active users only
        results, total = user_crud.get_multi_with_total(
            db_session,
            filters={"is_active": True}
        )

        emails = [u.email for u in results]
        assert "active_filter@example.com" in emails
        assert "inactive_filter@example.com" not in emails

    def test_get_multi_with_total_multiple_filters(self, db_session):
        """Test multiple filters."""
        # Create users with different combinations
        user1 = User(
            email="multi1@example.com",
            password_hash="hash",
            first_name="User1",
            is_active=True,
            is_superuser=True
        )
        user2 = User(
            email="multi2@example.com",
            password_hash="hash",
            first_name="User2",
            is_active=True,
            is_superuser=False
        )
        user3 = User(
            email="multi3@example.com",
            password_hash="hash",
            first_name="User3",
            is_active=False,
            is_superuser=True
        )
        db_session.add_all([user1, user2, user3])
        db_session.commit()

        # Filter for active superusers
        results, _ = user_crud.get_multi_with_total(
            db_session,
            filters={"is_active": True, "is_superuser": True}
        )

        emails = [u.email for u in results]
        assert "multi1@example.com" in emails
        assert "multi2@example.com" not in emails
        assert "multi3@example.com" not in emails

    def test_get_multi_with_total_nonexistent_sort_field(self, db_session):
        """Test sorting by non-existent field is ignored."""
        results, _ = user_crud.get_multi_with_total(
            db_session,
            sort_by="nonexistent_field",
            sort_order="asc"
        )

        # Should not raise an error, just ignore the invalid sort field
        assert results is not None

    def test_get_multi_with_total_nonexistent_filter_field(self, db_session):
        """Test filtering by non-existent field is ignored."""
        results, _ = user_crud.get_multi_with_total(
            db_session,
            filters={"nonexistent_field": "value"}
        )

        # Should not raise an error, just ignore the invalid filter
        assert results is not None

    def test_get_multi_with_total_none_filter_values(self, db_session):
        """Test that None filter values are ignored."""
        user = User(
            email="none_filter@example.com",
            password_hash="hash",
            first_name="None",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()

        # Pass None as a filter value - should be ignored
        results, _ = user_crud.get_multi_with_total(
            db_session,
            filters={"is_active": None}
        )

        # Should return all users (not filtered)
        assert len(results) >= 1


class TestCRUDCreate:
    """Tests for create operations."""

    def test_create_basic(self, db_session):
        """Test basic record creation."""
        user_data = UserCreate(
            email="create@example.com",
            password="Password123",
            first_name="Create",
            last_name="Test"
        )

        created = user_crud.create(db_session, obj_in=user_data)

        assert created.id is not None
        assert created.email == "create@example.com"
        assert created.first_name == "Create"

    def test_create_duplicate_email(self, db_session):
        """Test that creating duplicate email raises error."""
        user_data = UserCreate(
            email="duplicate@example.com",
            password="Password123",
            first_name="First"
        )

        # Create first user
        user_crud.create(db_session, obj_in=user_data)

        # Try to create duplicate
        with pytest.raises(ValueError, match="already exists"):
            user_crud.create(db_session, obj_in=user_data)


class TestCRUDUpdate:
    """Tests for update operations."""

    def test_update_basic(self, db_session):
        """Test basic record update."""
        user = User(
            email="update@example.com",
            password_hash="hash",
            first_name="Original",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        update_data = UserUpdate(first_name="Updated")
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        assert updated.first_name == "Updated"
        assert updated.email == "update@example.com"  # Unchanged

    def test_update_with_dict(self, db_session):
        """Test updating with dictionary."""
        user = User(
            email="updatedict@example.com",
            password_hash="hash",
            first_name="Original",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        update_data = {"first_name": "DictUpdated", "last_name": "DictLast"}
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        assert updated.first_name == "DictUpdated"
        assert updated.last_name == "DictLast"

    def test_update_partial(self, db_session):
        """Test partial update (only some fields)."""
        user = User(
            email="partial@example.com",
            password_hash="hash",
            first_name="First",
            last_name="Last",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Only update last_name
        update_data = UserUpdate(last_name="NewLast")
        updated = user_crud.update(db_session, db_obj=user, obj_in=update_data)

        assert updated.first_name == "First"  # Unchanged
        assert updated.last_name == "NewLast"  # Changed


class TestCRUDRemove:
    """Tests for remove (hard delete) operations."""

    def test_remove_basic(self, db_session):
        """Test basic record removal."""
        user = User(
            email="remove@example.com",
            password_hash="hash",
            first_name="Remove",
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        user_id = user.id

        # Remove the user
        removed = user_crud.remove(db_session, id=user_id)

        assert removed is not None
        assert removed.id == user_id

        # User should no longer exist
        retrieved = user_crud.get(db_session, id=user_id)
        assert retrieved is None

    def test_remove_nonexistent(self, db_session):
        """Test removing non-existent record."""
        fake_id = uuid4()
        result = user_crud.remove(db_session, id=fake_id)
        assert result is None

    def test_remove_invalid_uuid(self, db_session):
        """Test removing with invalid UUID."""
        result = user_crud.remove(db_session, id="not-a-uuid")
        assert result is None
