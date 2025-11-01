"""
Shared validators for Pydantic schemas.

This module provides reusable validation functions to ensure consistency
across all schemas and avoid code duplication.
"""
import re
from typing import Set

# Common weak passwords that should be rejected
COMMON_PASSWORDS: Set[str] = {
    'password', 'password1', 'password123', 'password1234',
    'admin', 'admin123', 'admin1234',
    'welcome', 'welcome1', 'welcome123',
    'qwerty', 'qwerty123',
    '12345678', '123456789', '1234567890',
    'letmein', 'letmein1', 'letmein123',
    'monkey123', 'dragon123',
    'passw0rd', 'p@ssw0rd', 'p@ssword',
}


def validate_password_strength(password: str) -> str:
    """
    Validate password strength with enterprise-grade requirements.

    Requirements:
    - Minimum 12 characters (increased from 8 for better security)
    - At least one lowercase letter
    - At least one uppercase letter
    - At least one digit
    - At least one special character
    - Not in common password list

    Args:
        password: The password to validate

    Returns:
        The validated password

    Raises:
        ValueError: If password doesn't meet requirements

    Examples:
        >>> validate_password_strength("MySecureP@ss123")  # Valid
        >>> validate_password_strength("password1")  # Invalid - too weak
    """
    # Check minimum length
    if len(password) < 12:
        raise ValueError('Password must be at least 12 characters long')

    # Check against common passwords (case-insensitive)
    if password.lower() in COMMON_PASSWORDS:
        raise ValueError('Password is too common. Please choose a stronger password')

    # Check for required character types
    checks = [
        (any(c.islower() for c in password), 'at least one lowercase letter'),
        (any(c.isupper() for c in password), 'at least one uppercase letter'),
        (any(c.isdigit() for c in password), 'at least one digit'),
        (any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?~`' for c in password), 'at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?~`)')
    ]

    failed = [msg for check, msg in checks if not check]
    if failed:
        raise ValueError(f"Password must contain {', '.join(failed)}")

    return password


def validate_phone_number(phone: str | None) -> str | None:
    """
    Validate phone number format.

    Accepts international format with + prefix or local format with 0 prefix.
    Removes formatting characters (spaces, hyphens, parentheses).

    Args:
        phone: Phone number to validate (can be None)

    Returns:
        Cleaned phone number or None

    Raises:
        ValueError: If phone number format is invalid

    Examples:
        >>> validate_phone_number("+1 (555) 123-4567")  # Valid
        >>> validate_phone_number("0412 345 678")  # Valid
        >>> validate_phone_number("invalid")  # Invalid
    """
    if phone is None:
        return None

    # Check for empty strings
    if not phone or phone.strip() == "":
        raise ValueError('Phone number cannot be empty')

    # Remove all spaces and formatting characters
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)

    # Basic pattern:
    # Must start with + or 0
    # After + must have at least 8 digits
    # After 0 must have at least 8 digits
    # Maximum total length of 15 digits (international standard)
    # Only allowed characters are + at start and digits
    pattern = r'^(?:\+[0-9]{8,14}|0[0-9]{8,14})$'

    if not re.match(pattern, cleaned):
        raise ValueError('Phone number must start with + or 0 followed by 8-14 digits')

    # Additional validation to catch specific invalid cases
    if cleaned.count('+') > 1:
        raise ValueError('Phone number can only contain one + symbol at the start')

    # Check for any non-digit characters (except the leading +)
    if not all(c.isdigit() for c in cleaned[1:]):
        raise ValueError('Phone number can only contain digits after the prefix')

    return cleaned


def validate_email_format(email: str) -> str:
    """
    Additional email validation beyond Pydantic's EmailStr.

    This can be extended for custom email validation rules.

    Args:
        email: Email address to validate

    Returns:
        Validated email address

    Raises:
        ValueError: If email format is invalid
    """
    # Pydantic's EmailStr already does comprehensive validation
    # This function is here for custom rules if needed

    # Example: Reject disposable email domains (optional)
    # disposable_domains = {'tempmail.com', '10minutemail.com', 'guerrillamail.com'}
    # domain = email.split('@')[1].lower()
    # if domain in disposable_domains:
    #     raise ValueError('Disposable email addresses are not allowed')

    return email.lower()  # Normalize to lowercase


def validate_slug(slug: str) -> str:
    """
    Validate URL slug format.

    Slugs must:
    - Be 2-50 characters long
    - Contain only lowercase letters, numbers, and hyphens
    - Not start or end with a hyphen
    - Not contain consecutive hyphens

    Args:
        slug: URL slug to validate

    Returns:
        Validated slug

    Raises:
        ValueError: If slug format is invalid
    """
    if not slug or len(slug) < 2:
        raise ValueError('Slug must be at least 2 characters long')

    if len(slug) > 50:
        raise ValueError('Slug must be at most 50 characters long')

    # Check format
    if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', slug):
        raise ValueError(
            'Slug can only contain lowercase letters, numbers, and hyphens. '
            'It cannot start or end with a hyphen, and cannot contain consecutive hyphens'
        )

    return slug
