import pytest

from app.crud.user import user as user_crud
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate


def test_create_user(db_session, user_create_data):
    user_in = UserCreate(**user_create_data)
    user_obj = user_crud.create(db_session, obj_in=user_in)

    assert user_obj.email == user_create_data["email"]
    assert user_obj.first_name == user_create_data["first_name"]
    assert user_obj.last_name == user_create_data["last_name"]
    assert user_obj.phone_number == user_create_data["phone_number"]
    assert user_obj.is_superuser == user_create_data["is_superuser"]
    assert user_obj.password_hash is not None
    assert user_obj.id is not None


def test_get_user(db_session, mock_user):
    # Using mock_user fixture instead of creating new user
    stored_user = user_crud.get(db_session, id=mock_user.id)
    assert stored_user
    assert stored_user.id == mock_user.id
    assert stored_user.email == mock_user.email


def test_get_user_by_email(db_session, mock_user):
    stored_user = user_crud.get_by_email(db_session, email=mock_user.email)
    assert stored_user
    assert stored_user.id == mock_user.id
    assert stored_user.email == mock_user.email


def test_update_user(db_session, mock_user):
    update_data = UserUpdate(
        first_name="Updated",
        last_name="Name",
        phone_number="+9876543210"
    )

    updated_user = user_crud.update(db_session, db_obj=mock_user, obj_in=update_data)

    assert updated_user.first_name == "Updated"
    assert updated_user.last_name == "Name"
    assert updated_user.phone_number == "+9876543210"
    assert updated_user.email == mock_user.email


def test_delete_user(db_session, mock_user):
    user_crud.remove(db_session, id=mock_user.id)
    deleted_user = user_crud.get(db_session, id=mock_user.id)
    assert deleted_user is None


def test_get_multi_users(db_session, mock_user, user_create_data):
    # Create additional users (mock_user is already in db)
    users_data = [
        {**user_create_data, "email": f"test{i}@example.com"}
        for i in range(2)  # Creating 2 more users + mock_user = 3 total
    ]

    for user_data in users_data:
        user_in = UserCreate(**user_data)
        user_crud.create(db_session, obj_in=user_in)

    users = user_crud.get_multi(db_session, skip=0, limit=10)
    assert len(users) == 3
    assert all(isinstance(user, User) for user in users)


def test_is_active(db_session, mock_user):
    assert user_crud.is_active(mock_user) is True

    # Test deactivating user
    update_data = UserUpdate(is_active=False)
    deactivated_user = user_crud.update(db_session, db_obj=mock_user, obj_in=update_data)
    assert user_crud.is_active(deactivated_user) is False


def test_is_superuser(db_session, mock_user, user_create_data):
    # mock_user is regular user
    assert user_crud.is_superuser(mock_user) is False

    # Create superuser
    super_user_data = {**user_create_data, "email": "super@example.com", "is_superuser": True}
    super_user_in = UserCreate(**super_user_data)
    super_user = user_crud.create(db_session, obj_in=super_user_in)
    assert user_crud.is_superuser(super_user) is True


# Additional test cases
def test_create_duplicate_email(db_session, mock_user):
    user_data = UserCreate(
        email=mock_user.email,  # Try to create user with existing email
        password="TestPassword123!",
        first_name="Test",
        last_name="User"
    )
    with pytest.raises(Exception):  # Should raise an integrity error
        user_crud.create(db_session, obj_in=user_data)


def test_update_user_preferences(db_session, mock_user):
    preferences = {"theme": "dark", "notifications": True}
    update_data = UserUpdate(preferences=preferences)

    updated_user = user_crud.update(db_session, db_obj=mock_user, obj_in=update_data)
    assert updated_user.preferences == preferences


def test_get_multi_users_pagination(db_session, user_create_data):
    # Create 5 users
    for i in range(5):
        user_in = UserCreate(**{**user_create_data, "email": f"test{i}@example.com"})
        user_crud.create(db_session, obj_in=user_in)

    # Test pagination
    first_page = user_crud.get_multi(db_session, skip=0, limit=2)
    second_page = user_crud.get_multi(db_session, skip=2, limit=2)

    assert len(first_page) == 2
    assert len(second_page) == 2
    assert first_page[0].id != second_page[0].id
