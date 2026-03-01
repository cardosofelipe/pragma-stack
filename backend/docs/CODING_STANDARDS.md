# Coding Standards

This document outlines the coding standards and best practices for the FastAPI backend application.

## Table of Contents

- [General Principles](#general-principles)
- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [Error Handling](#error-handling)
- [Data Models and Migrations](#data-models-and-migrations)
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
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """Retrieve a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
```

**Modern Python Type Hints:**
- Use `list[T]` instead of `List[T]` (Python 3.10+)
- Use `dict[K, V]` instead of `Dict[K, V]`
- Use `T | None` instead of `Optional[T]`
- Use `str | int` instead of `Union[str, int]`

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
- **Ruff**: Code formatting and linting (replaces Black, isort, flake8)
- **pyright**: Static type checking

Run before committing (or use `make validate`):
```bash
uv run ruff format app tests
uv run ruff check app tests
uv run pyright app
```

## Code Organization

### Layer Separation

Follow the 5-layer architecture strictly:

```
API Layer (routes/)
    ↓ calls (via service injected from dependencies/services.py)
Service Layer (services/)
    ↓ calls
Repository Layer (repositories/)
    ↓ uses
Models & Schemas (models/, schemas/)
```

**Rules:**
- Routes must NEVER import repositories directly — always use a service
- Services call repositories; repositories contain only database operations
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
from app.api.dependencies.services import get_user_service
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

Always follow this pattern in CRUD operations (Async version):

```python
from sqlalchemy.exc import IntegrityError, OperationalError, DataError
from sqlalchemy.ext.asyncio import AsyncSession

async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """Create a new user."""
    try:
        db_user = User(**user_in.model_dump())
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        logger.info(f"User created: {db_user.id}")
        return db_user

    except IntegrityError as e:
        await db.rollback()
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
        await db.rollback()
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

## Data Models and Migrations

### Model Definition Best Practices

To ensure Alembic autogenerate works reliably without drift, follow these rules:

#### 1. Simple Indexes: Use Column-Level or `__table_args__`, Not Both

```python
# ❌ BAD - Creates DUPLICATE indexes with different names
class User(Base):
    role = Column(String(50), index=True)  # Creates ix_users_role

    __table_args__ = (
        Index("ix_user_role", "role"),  # Creates ANOTHER index!
    )

# ✅ GOOD - Choose ONE approach
class User(Base):
    role = Column(String(50))  # No index=True

    __table_args__ = (
        Index("ix_user_role", "role"),  # Single index with explicit name
    )

# ✅ ALSO GOOD - For simple single-column indexes
class User(Base):
    role = Column(String(50), index=True)  # Auto-named ix_users_role
```

#### 2. Composite Indexes: Always Use `__table_args__`

```python
class UserOrganization(Base):
    __tablename__ = "user_organizations"

    user_id = Column(UUID, nullable=False)
    organization_id = Column(UUID, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    __table_args__ = (
        Index("ix_user_org_user_active", "user_id", "is_active"),
        Index("ix_user_org_org_active", "organization_id", "is_active"),
    )
```

#### 3. Functional/Partial Indexes: Use `ix_perf_` Prefix

Alembic **cannot** auto-detect:
- **Functional indexes**: `LOWER(column)`, `UPPER(column)`, expressions
- **Partial indexes**: Indexes with `WHERE` clauses

**Solution**: Use the `ix_perf_` naming prefix. Any index with this prefix is automatically excluded from autogenerate by `env.py`.

```python
# In migration file (NOT in model) - use ix_perf_ prefix:
op.create_index(
    "ix_perf_users_email_lower",  # <-- ix_perf_ prefix!
    "users",
    [sa.text("LOWER(email)")],  # Functional
    postgresql_where=sa.text("deleted_at IS NULL"),  # Partial
)
```

**No need to update `env.py`** - the prefix convention handles it automatically:

```python
# env.py - already configured:
def include_object(object, name, type_, reflected, compare_to):
    if type_ == "index" and name:
        if name.startswith("ix_perf_"):  # Auto-excluded!
            return False
    return True
```

**To add new performance indexes:**
1. Create a new migration file
2. Name your indexes with `ix_perf_` prefix
3. Done - Alembic will ignore them automatically

#### 4. Use Correct Types

```python
# ✅ GOOD - PostgreSQL-native types
from sqlalchemy.dialects.postgresql import JSONB, UUID

class User(Base):
    id = Column(UUID(as_uuid=True), primary_key=True)
    preferences = Column(JSONB)  # Not JSON!

# ❌ BAD - Generic types may cause migration drift
from sqlalchemy import JSON
preferences = Column(JSON)  # May detect as different from JSONB
```

### Migration Workflow

#### Creating Migrations

```bash
# Generate autogenerate migration:
python migrate.py generate "Add new field"

# Or inside Docker:
docker exec -w /app backend uv run alembic revision --autogenerate -m "Add new field"

# Apply migration:
python migrate.py apply
# Or: docker exec -w /app backend uv run alembic upgrade head
```

#### Testing for Drift

After any model changes, verify no unintended drift:

```bash
# Generate test migration
docker exec -w /app backend uv run alembic revision --autogenerate -m "test_drift"

# Check the generated file - should be empty (just 'pass')
# If it has operations, investigate why

# Delete test file
rm backend/app/alembic/versions/*_test_drift.py
```

#### Migration File Structure

```
backend/app/alembic/versions/
├── cbddc8aa6eda_initial_models.py    # Auto-generated, tracks all models
├── 0002_performance_indexes.py        # Manual, functional/partial indexes
└── __init__.py
```

### Summary: What Goes Where

| Index Type | In Model? | Alembic Detects? | Where to Define |
|------------|-----------|------------------|-----------------|
| Simple column (`index=True`) | Yes | Yes | Column definition |
| Composite (`col1, col2`) | Yes | Yes | `__table_args__` |
| Unique composite | Yes | Yes | `__table_args__` with `unique=True` |
| Functional (`LOWER(col)`) | No | No | Migration with `ix_perf_` prefix |
| Partial (`WHERE ...`) | No | No | Migration with `ix_perf_` prefix |

## Database Operations

### Async CRUD Pattern

**IMPORTANT**: This application uses **async SQLAlchemy** with modern patterns for better performance and testability.

#### Core Principles

1. **Async by Default**: All database operations are async
2. **Modern SQLAlchemy 2.0**: Use `select()` instead of `.query()`
3. **Type Safety**: Full type hints with generics
4. **Testability**: Easy to mock and test
5. **Consistent Ordering**: Always order queries for pagination

### Use the Async Repository Base Class

Always inherit from `RepositoryBase` for database operations:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import RepositoryBase
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate

class UserRepository(RepositoryBase[User, UserCreate, UserUpdate]):
    """Repository for User model — database operations only."""

    async def get_by_email(
        self,
        db: AsyncSession,
        email: str
    ) -> User | None:
        """Get user by email address."""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

user_repo = UserRepository(User)
```

**Key Points:**
- Use `async def` for all methods
- Use `select()` instead of `db.query()`
- Use `await db.execute()` for queries
- Use `.scalar_one_or_none()` instead of `.first()`
- Use `T | None` instead of `Optional[T]`
- Repository instances are used internally by services — never import them in routes

### Modern SQLAlchemy Patterns

#### Query Pattern (Old vs New)

```python
# ❌ OLD - Legacy query() API (sync)
def get_user(db: Session, user_id: UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

# ✅ NEW - Modern select() API (async)
async def get_user(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

#### Multiple Results

```python
# ❌ OLD
def get_users(db: Session) -> List[User]:
    return db.query(User).all()

# ✅ NEW
async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User))
    return list(result.scalars().all())
```

#### With Ordering and Pagination

```python
# ✅ CORRECT - Always use ordering for pagination
async def get_users_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.deleted_at.is_(None))  # Soft delete filter
        .order_by(User.created_at.desc())  # Consistent ordering
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
```

#### With Relationships (Eager Loading)

```python
from sqlalchemy.orm import selectinload

# Load user with sessions
async def get_user_with_sessions(
    db: AsyncSession,
    user_id: UUID
) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.sessions))  # Eager load relationship
    )
    return result.scalar_one_or_none()
```

### Transaction Management

#### In Routes (Dependency Injection)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user.

    The database session is automatically managed by FastAPI.
    Commit on success, rollback on error.
    """
    return await user_service.create_user(db, obj_in=user_in)
```

**Key Points:**
- Route functions must be `async def`
- Database parameter is `AsyncSession`
- Always `await` CRUD operations

#### In Services (Multiple Operations)

```python
async def complex_operation(
    db: AsyncSession,
    user_data: UserCreate,
    session_data: SessionCreate
) -> tuple[User, UserSession]:
    """
    Perform multiple database operations atomically.

    Services call repositories; commit/rollback is handled inside
    each repository method.
    """
    user = await user_repo.create(db, obj_in=user_data)
    session = await session_repo.create(db, obj_in=session_data)
    return user, session
```

### Use Soft Deletes

Prefer soft deletes over hard deletes for audit trails:

```python
# Good - Soft delete (sets deleted_at)
await user_repo.soft_delete(db, id=user_id)

# Acceptable only when required - Hard delete
await user_repo.remove(db, id=user_id)
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
async def list_users(
    pagination: PaginationParams = Depends(),
    user_service: UserService = Depends(get_user_service),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users with pagination.

    Default page size: 20
    Maximum page size: 100
    """
    users, total = await user_service.get_users(
        db, skip=pagination.offset, limit=pagination.limit
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
async def delete_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    resource_service: ResourceService = Depends(get_resource_service),
    db: AsyncSession = Depends(get_db),
):
    # Service handles ownership check and raises appropriate errors
    await resource_service.delete_resource(
        db, resource_id=resource_id, user_id=current_user.id,
        is_superuser=current_user.is_superuser,
    )
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
├── conftest.py              # Shared fixtures (async)
├── api/                     # Integration tests
│   ├── test_users.py
│   └── test_auth.py
├── repositories/            # Unit tests for repositories
├── services/                # Unit tests for services
└── models/                  # Model tests
```

### Async Testing with pytest-asyncio

**IMPORTANT**: All tests using async database operations must use `pytest-asyncio`.

```python
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

# Mark async tests
@pytest.mark.asyncio
async def test_create_user():
    """Test async user creation."""
    pass
```

### Test Naming Convention

```python
# Test function names should be descriptive and use async
@pytest.mark.asyncio
async def test_create_user_with_valid_data():
    """Test creating a user with valid data succeeds."""
    pass

@pytest.mark.asyncio
async def test_create_user_with_duplicate_email_raises_error():
    """Test creating a user with duplicate email raises DuplicateError."""
    pass

@pytest.mark.asyncio
async def test_get_user_that_does_not_exist_returns_none():
    """Test getting non-existent user returns None."""
    pass
```

### Use Async Fixtures

```python
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password="hashed",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_get_user(db_session: AsyncSession, test_user: User):
    """Test retrieving a user by ID."""
    user = await user_repo.get(db_session, id=test_user.id)
    assert user is not None
    assert user.email == test_user.email
```

### Database Test Configuration

Use SQLite in-memory for tests with proper pooling:

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.base import Base

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create async engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # IMPORTANT: Share single in-memory DB
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(db_engine):
    """Create async session for tests."""
    async_session = sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session
        await session.rollback()
```

### Test Coverage

Aim for 80%+ test coverage:

```python
# Test the happy path
@pytest.mark.asyncio
async def test_create_user_success():
    pass

# Test error cases
@pytest.mark.asyncio
async def test_create_user_with_duplicate_email():
    pass

@pytest.mark.asyncio
async def test_create_user_with_invalid_email():
    pass

# Test edge cases
@pytest.mark.asyncio
async def test_create_user_with_empty_password():
    pass

# Test authorization
@pytest.mark.asyncio
async def test_user_cannot_delete_other_users_resources():
    pass

@pytest.mark.asyncio
async def test_superuser_can_delete_any_resource():
    pass
```

### API Testing Pattern (Async)

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_user_endpoint():
    """Test POST /api/v1/users endpoint (async)."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
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
