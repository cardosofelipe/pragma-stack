# Architecture Guide

This document provides a comprehensive overview of the backend architecture, design patterns, and structural organization.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Layered Architecture](#layered-architecture)
- [Database Architecture](#database-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)
- [API Design](#api-design)
- [Background Jobs](#background-jobs)
- [Testing Strategy](#testing-strategy)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)

## Overview

This FastAPI backend application follows a **clean layered architecture** pattern with clear separation of concerns. The architecture is designed to be:

- **Scalable**: Can handle growing data and user load
- **Maintainable**: Easy to understand, modify, and extend
- **Testable**: Each layer can be tested independently
- **Secure**: Security built into every layer
- **Type-safe**: Comprehensive type hints throughout

### Key Architectural Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Dependency Injection**: Dependencies are injected rather than hard-coded
3. **Single Responsibility**: Each module, class, and function does one thing well
4. **Open/Closed Principle**: Open for extension, closed for modification
5. **Interface Segregation**: Clients depend only on interfaces they use
6. **Dependency Inversion**: Depend on abstractions, not concretions

## Technology Stack

### Core Framework

- **FastAPI 0.115.8+**: Modern async web framework
  - Automatic OpenAPI documentation
  - Built-in data validation
  - High performance (based on Starlette and Pydantic)
  - Type safety with Python 3.10+

- **Uvicorn**: ASGI server for production deployment
  - Async request handling
  - WebSocket support
  - HTTP/2 support

### Database Layer

- **SQLAlchemy 2.0+**: ORM and database toolkit
  - Supports async operations
  - Type-safe query building
  - Migration support via Alembic

- **PostgreSQL**: Primary production database
  - ACID compliance
  - Advanced indexing
  - JSON support
  - Full-text search capabilities

- **Alembic**: Database migration tool
  - Version-controlled schema changes
  - Automatic migration generation
  - Rollback support

### Data Validation

- **Pydantic 2.10+**: Data validation using Python type hints
  - Fast validation (Rust core)
  - Automatic JSON schema generation
  - Custom validators
  - Type coercion

### Authentication & Security

- **python-jose**: JWT token generation and validation
  - Cryptographic signing
  - Token expiration handling
  - Claims validation

- **passlib + bcrypt**: Password hashing
  - Industry-standard bcrypt algorithm
  - Configurable cost factor
  - Salt generation

### Additional Features

- **SlowAPI**: Rate limiting
  - Per-IP rate limiting
  - Per-route configuration
  - Redis backend support (optional)

- **APScheduler**: Background job scheduling
  - Cron-style scheduling
  - Interval-based jobs
  - Async job support

- **starlette-csrf**: CSRF protection
  - Token-based CSRF prevention
  - Cookie-based tokens

## Project Structure

```
backend/
├── app/
│   ├── alembic/                    # Database migrations
│   │   ├── versions/               # Migration files
│   │   └── env.py                  # Migration environment
│   │
│   ├── api/                        # API layer
│   │   ├── dependencies/           # Dependency injection
│   │   │   ├── auth.py            # Authentication dependencies
│   │   │   └── permissions.py     # Authorization dependencies
│   │   ├── routes/                # API endpoints
│   │   │   ├── auth.py            # Authentication routes
│   │   │   ├── users.py           # User management routes
│   │   │   ├── sessions.py        # Session management routes
│   │   │   ├── organizations.py   # Organization routes
│   │   │   └── admin.py           # Admin routes
│   │   └── main.py                # API router aggregation
│   │
│   ├── core/                       # Core functionality
│   │   ├── auth.py                # JWT and password utilities
│   │   ├── config.py              # Application configuration
│   │   ├── database.py            # Database connection
│   │   ├── exceptions.py          # Custom exception classes
│   │   └── middleware.py          # Custom middleware
│   │
│   ├── crud/                       # Database operations
│   │   ├── base.py                # Generic CRUD base class
│   │   ├── user.py                # User CRUD operations
│   │   ├── session.py             # Session CRUD operations
│   │   └── organization.py        # Organization CRUD
│   │
│   ├── models/                     # SQLAlchemy models
│   │   ├── base.py                # Base model with mixins
│   │   ├── user.py                # User model
│   │   ├── user_session.py        # Session tracking model
│   │   ├── organization.py        # Organization model
│   │   └── user_organization.py   # Many-to-many relationship
│   │
│   ├── schemas/                    # Pydantic schemas
│   │   ├── common.py              # Common schemas (pagination, etc.)
│   │   ├── errors.py              # Error response schemas
│   │   ├── users.py               # User schemas
│   │   ├── sessions.py            # Session schemas
│   │   └── organizations.py       # Organization schemas
│   │
│   ├── services/                   # Business logic
│   │   ├── auth_service.py        # Authentication service
│   │   ├── email_service.py       # Email service
│   │   └── session_cleanup.py     # Background cleanup
│   │
│   ├── utils/                      # Utility functions
│   │   ├── security.py            # Security utilities
│   │   ├── device.py              # Device detection
│   │   └── test_utils.py          # Testing utilities
│   │
│   ├── init_db.py                  # Database initialization
│   └── main.py                     # Application entry point
│
├── tests/                          # Test suite
│   ├── api/                        # Integration tests
│   ├── crud/                       # CRUD tests
│   ├── models/                     # Model tests
│   ├── services/                   # Service tests
│   └── conftest.py                 # Test configuration
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # This file
│   ├── CODING_STANDARDS.md         # Coding standards
│   └── FEATURE_EXAMPLE.md          # Feature implementation guide
│
├── requirements.txt                # Python dependencies
├── pytest.ini                      # Pytest configuration
├── .coveragerc                     # Coverage configuration
└── alembic.ini                     # Alembic configuration
```

## Layered Architecture

The application follows a strict 5-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (routes/)                     │
│  - HTTP endpoints                                            │
│  - Request/response handling                                 │
│  - OpenAPI documentation                                     │
│  - Rate limiting                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ calls
┌──────────────────────────▼──────────────────────────────────┐
│               Dependencies (dependencies/)                   │
│  - Authentication (get_current_user)                         │
│  - Authorization (permission checks)                         │
│  - Database session injection                                │
│  - Request context                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ injects
┌──────────────────────────▼──────────────────────────────────┐
│                 Service Layer (services/)                    │
│  - Business logic                                            │
│  - Multi-step operations                                     │
│  - Cross-cutting concerns                                    │
│  - External service integration                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ calls
┌──────────────────────────▼──────────────────────────────────┐
│                    CRUD Layer (crud/)                        │
│  - Database operations                                       │
│  - Query building                                            │
│  - Transaction management                                    │
│  - Error handling                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
┌──────────────────────────▼──────────────────────────────────┐
│              Data Layer (models/ + schemas/)                 │
│  - SQLAlchemy models (database structure)                    │
│  - Pydantic schemas (validation)                             │
│  - Type definitions                                          │
└─────────────────────────────────────────────────────────────┘
```

### Layer Details

#### 1. API Layer (`app/api/routes/`)

**Responsibility**: Handle HTTP requests and responses

**Key Functions**:
- Define API endpoints and routes
- Handle request validation via Pydantic schemas
- Return structured responses
- Apply rate limiting
- Generate OpenAPI documentation
- Handle file uploads/downloads

**Example**:
```python
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user"
)
@limiter.limit("30/minute")
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get the currently authenticated user's information."""
    return current_user
```

**Rules**:
- Should NOT contain business logic
- Should NOT directly perform database operations (use CRUD or services)
- Must validate all input via Pydantic schemas
- Must specify response models
- Should apply appropriate rate limits

#### 2. Dependencies Layer (`app/api/dependencies/`)

**Responsibility**: Provide reusable dependency injection functions

**Key Functions**:
- Authenticate users from JWT tokens
- Check user permissions and roles
- Inject database sessions
- Provide request context

**Example**:
```python
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate user from JWT token.

    Raises:
        AuthenticationError: If token is invalid or user not found
    """
    try:
        payload = decode_access_token(token)
        user_id = UUID(payload.get("sub"))
    except Exception:
        raise AuthenticationError("Invalid authentication credentials")

    user = user_crud.get(db, id=user_id)
    if not user:
        raise AuthenticationError("User not found")

    return user
```

**Rules**:
- Should be pure functions
- Should raise appropriate exceptions
- Should be reusable across multiple routes
- Must handle errors gracefully

#### 3. Service Layer (`app/services/`)

**Responsibility**: Implement complex business logic

**Key Functions**:
- Orchestrate multiple CRUD operations
- Implement business rules
- Handle external service integration
- Coordinate transactions

**Example**:
```python
class AuthService:
    """Authentication service with business logic."""

    def login(
        self,
        db: Session,
        email: str,
        password: str,
        request: Request
    ) -> dict:
        """
        Authenticate user and create session.

        Business logic:
        1. Validate credentials
        2. Create session with device info
        3. Generate tokens
        4. Return tokens and user info
        """
        # Validate credentials
        user = user_crud.get_by_email(db, email=email)
        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid credentials")

        if not user.is_active:
            raise AuthenticationError("Account is inactive")

        # Extract device info
        device_info = extract_device_info(request)

        # Create session
        session = session_crud.create_session(
            db,
            user_id=user.id,
            device_info=device_info
        )

        # Generate tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(
            subject=str(user.id),
            jti=str(session.refresh_token_jti)
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user
        }
```

**Rules**:
- Contains business logic, not just data operations
- Can call multiple CRUD operations
- Should handle complex workflows
- Must maintain data consistency
- Should use transactions when needed

#### 4. CRUD Layer (`app/crud/`)

**Responsibility**: Database operations and queries

**Key Functions**:
- Create, read, update, delete operations
- Build database queries
- Handle database errors
- Manage soft deletes
- Implement pagination and filtering

**Example**:
```python
class CRUDSession(CRUDBase[UserSession, SessionCreate, SessionUpdate]):
    """CRUD operations for user sessions."""

    def get_by_jti(self, db: Session, jti: UUID) -> Optional[UserSession]:
        """Get session by refresh token JTI."""
        try:
            return (
                db.query(UserSession)
                .filter(UserSession.refresh_token_jti == jti)
                .first()
            )
        except Exception as e:
            logger.error(f"Error getting session by JTI: {str(e)}")
            return None

    def get_active_by_jti(
        self,
        db: Session,
        jti: UUID
    ) -> Optional[UserSession]:
        """Get active session by refresh token JTI."""
        session = self.get_by_jti(db, jti=jti)
        if session and session.is_active and not session.is_expired:
            return session
        return None

    def deactivate(self, db: Session, session_id: UUID) -> bool:
        """Deactivate a session (logout)."""
        try:
            session = self.get(db, id=session_id)
            if not session:
                return False

            session.is_active = False
            db.commit()
            logger.info(f"Session {session_id} deactivated")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Error deactivating session: {str(e)}")
            return False
```

**Rules**:
- Should NOT contain business logic
- Must handle database exceptions
- Must use parameterized queries (SQLAlchemy does this)
- Should log all database errors
- Must rollback on errors
- Should use soft deletes when possible

#### 5. Data Layer (`app/models/` + `app/schemas/`)

**Responsibility**: Define data structures

##### Models (`app/models/`)

Database schema definition using SQLAlchemy:

```python
from app.models.base import Base, UUIDMixin, TimestampMixin

class User(Base, UUIDMixin, TimestampMixin):
    """User model."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_user_email_active", "email", "is_active"),
    )
```

##### Schemas (`app/schemas/`)

Data validation and serialization using Pydantic:

```python
from pydantic import BaseModel, Field, ConfigDict

class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: str = Field(..., description="User's email address")

class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(..., min_length=8)

class UserUpdate(UserBase):
    """Schema for updating a user."""

    email: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    """Schema for user API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
```

**Rules**:
- Models define database structure
- Schemas define API contracts
- Never expose sensitive fields (passwords, tokens)
- Use mixins for common fields
- Define appropriate indexes

## Database Architecture

### Connection Management

```python
# app/core/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Connection pooling configuration
engine = create_engine(
    DATABASE_URL,
    pool_size=20,           # Number of persistent connections
    max_overflow=50,        # Additional connections when pool exhausted
    pool_timeout=30,        # Seconds to wait for connection
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True,     # Verify connections before use
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
```

### Session Management

#### Dependency Injection Pattern

```python
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI routes.

    Automatically commits on success, rolls back on error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Usage in routes
@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return user_crud.get_multi(db)
```

#### Context Manager Pattern

```python
@contextmanager
def transaction_scope() -> Generator[Session, None, None]:
    """
    Context manager for database transactions.

    Use for complex operations requiring multiple steps.
    Automatically commits on success, rolls back on error.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# Usage in services
def complex_operation():
    with transaction_scope() as db:
        user = user_crud.create(db, obj_in=user_data)
        session = session_crud.create(db, session_data)
        return user, session
```

### Model Mixins

Common functionality shared across models:

```python
# app/models/base.py

class UUIDMixin:
    """Add UUID primary key to model."""

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )

class TimestampMixin:
    """Add created_at and updated_at timestamps."""

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True
    )

