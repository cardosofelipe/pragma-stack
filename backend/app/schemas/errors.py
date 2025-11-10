"""
Error schemas for standardized API error responses.
"""

from enum import Enum

from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """Standard error codes for the API."""

    # Authentication errors (AUTH_xxx)
    INVALID_CREDENTIALS = "AUTH_001"
    TOKEN_EXPIRED = "AUTH_002"
    TOKEN_INVALID = "AUTH_003"
    INSUFFICIENT_PERMISSIONS = "AUTH_004"
    USER_INACTIVE = "AUTH_005"
    AUTHENTICATION_REQUIRED = "AUTH_006"
    OPERATION_FORBIDDEN = "AUTH_007"  # Operation not allowed for this user/role

    # User errors (USER_xxx)
    USER_NOT_FOUND = "USER_001"
    USER_ALREADY_EXISTS = "USER_002"
    USER_CREATION_FAILED = "USER_003"
    USER_UPDATE_FAILED = "USER_004"
    USER_DELETION_FAILED = "USER_005"

    # Validation errors (VAL_xxx)
    VALIDATION_ERROR = "VAL_001"
    INVALID_PASSWORD = "VAL_002"
    INVALID_EMAIL = "VAL_003"
    INVALID_PHONE_NUMBER = "VAL_004"
    INVALID_UUID = "VAL_005"
    INVALID_INPUT = "VAL_006"

    # Database errors (DB_xxx)
    DATABASE_ERROR = "DB_001"
    DUPLICATE_ENTRY = "DB_002"
    FOREIGN_KEY_VIOLATION = "DB_003"
    RECORD_NOT_FOUND = "DB_004"

    # Generic errors (SYS_xxx)
    INTERNAL_ERROR = "SYS_001"
    NOT_FOUND = "SYS_002"
    METHOD_NOT_ALLOWED = "SYS_003"
    RATE_LIMIT_EXCEEDED = "SYS_004"
    ALREADY_EXISTS = "SYS_005"  # Generic resource already exists error


class ErrorDetail(BaseModel):
    """Detailed information about a single error."""

    code: ErrorCode = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    field: str | None = Field(None, description="Field name if error is field-specific")

    model_config = {
        "json_schema_extra": {
            "example": {
                "code": "VAL_002",
                "message": "Password must be at least 8 characters long",
                "field": "password",
            }
        }
    }


class ErrorResponse(BaseModel):
    """Standardized error response format."""

    success: bool = Field(default=False, description="Always false for error responses")
    errors: list[ErrorDetail] = Field(..., description="List of errors that occurred")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": False,
                "errors": [
                    {
                        "code": "AUTH_001",
                        "message": "Invalid email or password",
                        "field": None,
                    }
                ],
            }
        }
    }
