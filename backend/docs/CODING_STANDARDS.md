# Coding Standards

This document outlines the coding standards and best practices for the FastAPI backend application.

## Table of Contents

- [General Principles](#general-principles)
- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [Error Handling](#error-handling)
- [Database Operations](#database-operations)
- [API Endpoints](#api-endpoints)
- [Authentication & Security](#authentication--security)
- [Testing](#testing)
- [Logging](#logging)
- [Documentation](#documentation)

## General Principles

### 1. Follow PEP 8

All Python code should follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines:

- Use 4 spaces for indentation (never tabs)
- Maximum line length: 88 characters (Black formatter default)
- Two blank lines between top-level functions and classes
- One blank line between methods in a class

### 2. Type Hints

Always use type hints for function parameters and return values:

```python
from typing import Optional, List
from uuid import UUID

def get_user(db: Session, user_id: UUID) -> Optional[User]:
    """Retrieve a user by ID."""
    return db.query(User).filter(User.id == user_id).first()
```

### 3. Docstrings

Use Google-style docstrings for all public functions, classes, and methods:

```python
def create_user(db: Session, user_in: UserCreate) -> User:
    """
    Create a new user in the database.

    Args:
        db: Database session
        user_in: User creation schema with validated data

    Returns:
        The newly created user object

    Raises:
        DuplicateError: If user with email already exists
        ValidationException: If validation fails
    """
    # Implementation
```

### 4. Code Formatting

Use automated formatters:
- **Black**: Code formatting
- **isort**: Import sorting
- **flake8**: Linting

Run before committing:
```bash
black app tests
isort app tests
flake8 app tests
```

## Code Organization

### Layer Separation

Follow the 5-layer architecture strictly:

```
API Layer (routes/)
    ↓ calls
Dependencies (dependencies/)
    ↓ injects
Service Layer (services/)
    ↓ calls
CRUD Layer (crud/)
    ↓ uses
Models & Schemas (models/, schemas/)
```

**Rules:**
- Routes should NOT directly call CRUD operations (use services when business logic is needed)
- CRUD operations should NOT contain business logic
- Models should NOT import from higher layers
- Each layer should only depend on the layer directly below it

### File Organization

```python
# Standard import order:
# 1. Standard library
import logging
from datetime import datetime
from typing import Optional, List

# 2. Third-party packages
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# 3. Local application imports
from app.api.dependencies.auth import get_current_user
from app.crud import user_crud
from app.models.user import User
from app.schemas.users import UserResponse, UserCreate
```

## Naming Conventions

### Variables and Functions

```python
# Use snake_case for variables and functions
user_id = "123"
def get_user_by_email(email: str) -> Optional[User]:
    pass

# Use UPPER_CASE for constants
MAX_LOGIN_ATTEMPTS = 5
DEFAULT_PAGE_SIZE = 20
```

### Classes

```python
# Use PascalCase for class names
class UserSession:
    pass

class AuthenticationError(APIException):
    pass
```

### Database Tables and Columns

```python
# Use snake_case for table and column names
class User(Base):
    __tablename__ = "users"

    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime)
```

### API Endpoints

```python
# Use kebab-case for URL paths
@router.get("/user-sessions")
@router.post("/password-reset")
@router.delete("/user-sessions/expired")
```

### Files and Directories

```python
# Use snake_case for file and directory names
user_session.py
auth_service.py
email_service.py
```

## Error Handling

### Use Custom Exceptions

Always use custom exceptions from `app.core.exceptions`:

```python
from app.core.exceptions import (
    NotFoundError,
    DuplicateError,
    AuthenticationError,
    AuthorizationError,
    ValidationException,
    DatabaseError
)

# Good
if not user:
    raise NotFoundError(
        message="User not found",
        error_code="USER_001",
        field="user_id"
    )

# Bad - Don't use generic exceptions
if not user:
    raise ValueError("User not found")
```

### Error Handling Pattern

Always follow this pattern in CRUD operations:

```python
from sqlalchemy.exc import IntegrityError, OperationalError, DataError

def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user."""
    try:
        db_user = User(**user_in.model_dump())
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User created: {db_user.id}")
        return db_user

    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error creating user: {str(e)}")

        # Check for specific constraint violations
        if "unique constraint" in str(e).lower():
            if "email" in str(e).lower():
                raise DuplicateError(
                    message="User with this email already exists",
                    error_code="USER_002",
                    field="email"
                )
        raise DatabaseError(message="Failed to create user")

    except OperationalError as e:
        db.rollback()
        logger.error(f"Database operational error: {str(e)}", exc_info=True)
        raise DatabaseError(message="Database is currently unavailable")

    except DataError as e:
        db.rollback()
        logger.error(f"Invalid data error: {str(e)}")
        raise ValidationException(
            message="Invalid data format",
            error_code="VAL_001"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error creating user: {str(e)}", exc_info=True)
        raise
```

### Error Response Format

All error responses follow this structure:

```python
{
    "success": false,
    "errors": [
        {
            "code": "AUTH_001",
            "message": "Invalid credentials",
            "field": "email"  # Optional
        }
    ]
}
```

## Database Operations

### Use the CRUD Base Class

Always inherit from `CRUDBase` for database operations:

```python
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations for User model."""

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return db.query(User).filter(User.email == email).first()

user_crud = CRUDUser(User)
```

### Transaction Management

#### In Routes (Dependency Injection)

```python
@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new user.

    The database session is automatically managed by FastAPI.
    Commit on success, rollback on error.
    """
    return user_crud.create(db, obj_in=user_in)
```

#### In Services (Context Manager)

```python
from app.core.database import transaction_scope

def complex_operation():
    """
    Perform multiple database operations atomically.

    The context manager automatically commits on success
    or rolls back on error.
    """
    with transaction_scope() as db:
        user = user_crud.create(db, obj_in=user_data)
        session = session_crud.create(db, obj_in=session_data)
        return user, session
```

### Use Soft Deletes

Prefer soft deletes over hard deletes for audit trails:

```python
# Good - Soft delete (sets deleted_at)
user_crud.soft_delete(db, id=user_id)

# Acceptable only when required - Hard delete
user_crud.remove(db, id=user_id)
```

### Query Patterns

```python
# Always use parameterized queries (SQLAlchemy does this automatically)
# Good
user = db.query(User).filter(User.email == email).first()

# Bad - Never construct raw SQL with string interpolation
db.execute(f"SELECT * FROM users WHERE email = '{email}'")  # SQL INJECTION!

# For complex queries, use SQLAlchemy query builder
from sqlalchemy import and_, or_

active_users = (
    db.query(User)
    .filter(
        and_(
            User.is_active == True,
            User.deleted_at.is_(None),
            or_(
                User.role == "admin",
                User.role == "user"
            )
        )
    )
    .all()
)
```

## API Endpoints

### Endpoint Structure

```python
from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter

router = APIRouter(prefix="/api/v1/users", tags=["users"])
limiter = Limiter(key_func=lambda request: request.client.host)

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Retrieve the currently authenticated user's information.",
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Get current user information.

    Requires authentication. Rate limited to 30 requests per minute.
    """
    return current_user
```

### Rate Limiting

Apply appropriate rate limits to all endpoints:

```python
# Read operations - More permissive
@limiter.limit("60/minute")

# Write operations - More restrictive
@limiter.limit("10/minute")

# Sensitive operations - Very restrictive
@limiter.limit("5/minute")

# Authentication endpoints - Strict
@limiter.limit("5/minute")
```

### Response Models

Always specify response models:

```python
# Single object
@router.get("/users/{user_id}", response_model=UserResponse)

# List with pagination
@router.get("/users", response_model=PaginatedResponse[UserResponse])

# Message response
@router.delete("/users/{user_id}", response_model=MessageResponse)

# Generic success message
return MessageResponse(success=True, message="User deleted successfully")
```

### Request Validation

Use Pydantic schemas for request validation:

```python
from pydantic import Field, field_validator, ConfigDict

class UserCreate(BaseModel):
    """Schema for creating a new user."""

    model_config = ConfigDict(from_attributes=True)

    email: str = Field(
        ...,
        description="User's email address",
        examples=["user@example.com"]
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Password (minimum 8 characters)",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if not "@" in v:
            raise ValueError("Invalid email format")
        return v.lower()
```

### Pagination

Always implement pagination for list endpoints:

```python
from app.schemas.common import PaginationParams, PaginatedResponse

@router.get("/users", response_model=PaginatedResponse[UserResponse])
def list_users(
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """
    List all users with pagination.

    Default page size: 20
    Maximum page size: 100
    """
    users, total = user_crud.get_multi_with_total(
        db,
        skip=pagination.offset,
        limit=pagination.limit
    )
    return PaginatedResponse(data=users, pagination=pagination.create_meta(total))
```

## Authentication & Security

### Password Security

```python
from app.core.auth import get_password_hash, verify_password

# Always hash passwords before storing
hashed_password = get_password_hash(plain_password)

# Never log or return passwords
logger.info(f"User {user.email} logged in")  # Good
logger.info(f"Password: {password}")  # NEVER DO THIS!

# Use bcrypt with appropriate cost factor (current: 12)
```

### JWT Tokens

```python
from app.core.auth import create_access_token, create_refresh_token

# Create tokens with appropriate expiry
access_token = create_access_token(
    subject=str(user.id),
    additional_claims={"is_superuser": user.is_superuser}
)

# Always include token type in payload
# Access tokens: 15 minutes
# Refresh tokens: 7 days
```

### Authorization Checks

```python
# Use dependency injection for authorization
from app.api.dependencies.auth import (
    get_current_user,
    get_current_active_user,
    get_current_superuser
)

# Require authentication
@router.get("/protected")
def protected_route(
    current_user: User = Depends(get_current_active_user)
):
    pass

# Require superuser role
@router.post("/admin/users")
def admin_route(
    current_user: User = Depends(get_current_superuser)
):
    pass

# Check ownership
def delete_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = resource_crud.get(db, id=resource_id)
    if not resource:
        raise NotFoundError("Resource not found")

    if resource.user_id != current_user.id and not current_user.is_superuser:
        raise AuthorizationError("You can only delete your own resources")

    resource_crud.remove(db, id=resource_id)
```

### Input Validation

```python
# Always validate and sanitize user input
from pydantic import field_validator

class UserUpdate(BaseModel):
    email: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if not "@" in v:
                raise ValueError("Invalid email format")
        return v
```

## Testing

### Test Structure

Follow the existing test structure:

```
tests/
├── conftest.py              # Shared fixtures
├── api/                     # Integration tests
│   ├── test_users.py
│   └── test_auth.py
├── crud/                    # Unit tests for CRUD
├── models/                  # Model tests
└── services/                # Service tests
```

### Test Naming Convention

```python
# Test function names should be descriptive
def test_create_user_with_valid_data():
    """Test creating a user with valid data succeeds."""
    pass

def test_create_user_with_duplicate_email_raises_error():
    """Test creating a user with duplicate email raises DuplicateError."""
    pass

def test_get_user_that_does_not_exist_returns_none():
    """Test getting non-existent user returns None."""
    pass
```

### Use Fixtures

```python
import pytest
from app.models.user import User

@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password="hashed",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_get_user(db_session: Session, test_user: User):
    """Test retrieving a user by ID."""
    user = user_crud.get(db_session, id=test_user.id)
    assert user is not None
    assert user.email == test_user.email
```

### Test Coverage

Aim for high test coverage:

```python
# Test the happy path
def test_create_user_success():
    pass

# Test error cases
def test_create_user_with_duplicate_email():
    pass

def test_create_user_with_invalid_email():
    pass

# Test edge cases
def test_create_user_with_empty_password():
    pass

# Test authorization
def test_user_cannot_delete_other_users_resources():
    pass

def test_superuser_can_delete_any_resource():
    pass
```

### API Testing Pattern

```python
from fastapi.testclient import TestClient

def test_create_user_endpoint(client: TestClient):
    """Test POST /api/v1/users endpoint."""
    response = client.post(
        "/api/v1/users",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "password" not in data  # Never return password
    assert "id" in data
```

## Logging

### Logging Levels

Use appropriate logging levels:

```python
import logging

logger = logging.getLogger(__name__)

# DEBUG - Detailed diagnostic information
logger.debug(f"Processing user {user_id} with parameters: {params}")

# INFO - General informational messages
logger.info(f"User {user_id} logged in successfully")

# WARNING - Warning messages for unexpected but handled situations
logger.warning(f"User {user_id} attempted to access restricted resource")

# ERROR - Error messages for failures
logger.error(f"Failed to create user: {str(e)}", exc_info=True)

# CRITICAL - Critical messages for severe failures
logger.critical(f"Database connection lost: {str(e)}")
```

### What to Log

```python
# DO log:
# - User actions (login, logout, resource access)
# - System events (startup, shutdown, scheduled jobs)
# - Errors and exceptions
# - Performance metrics
# - Security events

logger.info(f"User {user.email} logged in from {ip_address}")
logger.error(f"Failed to send email to {user.email}: {str(e)}", exc_info=True)
logger.warning(f"Rate limit exceeded for IP {ip_address}")

# DON'T log:
# - Passwords or tokens
# - Sensitive personal information
# - Credit card numbers or payment details
# - Full request/response bodies (may contain sensitive data)

# Bad examples:
logger.info(f"User password: {password}")  # NEVER!
logger.debug(f"Token: {access_token}")  # NEVER!
```

### Structured Logging

Use structured logging for better parsing:

```python
logger.info(
    "User action",
    extra={
        "user_id": str(user.id),
        "action": "login",
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent")
    }
)
```

## Documentation

### Code Comments

```python
# Use comments to explain WHY, not WHAT
# Good
# Hash password using bcrypt to protect against rainbow table attacks
hashed = get_password_hash(password)

# Bad - The code already shows what it does
# Get password hash
hashed = get_password_hash(password)

# Use comments for complex logic
# Calculate the number of days until token expiration, accounting for
# timezone differences and daylight saving time changes
days_until_expiry = (expires_at - now).total_seconds() / 86400
```

### API Documentation

```python
# Use comprehensive docstrings and FastAPI's automatic documentation

@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="""
    Create a new user account.

    Requirements:
    - Email must be unique
    - Password must be at least 8 characters
    - No authentication required

    Returns the created user object with a generated UUID.
    """,
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Invalid input data"},
        409: {"description": "User with email already exists"}
    }
)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account."""
    pass
```

### Schema Documentation

```python
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    """
    Schema for creating a new user.

    This schema is used for user registration and admin user creation.
    Passwords are automatically hashed before storage.
    """

    email: str = Field(
        ...,
        description="User's email address (must be unique)",
        examples=["user@example.com"],
        json_schema_extra={"format": "email"}
    )

    password: str = Field(
        ...,
        min_length=8,
        description="User's password (minimum 8 characters)",
        examples=["SecurePass123!"]
    )

    is_active: bool = Field(
        default=True,
        description="Whether the user account is active"
    )
```

### README Files

Each major feature or module should have a README explaining:
- Purpose and overview
- Architecture and design decisions
- Setup and configuration
- Usage examples
- API endpoints (if applicable)
- Testing instructions

Example: `backend/SESSION_IMPLEMENTATION_CONTEXT.md`

## Summary

Following these coding standards ensures:
- **Consistency**: Code is uniform across the project
- **Maintainability**: Easy to understand and modify
- **Security**: Best practices prevent vulnerabilities
- **Quality**: High test coverage and error handling
- **Documentation**: Clear and comprehensive docs

For feature implementation examples, see:
- **Architecture Guide**: `backend/docs/ARCHITECTURE.md`
- **Feature Example**: `backend/docs/FEATURE_EXAMPLE.md`