# All models inherit both mixins
class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"
    # ...
```

### Migration System

Database migrations managed by Alembic:

```bash
# Create a new migration
alembic revision --autogenerate -m "Add user_sessions table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show migration history
alembic history
```

### Indexing Strategy

```python
class UserSession(Base):
    __tablename__ = "user_sessions"

    # Single-column indexes
    user_id = Column(UUID, ForeignKey("users.id"), index=True)
    refresh_token_jti = Column(UUID, unique=True, index=True)

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_user_session_active", "user_id", "is_active"),
        Index("idx_session_expiry", "expires_at", "is_active"),
    )
```

**Indexing Guidelines**:
- Index foreign keys
- Index columns used in WHERE clauses
- Index columns used in JOIN conditions
- Use composite indexes for multi-column queries
- Monitor query performance with EXPLAIN

## Authentication & Authorization

### JWT Token System

Two-token strategy for security:

```python
# Access Token (short-lived)
access_token = create_access_token(
    subject=str(user.id),
    additional_claims={"is_superuser": user.is_superuser}
)
# Expiry: 15 minutes
# Used for: API authentication
# Stored: Client-side (memory or secure storage)

# Refresh Token (long-lived)
refresh_token = create_refresh_token(
    subject=str(user.id),
    jti=str(session.refresh_token_jti)  # Session tracking
)
# Expiry: 7 days
# Used for: Getting new access tokens
# Stored: HttpOnly cookie or secure storage
```

### Token Claims

```python
{
    "sub": "user-uuid-here",         # Subject (user ID)
    "type": "access",                # Token type
    "exp": 1234567890,               # Expiration timestamp
    "iat": 1234567800,               # Issued at timestamp
    "is_superuser": false,           # User role
    "jti": "session-uuid-here"       # JWT ID (for refresh tokens)
}
```

### Authentication Flow

```
┌─────────┐                                     ┌─────────┐
│ Client  │                                     │ Backend │
└────┬────┘                                     └────┬────┘
     │                                                │
     │  POST /auth/login                              │
     │  {email, password}                             │
     │───────────────────────────────────────────────>│
     │                                                │
     │                                  Verify credentials
     │                                  Create session
     │                                  Generate tokens
     │                                                │
     │  {access_token, refresh_token, user}           │
     │<───────────────────────────────────────────────│
     │                                                │
     │  GET /api/v1/users/me                          │
     │  Authorization: Bearer {access_token}          │
     │───────────────────────────────────────────────>│
     │                                                │
     │                                  Validate token
     │                                  Get user
     │                                                │
     │  {user data}                                   │
     │<───────────────────────────────────────────────│
     │                                                │
     │  (after 15 minutes)                            │
     │  POST /auth/refresh                            │
     │  {refresh_token}                               │
     │───────────────────────────────────────────────>│
     │                                                │
     │                                  Validate refresh token
     │                                  Check session active
     │                                  Generate new tokens
     │                                                │
     │  {access_token, refresh_token}                 │
     │<───────────────────────────────────────────────│
     │                                                │
