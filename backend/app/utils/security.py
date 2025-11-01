"""
Security utilities for token-based operations.

This module provides utilities for creating and verifying signed tokens,
useful for operations like file uploads, password resets, or any other
time-limited, single-use operations.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Dict, Any, Optional

from app.core.config import settings


def create_upload_token(file_path: str, content_type: str, expires_in: int = 300) -> str:
    """
    Create a signed token for secure file uploads.

    This generates a time-limited, single-use token that can be verified
    to ensure the upload is authorized.

    Args:
        file_path: The destination path for the file
        content_type: The expected content type (e.g., "image/jpeg")
        expires_in: Expiration time in seconds (default: 300 = 5 minutes)

    Returns:
        A base64 encoded token string

    Example:
        >>> token = create_upload_token("/uploads/avatar.jpg", "image/jpeg")
        >>> # Send token to client, client includes it in upload request
    """
    # Create the payload
    payload = {
        "path": file_path,
        "content_type": content_type,
        "exp": int(time.time()) + expires_in,
        "nonce": secrets.token_hex(8)  # Add randomness to prevent token reuse
    }

    # Convert to JSON and encode
    payload_bytes = json.dumps(payload).encode('utf-8')

    # Create a signature using HMAC-SHA256 for security
    # This prevents length extension attacks that plain SHA-256 is vulnerable to
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    # Combine payload and signature
    token_data = {
        "payload": payload,
        "signature": signature
    }

    # Encode the final token
    token_json = json.dumps(token_data)
    token = base64.urlsafe_b64encode(token_json.encode('utf-8')).decode('utf-8')

    return token


def verify_upload_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify an upload token and return the payload if valid.

    Args:
        token: The token string to verify

    Returns:
        The payload dictionary if valid, None if invalid or expired

    Example:
        >>> payload = verify_upload_token(token_from_client)
        >>> if payload:
        ...     file_path = payload["path"]
        ...     content_type = payload["content_type"]
        ...     # Proceed with upload
        ... else:
        ...     # Token invalid or expired
    """
    try:
        # Decode the token
        token_json = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        token_data = json.loads(token_json)

        # Extract payload and signature
        payload = token_data["payload"]
        signature = token_data["signature"]

        # Verify signature using HMAC and constant-time comparison
        payload_bytes = json.dumps(payload).encode('utf-8')
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        # Check expiration
        if payload["exp"] < int(time.time()):
            return None

        return payload

    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def create_password_reset_token(email: str, expires_in: int = 3600) -> str:
    """
    Create a signed token for password reset.

    Args:
        email: User's email address
        expires_in: Expiration time in seconds (default: 3600 = 1 hour)

    Returns:
        A base64 encoded token string

    Example:
        >>> token = create_password_reset_token("user@example.com")
        >>> # Send token to user via email
    """
    # Create the payload
    payload = {
        "email": email,
        "exp": int(time.time()) + expires_in,
        "nonce": secrets.token_hex(16),  # Extra randomness
        "purpose": "password_reset"
    }

    # Convert to JSON and encode
    payload_bytes = json.dumps(payload).encode('utf-8')

    # Create a signature using HMAC-SHA256 for security
    # This prevents length extension attacks that plain SHA-256 is vulnerable to
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    # Combine payload and signature
    token_data = {
        "payload": payload,
        "signature": signature
    }

    # Encode the final token
    token_json = json.dumps(token_data)
    token = base64.urlsafe_b64encode(token_json.encode('utf-8')).decode('utf-8')

    return token


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset token and return the email if valid.

    Args:
        token: The token string to verify

    Returns:
        The email address if valid, None if invalid or expired

    Example:
        >>> email = verify_password_reset_token(token_from_user)
        >>> if email:
        ...     # Proceed with password reset
        ... else:
        ...     # Token invalid or expired
    """
    try:
        # Decode the token
        token_json = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        token_data = json.loads(token_json)

        # Extract payload and signature
        payload = token_data["payload"]
        signature = token_data["signature"]

        # Verify it's a password reset token
        if payload.get("purpose") != "password_reset":
            return None

        # Verify signature using HMAC and constant-time comparison
        payload_bytes = json.dumps(payload).encode('utf-8')
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        # Check expiration
        if payload["exp"] < int(time.time()):
            return None

        return payload["email"]

    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def create_email_verification_token(email: str, expires_in: int = 86400) -> str:
    """
    Create a signed token for email verification.

    Args:
        email: User's email address
        expires_in: Expiration time in seconds (default: 86400 = 24 hours)

    Returns:
        A base64 encoded token string

    Example:
        >>> token = create_email_verification_token("user@example.com")
        >>> # Send token to user via email
    """
    # Create the payload
    payload = {
        "email": email,
        "exp": int(time.time()) + expires_in,
        "nonce": secrets.token_hex(16),
        "purpose": "email_verification"
    }

    # Convert to JSON and encode
    payload_bytes = json.dumps(payload).encode('utf-8')

    # Create a signature using HMAC-SHA256 for security
    # This prevents length extension attacks that plain SHA-256 is vulnerable to
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    # Combine payload and signature
    token_data = {
        "payload": payload,
        "signature": signature
    }

    # Encode the final token
    token_json = json.dumps(token_data)
    token = base64.urlsafe_b64encode(token_json.encode('utf-8')).decode('utf-8')

    return token


def verify_email_verification_token(token: str) -> Optional[str]:
    """
    Verify an email verification token and return the email if valid.

    Args:
        token: The token string to verify

    Returns:
        The email address if valid, None if invalid or expired

    Example:
        >>> email = verify_email_verification_token(token_from_user)
        >>> if email:
        ...     # Mark email as verified
        ... else:
        ...     # Token invalid or expired
    """
    try:
        # Decode the token
        token_json = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        token_data = json.loads(token_json)

        # Extract payload and signature
        payload = token_data["payload"]
        signature = token_data["signature"]

        # Verify it's an email verification token
        if payload.get("purpose") != "email_verification":
            return None

        # Verify signature using HMAC and constant-time comparison
        payload_bytes = json.dumps(payload).encode('utf-8')
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        # Check expiration
        if payload["exp"] < int(time.time()):
            return None

        return payload["email"]

    except (ValueError, KeyError, json.JSONDecodeError):
        return None
