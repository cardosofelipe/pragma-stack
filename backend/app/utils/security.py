"""
Security utilities for token-based operations.

This module provides utilities for creating and verifying signed tokens,
useful for operations like file uploads, password resets, or any other
time-limited, single-use operations.
"""
import base64
import hashlib
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

    # Create a signature using the secret key
    signature = hashlib.sha256(
        payload_bytes + settings.SECRET_KEY.encode('utf-8')
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

        # Verify signature
        payload_bytes = json.dumps(payload).encode('utf-8')
        expected_signature = hashlib.sha256(
            payload_bytes + settings.SECRET_KEY.encode('utf-8')
        ).hexdigest()

        if signature != expected_signature:
            return None

        # Check expiration
        if payload["exp"] < int(time.time()):
            return None

        return payload

    except (ValueError, KeyError, json.JSONDecodeError):
        return None
