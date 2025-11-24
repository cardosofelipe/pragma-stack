# tests/models/test_user.py
import uuid
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user import User


def test_create_user(db_session):
    """Test creating a basic user."""
    # Arrange
    user_id = uuid.uuid4()
    new_user = User(
        id=user_id,
        email="test@example.com",
        password_hash="hashedpassword",
        first_name="Test",
        last_name="User",
        phone_number="1234567890",
        is_active=True,
        is_superuser=False,
        preferences={"theme": "dark"},
    )
    db_session.add(new_user)

    # Act
    db_session.commit()
    created_user = db_session.query(User).filter_by(email="test@example.com").first()

    # Assert
    assert created_user is not None
    assert created_user.email == "test@example.com"
    assert created_user.first_name == "Test"
    assert created_user.last_name == "User"
    assert created_user.phone_number == "1234567890"
    assert created_user.is_active is True
    assert created_user.is_superuser is False
    assert created_user.preferences == {"theme": "dark"}
    # UUID should be preserved
    assert created_user.id == user_id
    # Timestamps should be set
    assert isinstance(created_user.created_at, datetime)
    assert isinstance(created_user.updated_at, datetime)


def test_update_user(db_session):
    """Test updating an existing user."""
    # Arrange - Create a user
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="update@example.com",
        password_hash="hashedpassword",
        first_name="Before",
        last_name="Update",
    )
    db_session.add(user)
    db_session.commit()

    # Record the original creation timestamp
    original_created_at = user.created_at

    # Act - Update the user
    user.first_name = "After"
    user.last_name = "Updated"
    user.phone_number = "9876543210"
    user.preferences = {"theme": "light", "notifications": True}
    db_session.commit()

    # Fetch the updated user to verify changes were persisted
    updated_user = db_session.query(User).filter_by(id=user_id).first()

    # Assert
    assert updated_user.first_name == "After"
    assert updated_user.last_name == "Updated"
    assert updated_user.phone_number == "9876543210"
    assert updated_user.preferences == {"theme": "light", "notifications": True}
    # created_at shouldn't change on update
    assert updated_user.created_at == original_created_at
    # updated_at should be newer than created_at
    assert updated_user.updated_at > original_created_at


def test_delete_user(db_session):
    """Test deleting a user."""
    # Arrange - Create a user
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="delete@example.com",
        password_hash="hashedpassword",
        first_name="Delete",
        last_name="Me",
    )
    db_session.add(user)
    db_session.commit()

    # Act - Delete the user
    db_session.delete(user)
    db_session.commit()

    # Assert
    deleted_user = db_session.query(User).filter_by(id=user_id).first()
    assert deleted_user is None


def test_user_unique_email_constraint(db_session):
    """Test that users cannot have duplicate emails."""
    # Arrange - Create a user
    user1 = User(
        id=uuid.uuid4(),
        email="duplicate@example.com",
        password_hash="hashedpassword",
        first_name="First",
        last_name="User",
    )
    db_session.add(user1)
    db_session.commit()

    # Act & Assert - Try to create another user with the same email
    user2 = User(
        id=uuid.uuid4(),
        email="duplicate@example.com",  # Same email
        password_hash="differenthash",
        first_name="Second",
        last_name="User",
    )
    db_session.add(user2)

    # Should raise IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        db_session.commit()

    # Rollback for cleanup
    db_session.rollback()


def test_user_required_fields(db_session):
    """Test that required fields are enforced."""
    # Test each required field by creating a user without it

    # Missing email
    user_no_email = User(
        id=uuid.uuid4(),
        # email is missing
        password_hash="hashedpassword",
        first_name="Test",
        last_name="User",
    )
    db_session.add(user_no_email)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_user_oauth_only_without_password(db_session):
    """Test that OAuth-only users can be created without password_hash."""
    # OAuth-only users don't have a password set
    user_no_password = User(
        id=uuid.uuid4(),
        email="oauthonly@example.com",
        password_hash=None,  # OAuth-only user
        first_name="OAuth",
        last_name="User",
    )
    db_session.add(user_no_password)
    db_session.commit()

    # Retrieve and verify
    retrieved = db_session.query(User).filter_by(email="oauthonly@example.com").first()
    assert retrieved is not None
    assert retrieved.password_hash is None
    assert retrieved.has_password is False  # Test has_password property


def test_user_defaults(db_session):
    """Test that default values are correctly set."""
    # Arrange - Create a minimal user with only required fields
    minimal_user = User(
        id=uuid.uuid4(),
        email="minimal@example.com",
        password_hash="hashedpassword",
        first_name="Minimal",
        last_name="User",
    )
    db_session.add(minimal_user)
    db_session.commit()

    # Act - Retrieve the user
    created_user = db_session.query(User).filter_by(email="minimal@example.com").first()

    # Assert - Check default values
    assert created_user.is_active is True  # Default should be True
    assert created_user.is_superuser is False  # Default should be False
    assert created_user.phone_number is None  # Optional field
    assert created_user.preferences is None  # Optional field


def test_user_string_representation(db_session):
    """Test the string representation of a user."""
    # Arrange
    user = User(
        id=uuid.uuid4(),
        email="repr@example.com",
        password_hash="hashedpassword",
        first_name="String",
        last_name="Repr",
    )

    # Act & Assert
    assert str(user) == "<User repr@example.com>"
    assert repr(user) == "<User repr@example.com>"


def test_user_with_complex_json_preferences(db_session):
    """Test storing and retrieving complex JSON preferences."""
    # Arrange - Create a user with nested JSON preferences
    complex_preferences = {
        "theme": {"mode": "dark", "colors": {"primary": "#333", "secondary": "#666"}},
        "notifications": {
            "email": True,
            "sms": False,
            "push": {"enabled": True, "quiet_hours": [22, 7]},
        },
        "tags": ["important", "family", "events"],
    }

    user = User(
        id=uuid.uuid4(),
        email="complex@example.com",
        password_hash="hashedpassword",
        first_name="Complex",
        last_name="JSON",
        preferences=complex_preferences,
    )
    db_session.add(user)
    db_session.commit()

    # Act - Retrieve the user
    retrieved_user = (
        db_session.query(User).filter_by(email="complex@example.com").first()
    )

    # Assert - The complex JSON should be preserved
    assert retrieved_user.preferences == complex_preferences
    assert retrieved_user.preferences["theme"]["colors"]["primary"] == "#333"
    assert retrieved_user.preferences["notifications"]["push"]["quiet_hours"] == [22, 7]
    assert "important" in retrieved_user.preferences["tags"]
