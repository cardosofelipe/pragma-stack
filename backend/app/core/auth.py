import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from functools import partial
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import (
    ExpiredSignatureError,
    InvalidTokenError,
    MissingRequiredClaimError,
)
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.users import TokenData, TokenPayload


# Custom exceptions for auth
class AuthError(Exception):
    """Base authentication error"""


class TokenExpiredError(AuthError):
    """Token has expired"""


class TokenInvalidError(AuthError):
    """Token is invalid"""


class TokenMissingClaimError(AuthError):
    """Token is missing a required claim"""


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """Generate a bcrypt password hash."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash asynchronously.

    Runs the CPU-intensive bcrypt operation in a thread pool to avoid
    blocking the event loop.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to verify against

    Returns:
        True if password matches, False otherwise
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, partial(verify_password, plain_password, hashed_password)
    )


async def get_password_hash_async(password: str) -> str:
    """
    Generate a password hash asynchronously.

    Runs the CPU-intensive bcrypt operation in a thread pool to avoid
    blocking the event loop. This is especially important during user
    registration and password changes.

    Args:
        password: Plain text password to hash

    Returns:
        Hashed password string
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_password_hash, password)


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        subject: The subject of the token (usually user_id)
        expires_delta: Optional expiration time delta
        claims: Optional additional claims to include in the token

    Returns:
        Encoded JWT token
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Base token data
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(tz=UTC),
        "jti": str(uuid.uuid4()),
        "type": "access",
    }

    # Add custom claims
    if claims:
        to_encode.update(claims)

    # Create the JWT
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str | Any, expires_delta: timedelta | None = None
) -> str:
    """
    Create a JWT refresh token.

    Args:
        subject: The subject of the token (usually user_id)
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT refresh token
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(UTC),
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str, verify_type: str | None = None) -> TokenPayload:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token to decode
        verify_type: Optional token type to verify (access or refresh)

    Returns:
        TokenPayload: The decoded token data

    Raises:
        TokenExpiredError: If the token has expired
        TokenInvalidError: If the token is invalid
        TokenMissingClaimError: If a required claim is missing
    """
    try:
        # Decode token with strict algorithm validation
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "require": ["exp", "sub", "iat"],
            },
        )

        # SECURITY: Explicitly verify the algorithm to prevent algorithm confusion attacks
        # Decode header to check algorithm (without verification, just to inspect)
        header = jwt.get_unverified_header(token)
        token_algorithm = header.get("alg", "").upper()

        # Reject weak or unexpected algorithms
        # NOTE: These are defensive checks that provide defense-in-depth.
        # PyJWT rejects these tokens BEFORE we reach here,
        # but we keep these checks in case the library changes or is misconfigured.
        # Coverage: Marked as pragma since library catches first (see tests/core/test_auth_security.py)
        if token_algorithm == "NONE":  # pragma: no cover
            raise TokenInvalidError("Algorithm 'none' is not allowed")

        if token_algorithm != settings.ALGORITHM.upper():  # pragma: no cover
            raise TokenInvalidError(f"Invalid algorithm: {token_algorithm}")

        # Check required claims before Pydantic validation
        if not payload.get("sub"):
            raise TokenMissingClaimError("Token missing 'sub' claim")

        # Verify token type if specified
        if verify_type and payload.get("type") != verify_type:
            raise TokenInvalidError(f"Invalid token type, expected {verify_type}")

        # Now validate with Pydantic
        token_data = TokenPayload(**payload)
        return token_data

    except ExpiredSignatureError:
        raise TokenExpiredError("Token has expired")
    except MissingRequiredClaimError as e:
        raise TokenMissingClaimError(f"Token missing required claim: {e}")
    except InvalidTokenError:
        raise TokenInvalidError("Invalid authentication token")
    except ValidationError:
        raise TokenInvalidError("Invalid token payload")


def get_token_data(token: str) -> TokenData:
    """
    Extract the user ID and superuser status from a token.

    Args:
        token: JWT token

    Returns:
        TokenData with user_id and is_superuser
    """
    payload = decode_token(token)
    user_id = payload.sub
    is_superuser = payload.is_superuser or False

    return TokenData(user_id=uuid.UUID(user_id), is_superuser=is_superuser)
