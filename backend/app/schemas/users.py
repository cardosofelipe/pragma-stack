# app/schemas/users.py
import re
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Simple regex for phone validation
        if not re.match(r'^\+?[0-9\s\-\(\)]{8,20}$', v):
            raise ValueError('Invalid phone number format')
        return v


class UserCreate(UserBase):
    password: str
    is_superuser: bool = False

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Basic password strength validation"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = True
    @field_validator('phone_number')
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v

        # Return early for empty strings or whitespace-only strings
        if not v or v.strip() == "":
            raise ValueError('Phone number cannot be empty')

        # Remove all spaces and formatting characters
        cleaned = re.sub(r'[\s\-\(\)]', '', v)

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


class UserInDB(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # User ID
    exp: int  # Expiration time
    iat: Optional[int] = None  # Issued at
    jti: Optional[str] = None  # JWT ID
    is_superuser: Optional[bool] = False
    first_name: Optional[str] = None
    email: Optional[str] = None
    type: Optional[str] = None  # Token type (access/refresh)


class TokenData(BaseModel):
    user_id: UUID
    is_superuser: bool = False


class PasswordChange(BaseModel):
    """Schema for changing password (requires current password)."""
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Basic password strength validation"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class PasswordReset(BaseModel):
    """Schema for resetting password (via email token)."""
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Basic password strength validation"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str
