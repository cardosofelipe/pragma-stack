# tests/schemas/test_user_schemas.py
import pytest
import re
from pydantic import ValidationError

from app.schemas.users import UserBase, UserCreate

class TestPhoneNumberValidation:
    """Tests for phone number validation in user schemas"""

    def test_valid_swiss_numbers(self):
        """Test valid Swiss phone numbers are accepted"""
        # International format
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+41791234567")
        assert user.phone_number == "+41791234567"

        # Local format
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="0791234567")
        assert user.phone_number == "0791234567"

        # With formatting characters
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+41 79 123 45 67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+41791234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="079 123 45 67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "0791234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+41-79-123-45-67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+41791234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="079-123-45-67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "0791234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+41 (79) 123 45 67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+41791234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="079 (123) 45 67")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "0791234567"

    def test_valid_italian_numbers(self):
        """Test valid Italian phone numbers are accepted"""
        # International format
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+393451234567")
        assert user.phone_number == "+393451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+39345123456")
        assert user.phone_number == "+39345123456"

        # Local format
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="03451234567")
        assert user.phone_number == "03451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="0345123456789")
        assert user.phone_number == "0345123456789"

        # With formatting characters
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+39 345 123 4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+393451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="0345 123 4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "03451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+39-345-123-4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+393451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="0345-123-4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "03451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="+39 (345) 123 4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "+393451234567"

        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number="0345 (123) 4567")
        assert re.sub(r'[\s\-\(\)]', '', user.phone_number) == "03451234567"

    def test_none_phone_number(self):
        """Test that None is accepted as a valid value (optional phone number)"""
        user = UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number=None)
        assert user.phone_number is None

    def test_invalid_phone_numbers(self):
        """Test that invalid phone numbers are rejected"""
        invalid_numbers = [
            # Too short
            "+12",
            "012",

            # Invalid characters
            "+41xyz123456",
            "079abc4567",
            "123-abc-7890",
            "+1(800)CALL-NOW",

            # Completely invalid formats
            "++4412345678",  # Double plus
            "()+41123456",  # Misplaced parentheses

            # Empty string
            "",
            # Spaces only
            "   ",
        ]

        for number in invalid_numbers:
            with pytest.raises(ValidationError):
                UserBase(email="test@example.com", first_name="Test", last_name="User", phone_number=number)

    def test_phone_validation_in_user_create(self):
        """Test that phone validation also works in UserCreate schema"""
        # Valid phone number
        user = UserCreate(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="Password123",
            phone_number="+41791234567"
        )
        assert user.phone_number == "+41791234567"

        # Invalid phone number should raise ValidationError
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@example.com",
                first_name="Test",
                last_name="User",
                password="Password123",
                phone_number="invalid-number"
            )