```

### Authorization Patterns

#### Role-Based Access Control (RBAC)

```python
# Superuser check
@router.post("/admin/users")
def admin_endpoint(
    current_user: User = Depends(get_current_superuser)
):
    """Only superusers can access this endpoint."""
    pass

# Active user check
@router.get("/users/me")
def get_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Only active users can access this endpoint."""
    pass
```

#### Resource Ownership

```python
@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Users can only revoke their own sessions."""
    session = session_crud.get(db, id=session_id)

    if not session:
        raise NotFoundError("Session not found")

    # Check ownership
    if session.user_id != current_user.id:
        raise AuthorizationError("You can only revoke your own sessions")

    session_crud.deactivate(db, session_id=session_id)
    return MessageResponse(success=True, message="Session revoked")
```

#### Organization-Based Permissions

```python
from app.api.dependencies.permissions import require_org_admin

@router.post("/organizations/{org_id}/members")
def add_member(
    org_id: UUID,
    member_data: MemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(require_org_admin(org_id))  # Permission check
):
    """Only organization admins can add members."""
    pass
```

### OAuth Integration

The system supports two OAuth modes:

#### OAuth Consumer Mode (Social Login)

Users can authenticate via Google or GitHub OAuth providers:

```python
# Get authorization URL with PKCE support
GET /oauth/authorize/{provider}?redirect_uri=https://yourapp.com/callback

