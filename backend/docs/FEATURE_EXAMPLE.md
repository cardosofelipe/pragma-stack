# Feature Implementation Guide

This guide walks through implementing a complete feature using the **User Session Management** feature as a real-world example. This feature allows users to track their login sessions across multiple devices and manage them individually.

## Table of Contents

- [Feature Overview](#feature-overview)
- [Implementation Steps](#implementation-steps)
  - [Step 1: Design the Database Model](#step-1-design-the-database-model)
  - [Step 2: Create Pydantic Schemas](#step-2-create-pydantic-schemas)
  - [Step 3: Implement CRUD Operations](#step-3-implement-crud-operations)
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
    ├── SessionCreate (internal: CRUD operations)
    ├── SessionUpdate (internal: CRUD operations)
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

    Used by CRUD operations, not exposed to API.
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

### Step 3: Implement CRUD Operations

**File**: `app/crud/session.py`

CRUD layer handles all database operations. No business logic here!

#### 3.1 Extend the Base CRUD Class

```python
"""
CRUD operations for user sessions.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from app.crud.base import CRUDBase
from app.models.user_session import UserSession
from app.schemas.sessions import SessionCreate, SessionUpdate

logger = logging.getLogger(__name__)


class CRUDSession(CRUDBase[UserSession, SessionCreate, SessionUpdate]):
    """
    CRUD operations for user sessions.

    Inherits standard operations from CRUDBase:
    - get(db, id) - Get by ID
    - get_multi(db, skip, limit) - List with pagination
    - create(db, obj_in) - Create new session
    - update(db, db_obj, obj_in) - Update session
    - remove(db, id) - Delete session
    """

    # Custom query methods
    # --------------------

    def get_by_jti(self, db: Session, *, jti: str) -> Optional[UserSession]:
        """
        Get session by refresh token JTI.

        Used during token refresh to find the corresponding session.

        Args:
            db: Database session
            jti: Refresh token JWT ID

        Returns:
            UserSession if found, None otherwise
        """
        try:
            return db.query(UserSession).filter(
                UserSession.refresh_token_jti == jti
            ).first()
        except Exception as e:
            logger.error(f"Error getting session by JTI {jti}: {str(e)}")
            raise

    def get_active_by_jti(self, db: Session, *, jti: str) -> Optional[UserSession]:
        """
        Get active session by refresh token JTI.

        Only returns the session if it's currently active.

        Args:
            db: Database session
            jti: Refresh token JWT ID

        Returns:
            Active UserSession if found, None otherwise
        """
        try:
            return db.query(UserSession).filter(
                and_(
                    UserSession.refresh_token_jti == jti,
                    UserSession.is_active == True
                )
            ).first()
        except Exception as e:
            logger.error(f"Error getting active session by JTI {jti}: {str(e)}")
            raise

    def get_user_sessions(
        self,
        db: Session,
        *,
        user_id: str,
        active_only: bool = True
    ) -> List[UserSession]:
        """
        Get all sessions for a user.

        Args:
            db: Database session
            user_id: User ID
            active_only: If True, return only active sessions

        Returns:
            List of UserSession objects, ordered by most recently used
        """
        try:
            # Convert user_id string to UUID if needed
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            query = db.query(UserSession).filter(UserSession.user_id == user_uuid)

            if active_only:
                query = query.filter(UserSession.is_active == True)

            # Order by most recently used first
            return query.order_by(UserSession.last_used_at.desc()).all()
        except Exception as e:
            logger.error(f"Error getting sessions for user {user_id}: {str(e)}")
            raise

    # Creation methods
    # ----------------

    def create_session(
        self,
        db: Session,
        *,
        obj_in: SessionCreate
    ) -> UserSession:
        """
        Create a new user session.

        Args:
            db: Database session
            obj_in: SessionCreate schema with session data

        Returns:
            Created UserSession

        Raises:
            ValueError: If session creation fails
        """
        try:
            # Create model instance from schema
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

            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)

            logger.info(
                f"Session created for user {obj_in.user_id} from {obj_in.device_name} "
                f"(IP: {obj_in.ip_address})"
            )

            return db_obj

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating session: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to create session: {str(e)}")

    # Update methods
    # --------------

    def deactivate(self, db: Session, *, session_id: str) -> Optional[UserSession]:
        """
        Deactivate a session (logout from device).

        Args:
            db: Database session
            session_id: Session UUID

        Returns:
            Deactivated UserSession if found, None otherwise
        """
        try:
            session = self.get(db, id=session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for deactivation")
                return None

            session.is_active = False
            db.add(session)
            db.commit()
            db.refresh(session)

            logger.info(
                f"Session {session_id} deactivated for user {session.user_id} "
                f"({session.device_name})"
            )

            return session

        except Exception as e:
            db.rollback()
            logger.error(f"Error deactivating session {session_id}: {str(e)}")
            raise

    def deactivate_all_user_sessions(
        self,
        db: Session,
        *,
        user_id: str
    ) -> int:
        """
        Deactivate all active sessions for a user (logout from all devices).

        Uses bulk update for efficiency.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of sessions deactivated
        """
        try:
            # Convert user_id string to UUID if needed
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            # Bulk update query
            count = db.query(UserSession).filter(
                and_(
                    UserSession.user_id == user_uuid,
                    UserSession.is_active == True
                )
            ).update({"is_active": False})

            db.commit()

            logger.info(f"Deactivated {count} sessions for user {user_id}")

            return count

        except Exception as e:
            db.rollback()
            logger.error(f"Error deactivating all sessions for user {user_id}: {str(e)}")
            raise

    def update_last_used(
        self,
        db: Session,
        *,
        session: UserSession
    ) -> UserSession:
        """
        Update the last_used_at timestamp for a session.

        Called when a refresh token is used.

        Args:
            db: Database session
            session: UserSession object

        Returns:
            Updated UserSession
        """
        try:
            session.last_used_at = datetime.now(timezone.utc)
            db.add(session)
            db.commit()
            db.refresh(session)
            return session
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating last_used for session {session.id}: {str(e)}")
            raise

    def update_refresh_token(
        self,
        db: Session,
        *,
        session: UserSession,
        new_jti: str,
        new_expires_at: datetime
    ) -> UserSession:
        """
        Update session with new refresh token JTI and expiration.

        Called during token refresh (token rotation).

        Args:
            db: Database session
            session: UserSession object
            new_jti: New refresh token JTI
            new_expires_at: New expiration datetime

        Returns:
            Updated UserSession
        """
        try:
            session.refresh_token_jti = new_jti
            session.expires_at = new_expires_at
            session.last_used_at = datetime.now(timezone.utc)
            db.add(session)
            db.commit()
            db.refresh(session)
            return session
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating refresh token for session {session.id}: {str(e)}")
            raise

    # Cleanup methods
    # ---------------

    def cleanup_expired(self, db: Session, *, keep_days: int = 30) -> int:
        """
        Clean up expired sessions.

        Deletes sessions that are:
        - Expired (expires_at < now) AND inactive
        - Older than keep_days (for audit trail)

        Args:
            db: Database session
            keep_days: Keep inactive sessions for this many days

        Returns:
            Number of sessions deleted
        """
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=keep_days)

            count = db.query(UserSession).filter(
                and_(
                    UserSession.is_active == False,
                    UserSession.expires_at < datetime.now(timezone.utc),
                    UserSession.created_at < cutoff_date
                )
            ).delete()

            db.commit()

            if count > 0:
                logger.info(f"Cleaned up {count} expired sessions")

            return count

        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning up expired sessions: {str(e)}")
            raise

    # Utility methods
    # ---------------

    def get_user_session_count(self, db: Session, *, user_id: str) -> int:
        """
        Get count of active sessions for a user.

        Useful for session limits or security monitoring.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of active sessions
        """
        try:
            return db.query(UserSession).filter(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            ).count()
        except Exception as e:
            logger.error(f"Error counting sessions for user {user_id}: {str(e)}")
            raise


# Create singleton instance
# This is the instance that will be imported and used throughout the app
session = CRUDSession(UserSession)
```

**Key Patterns**:

1. **Error Handling**: Every method has try/except with rollback
2. **Logging**: Log all significant actions (create, delete, errors)
3. **Type Safety**: Full type hints for parameters and returns
4. **Docstrings**: Document what each method does, args, returns, raises
5. **Bulk Operations**: Use `query().update()` for efficiency when updating many rows
6. **UUID Handling**: Convert string UUIDs to UUID objects when needed
7. **Ordering**: Return results in a logical order (most recent first)
8. **Singleton Pattern**: Create one instance to be imported elsewhere

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
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.sessions import SessionResponse, SessionListResponse
from app.schemas.common import MessageResponse
from app.crud.session import session as session_crud
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
def list_my_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    List all active sessions for the current user.

    Args:
        request: FastAPI request object (for rate limiting)
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        SessionListResponse with list of active sessions
    """
    try:
        # Get all active sessions for user
        sessions = session_crud.get_user_sessions(
            db,
            user_id=str(current_user.id),
            active_only=True
        )

        # Convert to response format
        session_responses = []
        for idx, s in enumerate(sessions):
            session_response = SessionResponse(
                id=s.id,
                device_name=s.device_name,
                device_id=s.device_id,
                ip_address=s.ip_address,
                location_city=s.location_city,
                location_country=s.location_country,
                last_used_at=s.last_used_at,
                created_at=s.created_at,
                expires_at=s.expires_at,
                # Mark the most recently used session as current
                is_current=(idx == 0)
            )
            session_responses.append(session_response)

        logger.info(f"User {current_user.id} listed {len(session_responses)} active sessions")

        return SessionListResponse(
            sessions=session_responses,
            total=len(session_responses)
        )

    except Exception as e:
        logger.error(f"Error listing sessions for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )


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
def revoke_session(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Revoke a specific session by ID.

    Args:
        request: FastAPI request object (for rate limiting)
        session_id: UUID of the session to revoke
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        MessageResponse with success message

    Raises:
        NotFoundError: If session doesn't exist
        AuthorizationError: If session belongs to another user
    """
    try:
        # Get the session
        session = session_crud.get(db, id=str(session_id))

        if not session:
            raise NotFoundError(
                message=f"Session {session_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )

        # Verify session belongs to current user (authorization check)
        if str(session.user_id) != str(current_user.id):
            logger.warning(
                f"User {current_user.id} attempted to revoke session {session_id} "
                f"belonging to user {session.user_id}"
            )
            raise AuthorizationError(
                message="You can only revoke your own sessions",
                error_code=ErrorCode.INSUFFICIENT_PERMISSIONS
            )

        # Deactivate the session
        session_crud.deactivate(db, session_id=str(session_id))

        logger.info(
            f"User {current_user.id} revoked session {session_id} "
            f"({session.device_name})"
        )

        return MessageResponse(
            success=True,
            message=f"Session revoked: {session.device_name or 'Unknown device'}"
        )

    except (NotFoundError, AuthorizationError):
        # Re-raise custom exceptions (they'll be handled by global handlers)
        raise
    except Exception as e:
        logger.error(f"Error revoking session {session_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
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
def cleanup_expired_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cleanup expired sessions for the current user.

    Args:
        request: FastAPI request object (for rate limiting)
        current_user: Current authenticated user (injected)
        db: Database session (injected)

    Returns:
        MessageResponse with count of sessions cleaned
    """
    try:
        from datetime import datetime, timezone

        # Get all sessions for user (including inactive)
        all_sessions = session_crud.get_user_sessions(
            db,
            user_id=str(current_user.id),
            active_only=False
        )

        # Delete expired and inactive sessions
        deleted_count = 0
        for s in all_sessions:
            if not s.is_active and s.expires_at < datetime.now(timezone.utc):
                db.delete(s)
                deleted_count += 1

        db.commit()

        logger.info(f"User {current_user.id} cleaned up {deleted_count} expired sessions")

        return MessageResponse(
            success=True,
            message=f"Cleaned up {deleted_count} expired sessions"
        )

    except Exception as e:
        logger.error(f"Error cleaning up sessions for user {current_user.id}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup sessions"
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
from app.crud.session import session as session_crud
from app.schemas.sessions import SessionCreate

@router.post("/login")
async def login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and create session."""

    # 1. Validate credentials
    user = user_crud.get_by_email(db, email=credentials.username)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise AuthenticationError("Invalid credentials")

    if not user.is_active:
        raise AuthenticationError("Account is inactive")

    # 2. Extract device information from request
    device_info = extract_device_info(request)

    # 3. Generate tokens
    jti = str(uuid.uuid4())  # Generate JTI for refresh token
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id), jti=jti)

    # 4. Create session record
    from datetime import datetime, timezone, timedelta

    session_data = SessionCreate(
        user_id=user.id,
        refresh_token_jti=jti,
        device_name=device_info.device_name,
        device_id=device_info.device_id,
        ip_address=device_info.ip_address,
        user_agent=device_info.user_agent,
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        location_city=device_info.location_city,
        location_country=device_info.location_country,
    )

    session_crud.create_session(db, obj_in=session_data)

    logger.info(f"User {user.email} logged in from {device_info.device_name}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }
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
def refresh_token(
    refresh_request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""

    try:
        # 1. Decode and validate refresh token
        payload = decode_token(refresh_request.refresh_token)

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")

        user_id = UUID(payload.get("sub"))
        jti = payload.get("jti")

        # 2. Find and validate session
        session = session_crud.get_active_by_jti(db, jti=jti)

        if not session:
            raise AuthenticationError("Session not found or expired")

        if session.user_id != user_id:
            raise AuthenticationError("Token mismatch")

        # 3. Generate new tokens (token rotation)
        new_jti = str(uuid.uuid4())
        new_access_token = create_access_token(subject=str(user_id))
        new_refresh_token = create_refresh_token(subject=str(user_id), jti=new_jti)

        # 4. Update session with new JTI
        session_crud.update_refresh_token(
            db,
            session=session,
            new_jti=new_jti,
            new_expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )

        logger.info(f"Tokens refreshed for user {user_id}")

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise AuthenticationError("Failed to refresh token")
```

#### 5.4 Update Logout Endpoint

```python
@router.post("/logout")
def logout(
    logout_request: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout from current device."""

    try:
        # Decode refresh token to get JTI
        payload = decode_token(logout_request.refresh_token)
        jti = payload.get("jti")

        # Find and deactivate session
        session = session_crud.get_by_jti(db, jti=jti)

        if session and session.user_id == current_user.id:
            session_crud.deactivate(db, session_id=str(session.id))
            logger.info(f"User {current_user.id} logged out from {session.device_name}")

        return MessageResponse(
            success=True,
            message="Logged out successfully"
        )

    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        # Even if cleanup fails, return success (user intended to logout)
        return MessageResponse(success=True, message="Logged out")
```

### Step 6: Add Background Jobs

**File**: `app/services/session_cleanup.py`

```python
"""
Background job for cleaning up expired sessions.
"""
import logging
from app.core.database import SessionLocal
from app.crud.session import session as session_crud

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions():
    """
    Clean up expired sessions.

    Runs daily at 2 AM. Removes sessions that are:
    - Expired (expires_at < now)
    - Inactive (is_active = False)
    - Older than 30 days (for audit trail)
    """
    db = SessionLocal()
    try:
        count = session_crud.cleanup_expired(db, keep_days=30)
        logger.info(f"Background cleanup: Removed {count} expired sessions")
    except Exception as e:
        logger.error(f"Error in session cleanup job: {str(e)}", exc_info=True)
    finally:
        db.close()
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
3. `app/crud/session.py` - CRUD operations
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

1. **Don't Mix Layers**: Keep business logic out of CRUD, database ops out of routes
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
- [ ] Implement CRUD operations
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
