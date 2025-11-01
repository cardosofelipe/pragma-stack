# app/schemas/users.py
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator, ConfigDict, Field

from app.schemas.validators import validate_password_strength, validate_phone_number


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)


class UserCreate(UserBase):
    password: str
    is_superuser: bool = False

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None  # Changed default from True to None to avoid unintended updates
    is_superuser: Optional[bool] = None  # Explicitly reject privilege escalation attempts

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        """Enterprise-grade password strength validation"""
        if v is None:
            return v
        return validate_password_strength(v)

    @field_validator('is_superuser')
    @classmethod
    def prevent_superuser_modification(cls, v: Optional[bool]) -> Optional[bool]:
        """Prevent users from modifying their superuser status via this schema."""
        if v is not None:
            raise ValueError("Cannot modify superuser status through user update")
        return v


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
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)


class PasswordReset(BaseModel):
    """Schema for resetting password (via email token)."""
    token: str
    new_password: str

    @field_validator('new_password')
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

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com"
            }
        }
    }


class PasswordResetConfirm(BaseModel):
    """Schema for confirming a password reset with token."""
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="New password")

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Enterprise-grade password strength validation"""
        return validate_password_strength(v)

    model_config = {
        "json_schema_extra": {
            "example": {
                "token": "eyJwYXlsb2FkIjp7ImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImV4cCI6MTcxMjM0NTY3OH19",
                "new_password": "NewSecurePassword123"
            }
        }
    }