# Handle callback and exchange code for tokens
POST /oauth/callback/{provider}
{
    "code": "authorization_code_from_provider",
    "state": "csrf_state_token"
}
```

**Security Features:**
- PKCE (S256) for Google
- State parameter for CSRF protection
- Nonce for Google OIDC replay attack prevention
- Google ID token signature verification via JWKS
- Email normalization to prevent account duplication
- Auto-linking by email (configurable)

#### OAuth Provider Mode (MCP Integration)

Full OAuth 2.0 Authorization Server for third-party clients (RFC compliant):

```
┌─────────────┐                              ┌─────────────┐
│ MCP Client  │                              │   Backend   │
└──────┬──────┘                              └──────┬──────┘
       │                                             │
       │  GET /.well-known/oauth-authorization-server│
       │─────────────────────────────────────────────>│
       │                 {metadata}                  │
       │<─────────────────────────────────────────────│
       │                                             │
       │  GET /oauth/provider/authorize              │
       │  ?response_type=code&client_id=...          │
       │  &redirect_uri=...&code_challenge=...       │
       │─────────────────────────────────────────────>│
       │                                             │
       │              (User consents)                │
       │                                             │
       │  302 redirect_uri?code=AUTH_CODE&state=...  │
       │<─────────────────────────────────────────────│
       │                                             │
       │  POST /oauth/provider/token                 │
       │  {grant_type=authorization_code,            │
       │   code=AUTH_CODE, code_verifier=...}        │
       │─────────────────────────────────────────────>│
       │                                             │
       │  {access_token, refresh_token, expires_in}  │
       │<─────────────────────────────────────────────│
       │                                             │
