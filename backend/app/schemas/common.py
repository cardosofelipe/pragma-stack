"""
Common schemas used across the API for pagination, responses, etc.
"""
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field
from math import ceil


T = TypeVar('T')


class PaginationParams(BaseModel):
    """Parameters for pagination."""

    page: int = Field(
        default=1,
        ge=1,
        description="Page number (1-indexed)"
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of items per page (max 100)"
    )

    @property
    def offset(self) -> int:
        """Calculate the offset for database queries."""
        return (self.page - 1) * self.limit

    @property
    def skip(self) -> int:
        """Alias for offset (compatibility with existing code)."""
        return self.offset

    model_config = {
        "json_schema_extra": {
            "example": {
                "page": 1,
                "limit": 20
            }
        }
    }


class PaginationMeta(BaseModel):
    """Metadata for paginated responses."""

    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items in current page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total": 150,
                "page": 1,
                "page_size": 20,
                "total_pages": 8,
                "has_next": True,
                "has_prev": False
            }
        }
    }


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    data: List[T] = Field(..., description="List of items")
    pagination: PaginationMeta = Field(..., description="Pagination metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "data": [
                    {"id": "123", "name": "Example Item"}
                ],
                "pagination": {
                    "total": 150,
                    "page": 1,
                    "page_size": 20,
                    "total_pages": 8,
                    "has_next": True,
                    "has_prev": False
                }
            }
        }
    }


class MessageResponse(BaseModel):
    """Simple message response."""

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(..., description="Human-readable message")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "message": "Operation completed successfully"
            }
        }
    }


def create_pagination_meta(
    total: int,
    page: int,
    limit: int,
    items_count: int
) -> PaginationMeta:
    """
    Helper function to create pagination metadata.

    Args:
        total: Total number of items
        page: Current page number
        limit: Items per page
        items_count: Number of items in current page

    Returns:
        PaginationMeta object with calculated values
    """
    total_pages = ceil(total / limit) if limit > 0 else 0

    return PaginationMeta(
        total=total,
        page=page,
        page_size=items_count,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )
