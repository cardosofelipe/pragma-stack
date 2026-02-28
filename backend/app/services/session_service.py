# app/services/session_service.py
"""Service layer for session operations — delegates to SessionRepository."""

import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_session import UserSession
from app.repositories.session import SessionRepository, session_repo
from app.schemas.sessions import SessionCreate

logger = logging.getLogger(__name__)


class SessionService:
    """Service for user session management operations."""

    def __init__(self, session_repository: SessionRepository | None = None) -> None:
        self._repo = session_repository or session_repo

    async def create_session(
        self, db: AsyncSession, *, obj_in: SessionCreate
    ) -> UserSession:
        """Create a new session record."""
        return await self._repo.create_session(db, obj_in=obj_in)

    async def get_session(
        self, db: AsyncSession, session_id: str
    ) -> UserSession | None:
        """Get session by ID."""
        return await self._repo.get(db, id=session_id)

    async def get_user_sessions(
        self, db: AsyncSession, *, user_id: str, active_only: bool = True
    ) -> list[UserSession]:
        """Get all sessions for a user."""
        return await self._repo.get_user_sessions(
            db, user_id=user_id, active_only=active_only
        )

    async def get_active_by_jti(
        self, db: AsyncSession, *, jti: str
    ) -> UserSession | None:
        """Get active session by refresh token JTI."""
        return await self._repo.get_active_by_jti(db, jti=jti)

    async def get_by_jti(self, db: AsyncSession, *, jti: str) -> UserSession | None:
        """Get session by refresh token JTI (active or inactive)."""
        return await self._repo.get_by_jti(db, jti=jti)

    async def deactivate(
        self, db: AsyncSession, *, session_id: str
    ) -> UserSession | None:
        """Deactivate a session (logout from device)."""
        return await self._repo.deactivate(db, session_id=session_id)

    async def deactivate_all_user_sessions(
        self, db: AsyncSession, *, user_id: str
    ) -> int:
        """Deactivate all sessions for a user. Returns count deactivated."""
        return await self._repo.deactivate_all_user_sessions(db, user_id=user_id)

    async def update_refresh_token(
        self,
        db: AsyncSession,
        *,
        session: UserSession,
        new_jti: str,
        new_expires_at: datetime,
    ) -> UserSession:
        """Update session with a rotated refresh token."""
        return await self._repo.update_refresh_token(
            db, session=session, new_jti=new_jti, new_expires_at=new_expires_at
        )

    async def cleanup_expired_for_user(self, db: AsyncSession, *, user_id: str) -> int:
        """Remove expired sessions for a user. Returns count removed."""
        return await self._repo.cleanup_expired_for_user(db, user_id=user_id)

    async def get_all_sessions(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        with_user: bool = True,
    ) -> tuple[list[UserSession], int]:
        """Get all sessions with pagination (admin only)."""
        return await self._repo.get_all_sessions(
            db, skip=skip, limit=limit, active_only=active_only, with_user=with_user
        )


# Default singleton
session_service = SessionService()