```

**Endpoints:**
- `GET /.well-known/oauth-authorization-server` - RFC 8414 metadata
- `GET /oauth/provider/authorize` - Authorization endpoint
- `POST /oauth/provider/token` - Token endpoint (authorization_code, refresh_token)
- `POST /oauth/provider/revoke` - RFC 7009 token revocation
- `POST /oauth/provider/introspect` - RFC 7662 token introspection

**Security Features:**
- PKCE S256 required for public clients (plain method rejected)
- Authorization codes are single-use with 10-minute expiry
- Code reuse detection triggers security incident (all tokens revoked)
- Refresh token rotation on use
- Opaque refresh tokens (hashed in database)
- JWT access tokens with standard claims
- Consent management per client

## Error Handling

### Exception Hierarchy

```python
class APIException(Exception):
    """Base exception for all API errors."""

    def __init__(
        self,
        message: str,
        status_code: int,
        error_code: str,
        field: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.field = field

# Specific exceptions
class AuthenticationError(APIException):
    """401 Unauthorized"""
    def __init__(self, message: str, error_code: str = "AUTH_001", field: Optional[str] = None):
        super().__init__(message, 401, error_code, field)

class AuthorizationError(APIException):
    """403 Forbidden"""
    def __init__(self, message: str, error_code: str = "AUTH_002", field: Optional[str] = None):
        super().__init__(message, 403, error_code, field)

class NotFoundError(APIException):
    """404 Not Found"""
    def __init__(self, message: str, error_code: str = "NOT_001", field: Optional[str] = None):
        super().__init__(message, 404, error_code, field)

class DuplicateError(APIException):
    """409 Conflict"""
    def __init__(self, message: str, error_code: str = "DUP_001", field: Optional[str] = None):
        super().__init__(message, 409, error_code, field)
```

### Global Exception Handlers

Registered in `app/main.py`:

```python
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handle custom API exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "errors": [
                {
                    "code": exc.error_code,
                    "message": exc.message,
                    "field": exc.field
                }
            ]
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "code": "VAL_001",
            "message": error["msg"],
            "field": ".".join(str(x) for x in error["loc"])
        })
    return JSONResponse(
        status_code=422,
        content={"success": False, "errors": errors}
    )
