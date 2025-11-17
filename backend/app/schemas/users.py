# app/schemas/users.py
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.validators import validate_password_strength, validate_phone_number


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str | None = None
    phone_number: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        return validate_phone_number(v)


class UserCreate(UserBase):
    password: str
    is_superuser: bool = False

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    password: str | None = None
    preferences: dict[str, Any] | None = None
    locale: str | None = Field(
        None,
        max_length=10,
        pattern=r"^[a-z]{2}(-[A-Z]{2})?$",
        description="User's preferred locale (BCP 47 format: en, it, en-US, it-IT)",
        examples=["en", "it", "en-US", "it-IT"],
    )
    is_active: bool | None = (
        None  # Changed default from True to None to avoid unintended updates
    )
    is_superuser: bool | None = None  # Explicitly reject privilege escalation attempts

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        return validate_phone_number(v)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        """Enterprise-grade password strength validation"""
        if v is None:
            return v
        return validate_password_strength(v)

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str | None) -> str | None:
        """Validate locale against supported locales."""
        if v is None:
            return v
        # Only support English and Italian for template showcase
        # Note: Locales stored in lowercase for case-insensitive matching
        supported_locales = {"en", "it", "en-us", "en-gb", "it-it"}
        # Normalize to lowercase for comparison and storage
        v_lower = v.lower()
        if v_lower not in supported_locales:
            raise ValueError(
                f"Unsupported locale '{v}'. Supported locales: {sorted(supported_locales)}"
            )
        # Return normalized lowercase version for consistency
        return v_lower

    @field_validator("is_superuser")
    @classmethod
    def prevent_superuser_modification(cls, v: bool | None) -> bool | None:
        """Prevent users from modifying their superuser status via this schema."""
        if v is not None:
            raise ValueError("Cannot modify superuser status through user update")
        return v


class UserInDB(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime | None = None
    locale: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime | None = None
    locale: str | None = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: "UserResponse"  # Forward reference since UserResponse is defined above
    expires_in: int | None = None  # Token expiration in seconds


class TokenPayload(BaseModel):
    sub: str  # User ID
    exp: int  # Expiration time
    iat: int | None = None  # Issued at
    jti: str | None = None  # JWT ID
    is_superuser: bool | None = False
    first_name: str | None = None
    email: str | None = None
    type: str | None = None  # Token type (access/refresh)


class TokenData(BaseModel):
    user_id: UUID
    is_superuser: bool = False


class PasswordChange(BaseModel):
    """Schema for changing password (requires current password)."""

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)


class PasswordReset(BaseModel):
    """Schema for resetting password (via email token)."""

    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Schema for requesting a password reset."""

    email: EmailStr = Field(..., description="Email address of the account")

    model_config = {"json_schema_extra": {"example": {"email": "user@example.com"}}}


class PasswordResetConfirm(BaseModel):
    """Schema for confirming a password reset with token."""

    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="New password")

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)

    model_config = {
        "json_schema_extra": {
            "example": {
                "token": "eyJwYXlsb2FkIjp7ImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImV4cCI6MTcxMjM0NTY3OH19",
                "new_password": "NewSecurePassword123",
            }
        }
    }
