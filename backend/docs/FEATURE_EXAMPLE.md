# Feature Implementation Guide

This guide walks through implementing a complete feature using the **User Session Management** feature as a real-world example. This feature allows users to track their login sessions across multiple devices and manage them individually.

## Table of Contents

- [Feature Overview](#feature-overview)
- [Implementation Steps](#implementation-steps)
  - [Step 1: Design the Database Model](#step-1-design-the-database-model)
  - [Step 2: Create Pydantic Schemas](#step-2-create-pydantic-schemas)
  - [Step 3: Implement Repository](#step-3-implement-repository)
  - [Step 4: Create API Endpoints](#step-4-create-api-endpoints)
  - [Step 5: Integrate with Existing Features](#step-5-integrate-with-existing-features)
  - [Step 6: Add Background Jobs](#step-6-add-background-jobs)
  - [Step 7: Write Tests](#step-7-write-tests)
  - [Step 8: Create Database Migration](#step-8-create-database-migration)
  - [Step 9: Update Documentation](#step-9-update-documentation)
- [Summary](#summary)
- [Best Practices](#best-practices)

## Feature Overview

**Feature**: User Session Management

**Purpose**: Allow users to see where they're logged in and manage sessions across multiple devices.

**Key Requirements**:
- Track each login session with device information
- Allow users to view all their active sessions
- Enable users to logout from specific devices
- Automatically cleanup expired sessions
- Provide session security and audit trail

**User Stories**:
1. As a user, I want to see all devices where I'm logged in
2. As a user, I want to logout from a specific device remotely
3. As a user, I want to see when and where my account was accessed
4. As a security-conscious user, I want expired sessions automatically cleaned up

## Implementation Steps

### Step 1: Design the Database Model

**File**: `app/models/user_session.py`

First, design the database schema. Consider:
- What data needs to be stored?
- What relationships exist?
- What indexes are needed for performance?
- What constraints ensure data integrity?

#### 1.1 Identify Required Fields

For session tracking, we need:
- **Identity**: Primary key (UUID)
- **Relationship**: Foreign key to user
- **Session Tracking**: Refresh token identifier (JTI)
- **Device Info**: Device name, ID, IP, user agent
- **Timing**: Created, last used, expiration
- **State**: Active/inactive flag
- **Optional**: Geographic information

#### 1.2 Create the Model

```python
"""
User session model for tracking per-device authentication sessions.

This allows users to:
- See where they're logged in
- Logout from specific devices
- Manage their active sessions
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class UserSession(Base, UUIDMixin, TimestampMixin):
    """
    Tracks individual user sessions (per-device).

    Each time a user logs in from a device, a new session is created.
    Sessions are identified by the refresh token JTI (JWT ID).
    """
    __tablename__ = 'user_sessions'

    # Foreign key to user with CASCADE delete
    # When user is deleted, all their sessions are deleted
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True  # Index for fast lookups
    )

    # Refresh token identifier (JWT ID from the refresh token)
    # Unique because each session has one refresh token
    refresh_token_jti = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True  # Index for fast lookups during token validation
    )

    # Device information
    device_name = Column(String(255), nullable=True)  # "iPhone 14", "Chrome on MacBook"
    device_id = Column(String(255), nullable=True)    # Persistent device identifier
    ip_address = Column(String(45), nullable=True)    # IPv4 (15) or IPv6 (45 chars)
    user_agent = Column(String(500), nullable=True)   # Browser/app user agent

    # Session timing
    last_used_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Session state
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Geographic information (optional, can be populated from IP)
    location_city = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)

    # Relationship to user
    # back_populates creates bidirectional relationship
    user = relationship("User", back_populates="sessions")

    # Composite indexes for performance
    # These speed up common queries
    __table_args__ = (
        # Index for "get all active sessions for user"
        Index('ix_user_sessions_user_active', 'user_id', 'is_active'),
        # Index for "find active session by JTI"
        Index('ix_user_sessions_jti_active', 'refresh_token_jti', 'is_active'),
    )

    def __repr__(self):
        return f"<UserSession {self.device_name} ({self.ip_address})>"

    @property
    def is_expired(self) -> bool:
        """Check if session has expired."""
        from datetime import datetime, timezone
        return self.expires_at < datetime.now(timezone.utc)

    def to_dict(self):
        """Convert session to dictionary for serialization."""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'device_name': self.device_name,
            'device_id': self.device_id,
            'ip_address': self.ip_address,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'location_city': self.location_city,
            'location_country': self.location_country,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
```

**Key Design Decisions**:

1. **UUID Primary Key**: Using `UUIDMixin` for globally unique, non-sequential IDs
2. **Timestamps**: Using `TimestampMixin` for automatic created_at/updated_at tracking
3. **Cascade Delete**: `ondelete='CASCADE'` ensures sessions are deleted when user is deleted
4. **Indexes**:
   - Single-column indexes on foreign key and unique fields
   - Composite indexes for common query patterns
5. **Nullable Fields**: Device info is optional (might not always be available)
6. **String Lengths**: Appropriate sizes based on data type (IPv6 = 45 chars, etc.)
7. **Computed Property**: `is_expired` property for convenient expiration checking
8. **Helper Method**: `to_dict()` for easy serialization

#### 1.3 Update Related Models

Don't forget to update the `User` model to include the relationship:

```python
# In app/models/user.py

class User(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...

    # Add relationship to sessions
    sessions = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"  # Delete sessions when user is deleted
    )
```

### Step 2: Create Pydantic Schemas

**File**: `app/schemas/sessions.py`

Schemas define the API contract: what data comes in and what goes out.

#### 2.1 Design Schema Hierarchy

Follow the standard pattern:

```
SessionBase (common fields)
    ├── SessionCreate (internal: repository operations)
    ├── SessionUpdate (internal: repository operations)
    └── SessionResponse (external: API responses)
```

#### 2.2 Implement Schemas

```python
"""
Pydantic schemas for user session management.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class SessionBase(BaseModel):
    """Base schema for user sessions with common fields."""
    device_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Friendly device name"
    )
    device_id: Optional[str] = Field(
        None,
        max_length=255,
        description="Persistent device identifier"
    )


class SessionCreate(SessionBase):
    """
    Schema for creating a new session (internal use).

    Used by repository operations, not exposed to API.
    Contains all fields needed to create a session.
    """
    user_id: UUID
    refresh_token_jti: str = Field(..., max_length=255)
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = Field(None, max_length=500)
    last_used_at: datetime
    expires_at: datetime
    location_city: Optional[str] = Field(None, max_length=100)
    location_country: Optional[str] = Field(None, max_length=100)


class SessionUpdate(BaseModel):
    """
    Schema for updating a session (internal use).

    All fields are optional - only update what's provided.
    """
    last_used_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    refresh_token_jti: Optional[str] = None
    expires_at: Optional[datetime] = None


class SessionResponse(SessionBase):
    """
    Schema for session responses to clients.

    This is what users see when they list their active sessions.
    Note: We don't expose sensitive fields like refresh_token_jti.
    """
    id: UUID
    ip_address: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    last_used_at: datetime
    created_at: datetime
    expires_at: datetime
    is_current: bool = Field(
        default=False,
        description="Whether this is the current session"
    )

    # Configuration for ORM integration and OpenAPI docs
    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode (was orm_mode in Pydantic v1)
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
                "is_current": True
            }
        }
    )


class SessionListResponse(BaseModel):
    """Response containing list of sessions with metadata."""
    sessions: list[SessionResponse]
    total: int = Field(..., description="Total number of active sessions")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sessions": [...],
                "total": 3
            }
        }
    )


class DeviceInfo(BaseModel):
    """
    Device information extracted from request.

    Helper schema used internally to pass device info around.
    """
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
```

**Key Design Decisions**:

1. **Separation of Concerns**:
   - `SessionCreate` for internal operations (includes all fields)
   - `SessionResponse` for external API (only safe fields)
2. **Security**: Never expose sensitive fields like `refresh_token_jti` in API responses
3. **Computed Fields**: `is_current` is computed at runtime, not stored in DB
4. **Field Validation**: Use `Field()` for constraints, descriptions, and examples
5. **OpenAPI Documentation**: `json_schema_extra` provides examples in API docs
6. **Type Safety**: Comprehensive type hints for all fields

### Step 3: Implement Repository

**File**: `app/repositories/session.py`

The repository layer handles all database operations. No business logic here — that belongs in services!

#### 3.1 Extend the Base Repository Class

```python
"""
Repository for user sessions.
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.repositories.base import RepositoryBase
from app.models.user_session import UserSession
from app.schemas.sessions import SessionCreate, SessionUpdate

logger = logging.getLogger(__name__)


class SessionRepository(RepositoryBase[UserSession, SessionCreate, SessionUpdate]):
    """
    Repository for user sessions.

    Inherits standard operations from RepositoryBase:
    - get(db, id) - Get by ID
    - get_multi(db, skip, limit) - List with pagination
    - create(db, obj_in) - Create new session
    - update(db, db_obj, obj_in) - Update session
    - remove(db, id) - Delete session
    """

    async def get_by_jti(self, db: AsyncSession, *, jti: str) -> UserSession | None:
        """
        Get session by refresh token JTI.

        Used during token refresh to find the corresponding session.
        """
        result = await db.execute(
            select(UserSession).where(UserSession.refresh_token_jti == jti)
        )
        return result.scalar_one_or_none()

    async def get_active_by_jti(self, db: AsyncSession, *, jti: str) -> UserSession | None:
        """Get active (non-expired) session by refresh token JTI."""
        result = await db.execute(
            select(UserSession).where(
                and_(
                    UserSession.refresh_token_jti == jti,
                    UserSession.is_active.is_(True),
                )
            )
        )
        session = result.scalar_one_or_none()
        if session and not session.is_expired:
            return session
        return None

    async def get_user_sessions(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        active_only: bool = True,
    ) -> list[UserSession]:
        """
        Get all sessions for a user, ordered by most recently used.
        """
        query = select(UserSession).where(UserSession.user_id == user_id)
        if active_only:
            query = query.where(UserSession.is_active.is_(True))
        query = query.order_by(UserSession.last_used_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create_session(
        self,
        db: AsyncSession,
        *,
        obj_in: SessionCreate,
    ) -> UserSession:
        """
        Create a new user session.

        Raises:
            DuplicateEntryError: If a session with the same JTI already exists
        """
        try:
            db_obj = UserSession(
                user_id=obj_in.user_id,
                refresh_token_jti=obj_in.refresh_token_jti,
                device_name=obj_in.device_name,
                device_id=obj_in.device_id,
                ip_address=obj_in.ip_address,
                user_agent=obj_in.user_agent,
                last_used_at=obj_in.last_used_at,
                expires_at=obj_in.expires_at,
                is_active=True,
                location_city=obj_in.location_city,
                location_country=obj_in.location_country,
            )

            db_obj.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            logger.info(
                f"Session created for user {obj_in.user_id} from {obj_in.device_name}"
            )
            return db_obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating session: {str(e)}", exc_info=True)
            raise

    async def deactivate(self, db: AsyncSession, *, session_id: UUID) -> UserSession | None:
        """Deactivate a session (logout from device)."""
        session = await self.get(db, id=session_id)
        if not session:
            return None
        session.is_active = False
        await db.commit()
        await db.refresh(session)
        logger.info(f"Session {session_id} deactivated ({session.device_name})")
        return session

    async def deactivate_all_user_sessions(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
    ) -> int:
        """
        Deactivate all active sessions for a user (logout from all devices).

        Uses a bulk UPDATE for efficiency — no N+1 queries.
        """
        result = await db.execute(
            update(UserSession)
            .where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_active.is_(True),
                )
            )
            .values(is_active=False)
        )
        await db.commit()
        count = result.rowcount
        logger.info(f"Deactivated {count} sessions for user {user_id}")
        return count

    async def cleanup_expired(self, db: AsyncSession, *, keep_days: int = 30) -> int:
        """
        Hard-delete inactive sessions older than keep_days.

        Returns the number of sessions deleted.
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=keep_days)
        result = await db.execute(
            select(UserSession).where(
                and_(
                    UserSession.is_active.is_(False),
                    UserSession.expires_at < datetime.now(timezone.utc),
                    UserSession.created_at < cutoff_date,
                )
            )
        )
        sessions = list(result.scalars().all())
        for s in sessions:
            await db.delete(s)
        await db.commit()
        if sessions:
            logger.info(f"Cleaned up {len(sessions)} expired sessions")
        return len(sessions)


# Singleton instance — used by services, never imported directly in routes
session_repo = SessionRepository(UserSession)
```

**Key Patterns**:

1. **Async everywhere**: All methods use `async def` and `await`
2. **Modern SQLAlchemy**: `select()` API, never `db.query()`
3. **Bulk updates**: Use `update()` statement for multi-row changes (no N+1)
4. **Error handling**: `try/except` with `await db.rollback()` in mutating methods
5. **Logging**: Log all significant actions (create, delete, errors)
6. **Type safety**: Full type hints; `UUID` not raw `str` for IDs
7. **Singleton pattern**: One module-level instance used by services

### Step 4: Create API Endpoints

**File**: `app/api/routes/sessions.py`

API layer handles HTTP requests and responses.

#### 4.1 Design Endpoints

For session management, we need:
- `GET /api/v1/sessions/me` - List my sessions
- `DELETE /api/v1/sessions/{session_id}` - Revoke specific session
- `DELETE /api/v1/sessions/me/expired` - Cleanup expired sessions

#### 4.2 Implement Endpoints

```python
"""
Session management endpoints.

Allows users to view and manage their active sessions across devices.
"""
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.services import get_session_service
from app.core.database import get_db
from app.models.user import User
from app.schemas.sessions import SessionResponse, SessionListResponse
from app.schemas.common import MessageResponse
from app.services.session_service import SessionService
from app.core.exceptions import NotFoundError, AuthorizationError, ErrorCode

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.get(
    "/me",
    response_model=SessionListResponse,
    summary="List My Active Sessions",
    description="""
    Get a list of all active sessions for the current user.

    This shows where you're currently logged in.

    **Rate Limit**: 30 requests/minute
    """,
    operation_id="list_my_sessions"
)
@limiter.limit("30/minute")
async def list_my_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all active sessions for the current user."""
    sessions = await session_service.get_user_sessions(
        db, user_id=current_user.id, active_only=True
    )
    session_responses = [
        SessionResponse.model_validate(s) | {"is_current": idx == 0}
        for idx, s in enumerate(sessions)
    ]
    return SessionListResponse(sessions=session_responses, total=len(session_responses))


@router.delete(
    "/{session_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke Specific Session",
    description="""
    Revoke a specific session by ID.

    This logs you out from that particular device.
    You can only revoke your own sessions.

    **Rate Limit**: 10 requests/minute
    """,
    operation_id="revoke_session"
)
@limiter.limit("10/minute")
async def revoke_session(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Revoke a specific session by ID.

    The service verifies ownership and raises NotFoundError /
    AuthorizationError which are handled by global exception handlers.
    """
    device_name = await session_service.revoke_session(
        db, session_id=session_id, user_id=current_user.id
    )
    return MessageResponse(
        success=True,
        message=f"Session revoked: {device_name or 'Unknown device'}"
    )


@router.delete(
    "/me/expired",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Cleanup Expired Sessions",
    description="""
    Remove expired sessions for the current user.

    This is a cleanup operation to remove old session records.

    **Rate Limit**: 5 requests/minute
    """,
    operation_id="cleanup_expired_sessions"
)
@limiter.limit("5/minute")
async def cleanup_expired_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Cleanup expired sessions for the current user."""
    deleted_count = await session_service.cleanup_user_expired_sessions(
        db, user_id=current_user.id
    )
    return MessageResponse(
        success=True,
        message=f"Cleaned up {deleted_count} expired sessions"
    )
```

**Key Patterns**:

1. **Dependency Injection**:
   - `current_user = Depends(get_current_user)` - Automatic authentication
   - `db = Depends(get_db)` - Database session management

2. **Rate Limiting**:
   - Read operations: Higher limits (30/min)
   - Write operations: Lower limits (10/min)
   - Cleanup operations: Very restrictive (5/min)

3. **Authorization**:
   - Always check resource ownership
   - Log security violations
   - Return 403 Forbidden, not 404 Not Found

4. **Error Handling**:
   - Catch and log all errors
   - Return user-friendly messages
   - Don't expose internal details

5. **Documentation**:
   - OpenAPI summary and description
   - Docstrings for code documentation
   - Operation IDs for client generation

6. **Response Models**:
   - Always specify `response_model`
   - Ensures response validation
   - Generates accurate API docs

#### 4.3 Register Routes

In `app/api/main.py`:

```python
from fastapi import APIRouter
from app.api.routes import auth, users, sessions, admin, organizations

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
```

In `app/main.py`:

```python
from app.api.main import api_router

app = FastAPI(title="My API")

# Include API router with /api/v1 prefix
app.include_router(api_router, prefix="/api/v1")
```

### Step 5: Integrate with Existing Features

Session management needs to be integrated into the authentication flow.

#### 5.1 Update Login Endpoint

**File**: `app/api/routes/auth.py`

```python
from app.utils.device import extract_device_info
from app.api.dependencies.services import get_auth_service
from app.services.auth_service import AuthService

@router.post("/login")
async def login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and create session."""
    # All business logic (validate credentials, create session, generate tokens)
    # is delegated to AuthService which calls the appropriate repositories.
    return await auth_service.login(
        db,
        email=credentials.username,
        password=credentials.password,
        request=request,
    )
```

#### 5.2 Create Device Info Utility

**File**: `app/utils/device.py`

```python
"""
Device detection utilities.
"""
from typing import Optional
from fastapi import Request
from user_agents import parse

from app.schemas.sessions import DeviceInfo


def extract_device_info(request: Request) -> DeviceInfo:
    """
    Extract device information from HTTP request.

    Args:
        request: FastAPI Request object

    Returns:
        DeviceInfo with extracted information
    """
    # Get user agent
    user_agent_string = request.headers.get("user-agent", "")

    # Parse user agent
    user_agent = parse(user_agent_string)

    # Determine device name
    if user_agent.is_mobile:
        device_name = f"{user_agent.device.brand} {user_agent.device.model}".strip()
    elif user_agent.is_tablet:
        device_name = f"{user_agent.device.brand} {user_agent.device.model} Tablet".strip()
    else:
        device_name = f"{user_agent.browser.family} on {user_agent.os.family}".strip()

    # Get IP address
    ip_address = request.client.host if request.client else None

    # Get device ID from custom header (if client provides one)
    device_id = request.headers.get("x-device-id")

    return DeviceInfo(
        device_name=device_name or "Unknown Device",
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent_string,
        location_city=None,  # Can be populated with IP geolocation service
        location_country=None
    )
```

#### 5.3 Update Token Refresh Endpoint

```python
@router.post("/refresh")
async def refresh_token(
    refresh_request: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    # AuthService handles token validation, session lookup, token rotation
    return await auth_service.refresh_tokens(
        db, refresh_token=refresh_request.refresh_token
    )
```

#### 5.4 Update Logout Endpoint

```python
@router.post("/logout")
async def logout(
    logout_request: LogoutRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db),
):
    """Logout from current device."""
    await auth_service.logout(
        db,
        refresh_token=logout_request.refresh_token,
        user_id=current_user.id,
    )
    return MessageResponse(success=True, message="Logged out successfully")
```

### Step 6: Add Background Jobs

**File**: `app/services/session_cleanup.py`

```python
"""
Background job for cleaning up expired sessions.
"""
import logging
from app.core.database import AsyncSessionLocal
from app.repositories.session import session_repo

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions():
    """
    Clean up expired sessions.

    Runs daily at 2 AM. Removes sessions that are:
    - Expired (expires_at < now)
    - Inactive (is_active = False)
    - Older than 30 days (for audit trail)
    """
    async with AsyncSessionLocal() as db:
        try:
            count = await session_repo.cleanup_expired(db, keep_days=30)
            logger.info(f"Background cleanup: Removed {count} expired sessions")
        except Exception as e:
            logger.error(f"Error in session cleanup job: {str(e)}", exc_info=True)
```

**Register in** `app/main.py`:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.session_cleanup import cleanup_expired_sessions
from app.core.config import settings

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    """Start background jobs on application startup."""
    if not settings.IS_TEST:  # Don't run scheduler in tests
        # Schedule cleanup job to run daily at 2 AM
        scheduler.add_job(
            cleanup_expired_sessions,
            "cron",
            hour=2,
            id="cleanup_expired_sessions"
        )
        scheduler.start()
        logger.info("Background scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background jobs on application shutdown."""
    scheduler.shutdown()
    logger.info("Background scheduler stopped")
```

### Step 7: Write Tests

**File**: `tests/api/test_session_management.py`

Write comprehensive tests covering all scenarios.

```python
"""
Tests for session management endpoints.
"""
import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_session import UserSession
from app.core.auth import create_access_token, create_refresh_token


def test_list_active_sessions(
    client: TestClient,
    test_user: User,
    test_user_token: str,
    db_session: Session
):
    """Test listing active sessions for current user."""

    # Create multiple sessions for the user
    for i in range(3):
        session = UserSession(
            user_id=test_user.id,
            refresh_token_jti=str(uuid4()),
            device_name=f"Device {i}",
            ip_address=f"192.168.1.{i}",
            last_used_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=True
        )
        db_session.add(session)
    db_session.commit()

    # Make request
    response = client.get(
        "/api/v1/sessions/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["sessions"]) == 3
    assert data["sessions"][0]["is_current"] == True  # Most recent marked as current


def test_revoke_specific_session(
    client: TestClient,
    test_user: User,
    test_user_token: str,
    db_session: Session
):
    """Test revoking a specific session."""

    # Create a session
    session = UserSession(
        user_id=test_user.id,
        refresh_token_jti=str(uuid4()),
        device_name="Test Device",
        ip_address="192.168.1.1",
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_active=True
    )
    db_session.add(session)
    db_session.commit()

    # Revoke the session
    response = client.delete(
        f"/api/v1/sessions/{session.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True

    # Verify session is inactive
    db_session.refresh(session)
    assert session.is_active == False


def test_cannot_revoke_other_users_session(
    client: TestClient,
    test_user: User,
    test_user_token: str,
    db_session: Session
):
    """Test that users cannot revoke other users' sessions."""

    # Create another user
    other_user = User(
        email="other@example.com",
        hashed_password="hashed",
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()

    # Create a session for other user
    session = UserSession(
        user_id=other_user.id,
        refresh_token_jti=str(uuid4()),
        device_name="Other Device",
        ip_address="192.168.1.2",
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_active=True
    )
    db_session.add(session)
    db_session.commit()

    # Try to revoke other user's session
    response = client.delete(
        f"/api/v1/sessions/{session.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    # Should get 403 Forbidden
    assert response.status_code == 403
    data = response.json()
    assert data["success"] == False


def test_logout_from_one_device_does_not_affect_other(
    client: TestClient,
    test_user: User,
    db_session: Session
):
    """
    CRITICAL TEST: Verify multi-device support.

    Logging out from one device should not affect other devices.
    """

    # Create two sessions
    jti1 = str(uuid4())
    jti2 = str(uuid4())

    session1 = UserSession(
        user_id=test_user.id,
        refresh_token_jti=jti1,
        device_name="Device 1",
        ip_address="192.168.1.1",
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_active=True
    )

    session2 = UserSession(
        user_id=test_user.id,
        refresh_token_jti=jti2,
        device_name="Device 2",
        ip_address="192.168.1.2",
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_active=True
    )

    db_session.add_all([session1, session2])
    db_session.commit()

    # Create tokens for device 1
    token1 = create_access_token(subject=str(test_user.id))

    # Logout from device 1
    response = client.delete(
        f"/api/v1/sessions/{session1.id}",
        headers={"Authorization": f"Bearer {token1}"}
    )

    assert response.status_code == 200

    # Verify session 1 is inactive
    db_session.refresh(session1)
    assert session1.is_active == False

    # Verify session 2 is still active
    db_session.refresh(session2)
    assert session2.is_active == True


def test_cleanup_expired_sessions(
    client: TestClient,
    test_user: User,
    test_user_token: str,
    db_session: Session
):
    """Test cleanup of expired sessions."""

    # Create an expired, inactive session
    expired_session = UserSession(
        user_id=test_user.id,
        refresh_token_jti=str(uuid4()),
        device_name="Expired Device",
        ip_address="192.168.1.1",
        last_used_at=datetime.now(timezone.utc) - timedelta(days=10),
        expires_at=datetime.now(timezone.utc) - timedelta(days=3),
        is_active=False
    )
    db_session.add(expired_session)
    db_session.commit()

    # Cleanup expired sessions
    response = client.delete(
        "/api/v1/sessions/me/expired",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "1" in data["message"]  # Should have cleaned 1 session
```

**Run tests**:

```bash
pytest tests/api/test_session_management.py -v
```

### Step 8: Create Database Migration

**Generate migration**:

```bash
alembic revision --autogenerate -m "Add user_sessions table"
```

**Review and edit** `app/alembic/versions/xxx_add_user_sessions_table.py`:

```python
"""Add user_sessions table

Revision ID: abc123
Revises: previous_revision
Create Date: 2025-10-31 12:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'abc123'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('refresh_token_jti', sa.String(255), nullable=False),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('location_city', sa.String(100), nullable=True),
        sa.Column('location_country', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('refresh_token_jti')
    )

    # Create indexes
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('ix_user_sessions_jti', 'user_sessions', ['refresh_token_jti'])
    op.create_index('ix_user_sessions_is_active', 'user_sessions', ['is_active'])
    op.create_index('ix_user_sessions_user_active', 'user_sessions', ['user_id', 'is_active'])
    op.create_index('ix_user_sessions_jti_active', 'user_sessions', ['refresh_token_jti', 'is_active'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_user_sessions_jti_active', 'user_sessions')
    op.drop_index('ix_user_sessions_user_active', 'user_sessions')
    op.drop_index('ix_user_sessions_is_active', 'user_sessions')
    op.drop_index('ix_user_sessions_jti', 'user_sessions')
    op.drop_index('ix_user_sessions_user_id', 'user_sessions')

    # Drop table
    op.drop_table('user_sessions')
```

**Apply migration**:

```bash
alembic upgrade head
```

### Step 9: Update Documentation

**Create feature documentation**: `backend/SESSION_IMPLEMENTATION_CONTEXT.md`

Document:
- Feature overview
- Architecture decisions
- Database schema
- API endpoints
- Usage examples
- Testing strategy

**Update API documentation**:

The API documentation is auto-generated by FastAPI at `/docs` (Swagger UI) and `/redoc` (ReDoc).

Ensure all endpoints have:
- Clear summaries
- Detailed descriptions
- Example responses
- Error cases documented

## Summary

You've now implemented a complete feature! Here's what was created:

**Files Created/Modified**:
1. `app/models/user_session.py` - Database model
2. `app/schemas/sessions.py` - Pydantic schemas
3. `app/repositories/session.py` - Repository (data access)
4. `app/services/session_service.py` - Service (business logic)
4. `app/api/routes/sessions.py` - API endpoints
5. `app/utils/device.py` - Device detection utility
6. `app/services/session_cleanup.py` - Background job
7. `app/api/routes/auth.py` - Integration with auth
8. `tests/api/test_session_management.py` - Tests
9. `app/alembic/versions/xxx_add_user_sessions.py` - Migration

**API Endpoints**:
- `GET /api/v1/sessions/me` - List active sessions
- `DELETE /api/v1/sessions/{id}` - Revoke specific session
- `DELETE /api/v1/sessions/me/expired` - Cleanup expired sessions

**Database Tables**:
- `user_sessions` - Session tracking with indexes

**Background Jobs**:
- Daily cleanup of expired sessions at 2 AM

## Best Practices

### Do's

1. **Plan First**: Design database schema and API before coding
2. **Follow Patterns**: Use existing patterns consistently
3. **Type Everything**: Comprehensive type hints everywhere
4. **Document Everything**: Docstrings, comments, and external docs
5. **Test Thoroughly**: Unit tests, integration tests, edge cases
6. **Handle Errors**: Proper exception handling and logging
7. **Security First**: Authorization checks, input validation, rate limiting
8. **Use Transactions**: Rollback on errors, commit on success
9. **Index Strategically**: Index columns used in WHERE and JOIN clauses
10. **Log Appropriately**: Info for actions, errors for failures

### Don'ts

1. **Don't Mix Layers**: Keep business logic in services, database ops in repositories, routing in routes
2. **Don't Expose Internals**: Never return sensitive data in API responses
3. **Don't Trust Input**: Always validate and sanitize user input
4. **Don't Ignore Errors**: Always handle exceptions properly
5. **Don't Skip Tests**: Tests catch bugs early
6. **Don't Hardcode**: Use configuration for environment-specific values
7. **Don't Over-optimize**: Profile before optimizing
8. **Don't Skip Documentation**: Code without docs is hard to maintain
9. **Don't Forget Migration**: Always create and test database migrations
10. **Don't Rush**: Take time to design properly upfront

### Checklist

When implementing a new feature, use this checklist:

- [ ] Design database schema
- [ ] Create SQLAlchemy model
- [ ] Design Pydantic schemas (Create, Update, Response)
- [ ] Implement repository (data access)
- [ ] Implement service (business logic)
- [ ] Register service in `app/api/dependencies/services.py`
- [ ] Create API endpoints
- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Write comprehensive tests
- [ ] Create database migration
- [ ] Update documentation
- [ ] Test manually via API docs
- [ ] Review security implications
- [ ] Check performance (indexes, queries)
- [ ] Add logging
- [ ] Handle background jobs (if needed)

---

This guide provides a complete reference for implementing features in the FastAPI backend. Use this as a template for new features, adapting the patterns to your specific requirements.