```

### Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "errors": [
    {
      "code": "AUTH_001",
      "message": "Invalid credentials",
      "field": "email"
    }
  ]
}
```

## API Design

### Versioning

API versioned via URL path:

```python
# app/api/main.py

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(users_router, tags=["users"])
api_router.include_router(sessions_router, tags=["sessions"])
```

### Pagination

Consistent pagination across all list endpoints:

```python
# Request
GET /api/v1/users?page=1&limit=20

# Response
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### Rate Limiting

Applied per-endpoint based on sensitivity:

```python
# Read operations - 60/minute
@limiter.limit("60/minute")
@router.get("/users")

# Write operations - 10/minute
@limiter.limit("10/minute")
@router.post("/users")

# Authentication - 5/minute
@limiter.limit("5/minute")
@router.post("/auth/login")
```

## Background Jobs

### APScheduler Integration

```python
# app/main.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.session_cleanup import cleanup_expired_sessions

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    """Start background jobs on application startup."""
    if not settings.IS_TEST:  # Don't run in tests
        scheduler.add_job(
            cleanup_expired_sessions,
            "cron",
            hour=2,  # Run at 2 AM daily
            id="cleanup_expired_sessions"
        )
        scheduler.start()
        logger.info("Background jobs started")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background jobs on application shutdown."""
    scheduler.shutdown()
```

### Job Implementation

```python
# app/services/session_cleanup.py

async def cleanup_expired_sessions():
    """
    Clean up expired sessions.

    Runs daily at 2 AM. Removes sessions expired for more than 30 days.
    """
    try:
        with transaction_scope() as db:
            count = session_crud.cleanup_expired(db, keep_days=30)
            logger.info(f"Cleaned up {count} expired sessions")
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}", exc_info=True)
```

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  ← Few, high-level
        ├─────────────┤
        │Integration  │  ← API endpoint tests
        │   Tests     │
        ├─────────────┤
        │   Unit      │  ← CRUD, services, utilities
        │   Tests     │
        └─────────────┘
```

### Test Database

Use SQLite in-memory for fast tests:

```python
# tests/conftest.py

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )

@pytest.fixture
def db_session(test_engine):
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)
```

### Test Coverage

Aim for 80%+ coverage:

```bash
# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html
```

## Security Architecture

### Security Headers

```python
# Content Security Policy
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # CSP
    response.headers["Content-Security-Policy"] = "default-src 'self'"

    # Other security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    return response
```

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"]
)
```

### Password Requirements

- Minimum 8 characters
- Bcrypt hashing with cost factor 12
- No password history (can be added if needed)

### Session Security

- Per-device session tracking
- Automatic session expiration
- Manual session revocation
- Token rotation on refresh

## Performance Considerations

### Database Connection Pooling

- Pool size: 20 connections
- Max overflow: 50 connections
- Connection recycling every hour
- Pre-ping for connection health

### Query Optimization

- Eager loading for relationships
- Appropriate indexes on frequently queried columns
- Query result pagination
- Avoid N+1 queries

### Caching Strategy

Currently no caching implemented. Consider adding:
- Redis for session storage
- Response caching for read-heavy endpoints
- Query result caching

### Rate Limiting

Protects against abuse and DoS attacks:
- IP-based rate limiting
- Per-endpoint limits
- Can be extended with Redis for distributed systems

## Conclusion

This architecture provides a solid foundation for a scalable, maintainable, and secure FastAPI application. Key benefits:

- **Clear separation of concerns**: Each layer has a specific responsibility
- **Type safety**: Comprehensive type hints throughout
- **Security**: Built-in authentication, authorization, and security best practices
- **Testability**: Each layer can be tested independently
- **Maintainability**: Clean code structure and comprehensive documentation
- **Scalability**: Connection pooling, rate limiting, and efficient queries

For implementation examples, see:
- **Coding Standards**: `backend/docs/CODING_STANDARDS.md`
- **Feature Example**: `backend/docs/FEATURE_EXAMPLE.md`
