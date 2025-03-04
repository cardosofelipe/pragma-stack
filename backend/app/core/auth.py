import logging
logging.getLogger('passlib').setLevel(logging.ERROR)

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import uuid

from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.users import TokenData, TokenPayload


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Custom exceptions for auth
class AuthError(Exception):
    """Base authentication error"""
    pass

class TokenExpiredError(AuthError):
    """Token has expired"""
    pass

class TokenInvalidError(AuthError):
    """Token is invalid"""
    pass

class TokenMissingClaimError(AuthError):
    """Token is missing a required claim"""
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)


def create_access_token(
        subject: Union[str, Any],
        expires_delta: Optional[timedelta] = None,
        claims: Optional[Dict[str, Any]] = None
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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Base token data
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(tz=timezone.utc),
        "jti": str(uuid.uuid4()),
        "type": "access"
    }

    # Add custom claims
    if claims:
        to_encode.update(claims)

    # Create the JWT
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(
        subject: Union[str, Any],
        expires_delta: Optional[timedelta] = None
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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def decode_token(token: str, verify_type: Optional[str] = None) -> TokenPayload:
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
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Check required claims before Pydantic validation
        if not payload.get("sub"):
            raise TokenMissingClaimError("Token missing 'sub' claim")

        # Verify token type if specified
        if verify_type and payload.get("type") != verify_type:
            raise TokenInvalidError(f"Invalid token type, expected {verify_type}")

        # Now validate with Pydantic
        token_data = TokenPayload(**payload)
        return token_data

    except JWTError as e:
        # Check if the error is due to an expired token
        if "expired" in str(e).lower():
            raise TokenExpiredError("Token has expired")
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