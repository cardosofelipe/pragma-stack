"""
Tests for schema validators (app/schemas/validators.py).

Covers all edge cases in validation functions:
- validate_password_strength
- validate_phone_number (lines 115, 119)
- validate_email_format (line 148)
- validate_slug (lines 170-183)
"""
import pytest

from app.schemas.validators import (
    validate_password_strength,
    validate_phone_number,
    validate_email_format,
    validate_slug,
)


class TestPasswordStrengthValidator:
    """Test password strength validation."""

    def test_valid_strong_password(self):
        """Test that a strong password passes validation."""
        password = "MySecureP@ss123"
        result = validate_password_strength(password)
        assert result == password

    def test_password_too_short(self):
        """Test that password shorter than 12 characters is rejected."""
        with pytest.raises(ValueError, match="at least 12 characters long"):
            validate_password_strength("Short1!")

    def test_common_password_rejected(self):
        """Test that common passwords are rejected."""
        # "password1234" is in COMMON_PASSWORDS and is 12 chars
        # Common password check happens before character type checks
        with pytest.raises(ValueError, match="too common"):
            validate_password_strength("password1234")

    def test_password_missing_lowercase(self):
        """Test that password without lowercase is rejected."""
        with pytest.raises(ValueError, match="at least one lowercase letter"):
            validate_password_strength("ALLUPPERCASE123!")

    def test_password_missing_uppercase(self):
        """Test that password without uppercase is rejected."""
        with pytest.raises(ValueError, match="at least one uppercase letter"):
            validate_password_strength("alllowercase123!")

    def test_password_missing_digit(self):
        """Test that password without digit is rejected."""
        with pytest.raises(ValueError, match="at least one digit"):
            validate_password_strength("NoDigitsHere!")

    def test_password_missing_special_char(self):
        """Test that password without special character is rejected."""
        with pytest.raises(ValueError, match="at least one special character"):
            validate_password_strength("NoSpecialChar123")


class TestPhoneNumberValidator:
    """Test phone number validation."""

    def test_valid_international_format(self):
        """Test valid international phone number."""
        result = validate_phone_number("+12345678901")
        assert result == "+12345678901"

    def test_valid_local_format(self):
        """Test valid local phone number."""
        result = validate_phone_number("0123456789")
        assert result == "0123456789"

    def test_valid_with_formatting(self):
        """Test phone number with formatting characters."""
        result = validate_phone_number("+1 (555) 123-4567")
        assert result == "+15551234567"

    def test_none_returns_none(self):
        """Test that None input returns None."""
        result = validate_phone_number(None)
        assert result is None

    def test_empty_string_rejected(self):
        """Test that empty string is rejected."""
        with pytest.raises(ValueError, match="cannot be empty"):
            validate_phone_number("")

    def test_whitespace_only_rejected(self):
        """Test that whitespace-only string is rejected."""
        with pytest.raises(ValueError, match="cannot be empty"):
            validate_phone_number("   ")

    def test_invalid_prefix_rejected(self):
        """Test that invalid prefix is rejected."""
        with pytest.raises(ValueError, match="must start with \\+ or 0"):
            validate_phone_number("12345678901")

    def test_too_short_rejected(self):
        """Test that too-short phone number is rejected."""
        with pytest.raises(ValueError, match="must start with \\+ or 0"):
            validate_phone_number("+1234567")  # Only 7 digits after +

    def test_too_long_rejected(self):
        """Test that too-long phone number is rejected."""
        with pytest.raises(ValueError, match="must start with \\+ or 0"):
            validate_phone_number("+123456789012345")  # 15 digits after +

    def test_multiple_plus_symbols_rejected(self):
        """Test phone number with multiple + symbols.

        Note: Line 115 is defensive code - the regex check at line 110 catches this first.
        The regex ^(?:\+[0-9]{8,14}|0[0-9]{8,14})$ only allows + at the start.
        """
        with pytest.raises(ValueError, match="must start with \\+ or 0 followed by 8-14 digits"):
            validate_phone_number("+1234+5678901")

    def test_non_digit_after_prefix_rejected(self):
        """Test phone number with non-digit characters after prefix.

        Note: Line 119 is defensive code - the regex check at line 110 catches this first.
        The regex requires all digits after the prefix.
        """
        with pytest.raises(ValueError, match="must start with \\+ or 0"):
            validate_phone_number("+123abc45678")


class TestEmailFormatValidator:
    """Test email format validation."""

    def test_valid_email_lowercase(self):
        """Test valid lowercase email."""
        result = validate_email_format("test@example.com")
        assert result == "test@example.com"

    def test_email_normalized_to_lowercase(self):
        """Test email is normalized to lowercase (covers line 148)."""
        result = validate_email_format("Test@Example.COM")
        assert result == "test@example.com"

    def test_email_with_uppercase_domain(self):
        """Test email with uppercase domain is normalized."""
        result = validate_email_format("user@EXAMPLE.COM")
        assert result == "user@example.com"


class TestSlugValidator:
    """Test slug validation."""

    def test_valid_slug_lowercase_letters(self):
        """Test valid slug with lowercase letters."""
        result = validate_slug("test-slug")
        assert result == "test-slug"

    def test_valid_slug_with_numbers(self):
        """Test valid slug with numbers."""
        result = validate_slug("test-123")
        assert result == "test-123"

    def test_valid_slug_minimal_length(self):
        """Test valid slug with minimal length (2 characters)."""
        result = validate_slug("ab")
        assert result == "ab"

    def test_empty_slug_rejected(self):
        """Test empty slug is rejected (covers line 170)."""
        with pytest.raises(ValueError, match="at least 2 characters long"):
            validate_slug("")

    def test_single_character_slug_rejected(self):
        """Test single character slug is rejected (covers line 170)."""
        with pytest.raises(ValueError, match="at least 2 characters long"):
            validate_slug("a")

    def test_slug_too_long_rejected(self):
        """Test slug longer than 50 characters is rejected (covers line 173)."""
        long_slug = "a" * 51
        with pytest.raises(ValueError, match="at most 50 characters long"):
            validate_slug(long_slug)

    def test_slug_max_length_accepted(self):
        """Test slug with exactly 50 characters is accepted."""
        max_slug = "a" * 50
        result = validate_slug(max_slug)
        assert result == max_slug

    def test_slug_starts_with_hyphen_rejected(self):
        """Test slug starting with hyphen is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="cannot start or end with a hyphen"):
            validate_slug("-test")

    def test_slug_ends_with_hyphen_rejected(self):
        """Test slug ending with hyphen is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="cannot start or end with a hyphen"):
            validate_slug("test-")

    def test_slug_consecutive_hyphens_rejected(self):
        """Test slug with consecutive hyphens is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="cannot contain consecutive hyphens"):
            validate_slug("test--slug")

    def test_slug_uppercase_letters_rejected(self):
        """Test slug with uppercase letters is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="only contain lowercase letters"):
            validate_slug("Test-Slug")

    def test_slug_special_characters_rejected(self):
        """Test slug with special characters is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="only contain lowercase letters"):
            validate_slug("test_slug")

    def test_slug_spaces_rejected(self):
        """Test slug with spaces is rejected (covers line 177)."""
        with pytest.raises(ValueError, match="only contain lowercase letters"):
            validate_slug("test slug")
