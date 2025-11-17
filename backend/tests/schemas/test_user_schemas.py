# tests/schemas/test_user_schemas.py
import re

import pytest
from pydantic import ValidationError

from app.schemas.users import UserBase, UserCreate, UserUpdate


class TestPhoneNumberValidation:
    """Tests for phone number validation in user schemas"""

    def test_valid_swiss_numbers(self):
        """Test valid Swiss phone numbers are accepted"""
        # International format
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+41791234567",
        )
        assert user.phone_number == "+41791234567"

        # Local format
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="0791234567",
        )
        assert user.phone_number == "0791234567"

        # With formatting characters
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+41 79 123 45 67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+41791234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="079 123 45 67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "0791234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+41-79-123-45-67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+41791234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="079-123-45-67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "0791234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+41 (79) 123 45 67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+41791234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="079 (123) 45 67",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "0791234567"

    def test_valid_italian_numbers(self):
        """Test valid Italian phone numbers are accepted"""
        # International format
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+393451234567",
        )
        assert user.phone_number == "+393451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+39345123456",
        )
        assert user.phone_number == "+39345123456"

        # Local format
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="03451234567",
        )
        assert user.phone_number == "03451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="0345123456789",
        )
        assert user.phone_number == "0345123456789"

        # With formatting characters
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+39 345 123 4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+393451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="0345 123 4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "03451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+39-345-123-4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+393451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="0345-123-4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "03451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="+39 (345) 123 4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "+393451234567"

        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number="0345 (123) 4567",
        )
        assert re.sub(r"[\s\-\(\)]", "", user.phone_number) == "03451234567"

    def test_none_phone_number(self):
        """Test that None is accepted as a valid value (optional phone number)"""
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone_number=None,
        )
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
            # Note: "()+41123456" becomes "+41123456" after cleaning, which is valid
            # Empty string
            "",
            # Spaces only
            "   ",
        ]

        for number in invalid_numbers:
            with pytest.raises(ValidationError):
                UserBase(
                    email="test@example.com",
                    first_name="Test",
                    last_name="User",
                    phone_number=number,
                )

    def test_phone_validation_in_user_create(self):
        """Test that phone validation also works in UserCreate schema"""
        # Valid phone number
        user = UserCreate(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="Password123!",
            phone_number="+41791234567",
        )
        assert user.phone_number == "+41791234567"

        # Invalid phone number should raise ValidationError
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@example.com",
                first_name="Test",
                last_name="User",
                password="Password123!",
                phone_number="invalid-number",
            )


class TestLocaleValidation:
    """Tests for locale validation in user schemas"""

    def test_valid_locale_en(self):
        """Test that 'en' locale is accepted"""
        user = UserUpdate(locale="en")
        assert user.locale == "en"

    def test_valid_locale_it(self):
        """Test that 'it' locale is accepted"""
        user = UserUpdate(locale="it")
        assert user.locale == "it"

    def test_valid_locale_en_us(self):
        """Test that 'en-US' locale is accepted and normalized to lowercase"""
        user = UserUpdate(locale="en-US")
        assert user.locale == "en-us"  # Normalized to lowercase

    def test_valid_locale_en_gb(self):
        """Test that 'en-GB' locale is accepted and normalized to lowercase"""
        user = UserUpdate(locale="en-GB")
        assert user.locale == "en-gb"  # Normalized to lowercase

    def test_valid_locale_it_it(self):
        """Test that 'it-IT' locale is accepted and normalized to lowercase"""
        user = UserUpdate(locale="it-IT")
        assert user.locale == "it-it"  # Normalized to lowercase

    def test_none_locale(self):
        """Test that None is accepted as a valid value (optional locale)"""
        user = UserUpdate(locale=None)
        assert user.locale is None

    def test_locale_not_provided(self):
        """Test that locale can be omitted entirely"""
        user = UserUpdate(first_name="Test")
        assert user.locale is None

    def test_unsupported_locale_french(self):
        """Test that unsupported locale 'fr' is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(locale="fr")

        # Verify error message mentions unsupported locale
        assert "Unsupported locale" in str(exc_info.value)

    def test_unsupported_locale_german(self):
        """Test that unsupported locale 'de' is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(locale="de")

        assert "Unsupported locale" in str(exc_info.value)

    def test_unsupported_locale_spanish(self):
        """Test that unsupported locale 'es' is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(locale="es")

        assert "Unsupported locale" in str(exc_info.value)

    def test_unsupported_locale_region_specific(self):
        """Test that unsupported region-specific locale is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(locale="it-CH")  # Italian (Switzerland) - not in supported list

        assert "Unsupported locale" in str(exc_info.value)

    def test_invalid_locale_format_no_dash(self):
        """Test that invalid format (no dash between components) is rejected"""
        with pytest.raises(ValidationError):
            UserUpdate(locale="enus")  # Should be "en-US"

    def test_invalid_locale_format_invalid_pattern(self):
        """Test that completely invalid format is rejected"""
        invalid_locales = [
            "en-us",  # Region code must be uppercase
            "EN",  # Language code must be lowercase
            "en-",  # Incomplete
            "-US",  # Incomplete
            "e",  # Too short
            "eng",  # Language code too long
            "en-USA",  # Region code too long
            "123",  # Numbers not allowed
            "en_US",  # Underscore not allowed (must be dash)
        ]

        for invalid_locale in invalid_locales:
            with pytest.raises(ValidationError):
                UserUpdate(locale=invalid_locale)

    def test_empty_string_locale(self):
        """Test that empty string is rejected"""
        with pytest.raises(ValidationError):
            UserUpdate(locale="")

    def test_locale_with_whitespace(self):
        """Test that locale with whitespace is rejected"""
        with pytest.raises(ValidationError):
            UserUpdate(locale=" en ")

    def test_locale_max_length(self):
        """Test that locale exceeding max length (10 chars) is rejected"""
        with pytest.raises(ValidationError):
            UserUpdate(locale="en-US-extra")  # 12 characters, exceeds max_length=10

    def test_locale_in_user_update_with_other_fields(self):
        """Test locale validation works when combined with other fields"""
        # Valid locale with other fields
        user = UserUpdate(
            first_name="Mario",
            last_name="Rossi",
            locale="it"
        )
        assert user.locale == "it"
        assert user.first_name == "Mario"

        # Invalid locale with other valid fields should still fail
        with pytest.raises(ValidationError):
            UserUpdate(
                first_name="Pierre",
                last_name="Dupont",
                locale="fr"  # Unsupported
            )

    def test_supported_locales_list(self):
        """Test all supported locales are accepted and normalized"""
        # Input locales (mixed case)
        input_locales = ["en", "it", "en-US", "en-GB", "it-IT"]
        # Expected output (normalized to lowercase)
        expected_outputs = ["en", "it", "en-us", "en-gb", "it-it"]

        for input_locale, expected_output in zip(input_locales, expected_outputs):
            user = UserUpdate(locale=input_locale)
            assert user.locale == expected_output

    def test_locale_error_message_shows_supported_locales(self):
        """Test that error message lists supported locales"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(locale="fr")

        error_str = str(exc_info.value)
        # Should mention supported locales in error
        assert "en" in error_str or "it" in error_str
        assert "Supported locales" in error_str
