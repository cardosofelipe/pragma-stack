# app/repositories/session.py
"""Repository for UserSession model async CRUD operations using SQLAlchemy 2.0 patterns."""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.repository_exceptions import IntegrityConstraintError, InvalidInputError
from app.models.user_session import UserSession
from app.repositories.base import BaseRepository
from app.schemas.sessions import SessionCreate, SessionUpdate

logger = logging.getLogger(__name__)


class SessionRepository(BaseRepository[UserSession, SessionCreate, SessionUpdate]):
    """Repository for UserSession model."""

    async def get_by_jti(self, db: AsyncSession, *, jti: str) -> UserSession | None:
        """Get session by refresh token JTI."""
        try:
            result = await db.execute(
                select(UserSession).where(UserSession.refresh_token_jti == jti)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting session by JTI {jti}: {e!s}")
            raise

    async def get_active_by_jti(
        self, db: AsyncSession, *, jti: str
    ) -> UserSession | None:
        """Get active session by refresh token JTI."""
        try:
            result = await db.execute(
                select(UserSession).where(
                    and_(
                        UserSession.refresh_token_jti == jti,
                        UserSession.is_active,
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting active session by JTI {jti}: {e!s}")
            raise

    async def get_user_sessions(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        active_only: bool = True,
        with_user: bool = False,
    ) -> list[UserSession]:
        """Get all sessions for a user with optional eager loading."""
        try:
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            query = select(UserSession).where(UserSession.user_id == user_uuid)

            if with_user:
                query = query.options(joinedload(UserSession.user))

            if active_only:
                query = query.where(UserSession.is_active)

            query = query.order_by(UserSession.last_used_at.desc())
            result = await db.execute(query)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error getting sessions for user {user_id}: {e!s}")
            raise

    async def create_session(
        self, db: AsyncSession, *, obj_in: SessionCreate
    ) -> UserSession:
        """Create a new user session."""
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
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)

            logger.info(
                f"Session created for user {obj_in.user_id} from {obj_in.device_name} "
                f"(IP: {obj_in.ip_address})"
            )

            return db_obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating session: {e!s}", exc_info=True)
            raise IntegrityConstraintError(f"Failed to create session: {e!s}")

    async def deactivate(
        self, db: AsyncSession, *, session_id: str
    ) -> UserSession | None:
        """Deactivate a session (logout from device)."""
        try:
            session = await self.get(db, id=session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for deactivation")
                return None

            session.is_active = False
            db.add(session)
            await db.commit()
            await db.refresh(session)

            logger.info(
                f"Session {session_id} deactivated for user {session.user_id} "
                f"({session.device_name})"
            )

            return session
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deactivating session {session_id}: {e!s}")
            raise

    async def deactivate_all_user_sessions(
        self, db: AsyncSession, *, user_id: str
    ) -> int:
        """Deactivate all active sessions for a user (logout from all devices)."""
        try:
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            stmt = (
                update(UserSession)
                .where(and_(UserSession.user_id == user_uuid, UserSession.is_active))
                .values(is_active=False)
            )

            result = await db.execute(stmt)
            await db.commit()

            count = result.rowcount

            logger.info(f"Deactivated {count} sessions for user {user_id}")

            return count
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deactivating all sessions for user {user_id}: {e!s}")
            raise

    async def update_last_used(
        self, db: AsyncSession, *, session: UserSession
    ) -> UserSession:
        """Update the last_used_at timestamp for a session."""
        try:
            session.last_used_at = datetime.now(UTC)
            db.add(session)
            await db.commit()
            await db.refresh(session)
            return session
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating last_used for session {session.id}: {e!s}")
            raise

    async def update_refresh_token(
        self,
        db: AsyncSession,
        *,
        session: UserSession,
        new_jti: str,
        new_expires_at: datetime,
    ) -> UserSession:
        """Update session with new refresh token JTI and expiration."""
        try:
            session.refresh_token_jti = new_jti
            session.expires_at = new_expires_at
            session.last_used_at = datetime.now(UTC)
            db.add(session)
            await db.commit()
            await db.refresh(session)
            return session
        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error updating refresh token for session {session.id}: {e!s}"
            )
            raise

    async def cleanup_expired(self, db: AsyncSession, *, keep_days: int = 30) -> int:
        """Clean up expired sessions using optimized bulk DELETE."""
        try:
            cutoff_date = datetime.now(UTC) - timedelta(days=keep_days)
            now = datetime.now(UTC)

            stmt = delete(UserSession).where(
                and_(
                    UserSession.is_active == False,  # noqa: E712
                    UserSession.expires_at < now,
                    UserSession.created_at < cutoff_date,
                )
            )

            result = await db.execute(stmt)
            await db.commit()

            count = result.rowcount

            if count > 0:
                logger.info(f"Cleaned up {count} expired sessions using bulk DELETE")

            return count
        except Exception as e:
            await db.rollback()
            logger.error(f"Error cleaning up expired sessions: {e!s}")
            raise

    async def cleanup_expired_for_user(self, db: AsyncSession, *, user_id: str) -> int:
        """Clean up expired and inactive sessions for a specific user."""
        try:
            try:
                uuid_obj = uuid.UUID(user_id)
            except (ValueError, AttributeError):
                logger.error(f"Invalid UUID format: {user_id}")
                raise InvalidInputError(f"Invalid user ID format: {user_id}")

            now = datetime.now(UTC)

            stmt = delete(UserSession).where(
                and_(
                    UserSession.user_id == uuid_obj,
                    UserSession.is_active == False,  # noqa: E712
                    UserSession.expires_at < now,
                )
            )

            result = await db.execute(stmt)
            await db.commit()

            count = result.rowcount

            if count > 0:
                logger.info(
                    f"Cleaned up {count} expired sessions for user {user_id} using bulk DELETE"
                )

            return count
        except Exception as e:
            await db.rollback()
            logger.error(
                f"Error cleaning up expired sessions for user {user_id}: {e!s}"
            )
            raise

    async def get_user_session_count(self, db: AsyncSession, *, user_id: str) -> int:
        """Get count of active sessions for a user."""
        try:
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            result = await db.execute(
                select(func.count(UserSession.id)).where(
                    and_(UserSession.user_id == user_uuid, UserSession.is_active)
                )
            )
            return result.scalar_one()
        except Exception as e:
            logger.error(f"Error counting sessions for user {user_id}: {e!s}")
            raise

    async def get_all_sessions(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        with_user: bool = True,
    ) -> tuple[list[UserSession], int]:
        """Get all sessions across all users with pagination (admin only)."""
        try:
            query = select(UserSession)

            if with_user:
                query = query.options(joinedload(UserSession.user))

            if active_only:
                query = query.where(UserSession.is_active)

            count_query = select(func.count(UserSession.id))
            if active_only:
                count_query = count_query.where(UserSession.is_active)

            count_result = await db.execute(count_query)
            total = count_result.scalar_one()

            query = (
                query.order_by(UserSession.last_used_at.desc())
                .offset(skip)
                .limit(limit)
            )

            result = await db.execute(query)
            sessions = list(result.scalars().all())

            return sessions, total

        except Exception as e:
            logger.error(f"Error getting all sessions: {e!s}", exc_info=True)
            raise


# Singleton instance
session_repo = SessionRepository(UserSession)
