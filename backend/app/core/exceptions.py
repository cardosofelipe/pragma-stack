"""
Custom exceptions and global exception handlers for the API.
"""
import logging
from typing import Optional, Union

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas.errors import ErrorCode, ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


class APIException(HTTPException):
    """
    Base exception class with error code support.

    This exception provides a standardized way to raise HTTP exceptions
    with machine-readable error codes.
    """

    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        field: Optional[str] = None,
        headers: Optional[dict] = None
    ):
        self.error_code = error_code
        self.field = field
        self.message = message
        super().__init__(
            status_code=status_code,
            detail=message,
            headers=headers
        )


class AuthenticationError(APIException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: ErrorCode = ErrorCode.INVALID_CREDENTIALS,
        field: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            message=message,
            field=field,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(APIException):
    """Raised when user lacks required permissions."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        error_code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
            message=message
        )


class NotFoundError(APIException):
    """Raised when a resource is not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        error_code: ErrorCode = ErrorCode.NOT_FOUND
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            message=message
        )


class DuplicateError(APIException):
    """Raised when attempting to create a duplicate resource."""

    def __init__(
        self,
        message: str = "Resource already exists",
        error_code: ErrorCode = ErrorCode.DUPLICATE_ENTRY,
        field: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code=error_code,
            message=message,
            field=field
        )


class ValidationException(APIException):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str = "Validation error",
        error_code: ErrorCode = ErrorCode.VALIDATION_ERROR,
        field: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code,
            message=message,
            field=field
        )


class DatabaseError(APIException):
    """Raised when a database operation fails."""

    def __init__(
        self,
        message: str = "Database operation failed",
        error_code: ErrorCode = ErrorCode.DATABASE_ERROR
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            message=message
        )


# Global exception handlers


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """
    Handler for APIException and its subclasses.

    Returns a standardized error response with error code and message.
    """
    logger.warning(
        f"API exception: {exc.error_code} - {exc.message} "
        f"(status: {exc.status_code}, path: {request.url.path})"
    )

    error_response = ErrorResponse(
        errors=[ErrorDetail(
            code=exc.error_code,
            message=exc.message,
            field=exc.field
        )]
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(),
        headers=exc.headers
    )


async def validation_exception_handler(
    request: Request,
    exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """
    Handler for Pydantic validation errors.

    Converts Pydantic validation errors to standardized error response format.
    """
    errors = []

    if isinstance(exc, RequestValidationError):
        validation_errors = exc.errors()
    else:
        validation_errors = exc.errors()

    for error in validation_errors:
        # Extract field name from error location
        field = None
        if error.get("loc") and len(error["loc"]) > 1:
            # Skip 'body' or 'query' prefix in location
            field = ".".join(str(x) for x in error["loc"][1:])

        errors.append(ErrorDetail(
            code=ErrorCode.VALIDATION_ERROR,
            message=error["msg"],
            field=field
        ))

    logger.warning(
        f"Validation error: {len(errors)} errors "
        f"(path: {request.url.path})"
    )

    error_response = ErrorResponse(errors=errors)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handler for standard HTTPException.

    Converts standard FastAPI HTTPException to standardized error response format.
    """
    # Map status codes to error codes
    status_code_to_error_code = {
        400: ErrorCode.INVALID_INPUT,
        401: ErrorCode.AUTHENTICATION_REQUIRED,
        403: ErrorCode.INSUFFICIENT_PERMISSIONS,
        404: ErrorCode.NOT_FOUND,
        405: ErrorCode.METHOD_NOT_ALLOWED,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.INTERNAL_ERROR,
    }

    error_code = status_code_to_error_code.get(
        exc.status_code,
        ErrorCode.INTERNAL_ERROR
    )

    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail} "
        f"(path: {request.url.path})"
    )

    error_response = ErrorResponse(
        errors=[ErrorDetail(
            code=error_code,
            message=str(exc.detail)
        )]
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(),
        headers=exc.headers
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for unhandled exceptions.

    Logs the full exception and returns a generic error response to avoid
    leaking sensitive information in production.
    """
    logger.error(
        f"Unhandled exception: {type(exc).__name__} - {str(exc)} "
        f"(path: {request.url.path})",
        exc_info=True
    )

    # In production, don't expose internal error details
    from app.core.config import settings
    if settings.ENVIRONMENT == "production":
        message = "An internal error occurred. Please try again later."
    else:
        message = f"{type(exc).__name__}: {str(exc)}"

    error_response = ErrorResponse(
        errors=[ErrorDetail(
            code=ErrorCode.INTERNAL_ERROR,
            message=message
        )]
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump()
    )
