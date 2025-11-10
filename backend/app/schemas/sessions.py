"""
Pydantic schemas for user session management.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionBase(BaseModel):
    """Base schema for user sessions."""

    device_name: str | None = Field(
        None, max_length=255, description="Friendly device name"
    )
    device_id: str | None = Field(
        None, max_length=255, description="Persistent device identifier"
    )


class SessionCreate(SessionBase):
    """Schema for creating a new session (internal use)."""

    user_id: UUID
    refresh_token_jti: str = Field(..., max_length=255)
    ip_address: str | None = Field(None, max_length=45)
    user_agent: str | None = Field(None, max_length=500)
    last_used_at: datetime
    expires_at: datetime
    location_city: str | None = Field(None, max_length=100)
    location_country: str | None = Field(None, max_length=100)


class SessionUpdate(BaseModel):
    """Schema for updating a session (internal use)."""

    last_used_at: datetime | None = None
    is_active: bool | None = None
    refresh_token_jti: str | None = None
    expires_at: datetime | None = None


class SessionResponse(SessionBase):
    """
    Schema for session responses to clients.

    This is what users see when they list their active sessions.
    """

    id: UUID
    ip_address: str | None = None
    location_city: str | None = None
    location_country: str | None = None
    last_used_at: datetime
    created_at: datetime
    expires_at: datetime
    is_current: bool = Field(
        default=False, description="Whether this is the current session"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "device_name": "iPhone 14",
                "device_id": "device-abc-123",
                "ip_address": "192.168.1.100",
                "location_city": "San Francisco",
                "location_country": "United States",
                "last_used_at": "2025-10-31T12:00:00Z",
                "created_at": "2025-10-30T09:00:00Z",
                "expires_at": "2025-11-06T09:00:00Z",
                "is_current": True,
            }
        },
    )


class SessionListResponse(BaseModel):
    """Response containing list of sessions."""

    sessions: list[SessionResponse]
    total: int = Field(..., description="Total number of active sessions")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sessions": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "device_name": "iPhone 14",
                        "ip_address": "192.168.1.100",
                        "last_used_at": "2025-10-31T12:00:00Z",
                        "created_at": "2025-10-30T09:00:00Z",
                        "expires_at": "2025-11-06T09:00:00Z",
                        "is_current": True,
                    }
                ],
                "total": 1,
            }
        }
    )


class LogoutRequest(BaseModel):
    """Request schema for logout endpoint."""

    refresh_token: str = Field(
        ..., description="Refresh token for the session to logout from", min_length=10
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
        }
    )


class AdminSessionResponse(SessionBase):
    """
    Schema for session responses in admin panel.

    Includes user information for admin to see who owns each session.
    """

    id: UUID
    user_id: UUID
    user_email: str = Field(..., description="Email of the user who owns this session")
    user_full_name: str | None = Field(None, description="Full name of the user")
    ip_address: str | None = None
    location_city: str | None = None
    location_country: str | None = None
    last_used_at: datetime
    created_at: datetime
    expires_at: datetime
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "456e7890-e89b-12d3-a456-426614174001",
                "user_email": "user@example.com",
                "user_full_name": "John Doe",
                "device_name": "iPhone 14",
                "device_id": "device-abc-123",
                "ip_address": "192.168.1.100",
                "location_city": "San Francisco",
                "location_country": "United States",
                "last_used_at": "2025-10-31T12:00:00Z",
                "created_at": "2025-10-30T09:00:00Z",
                "expires_at": "2025-11-06T09:00:00Z",
                "is_active": True,
            }
        },
    )


class DeviceInfo(BaseModel):
    """Device information extracted from request."""

    device_name: str | None = None
    device_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    location_city: str | None = None
    location_country: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_name": "Chrome on MacBook",
                "device_id": "device-xyz-789",
                "ip_address": "192.168.1.50",
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
                "location_city": "San Francisco",
                "location_country": "United States",
            }
        }
    )
