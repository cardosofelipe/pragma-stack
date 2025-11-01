"""
CRUD operations for user sessions.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.user_session import UserSession
from app.schemas.sessions import SessionCreate, SessionUpdate

logger = logging.getLogger(__name__)


class CRUDSession(CRUDBase[UserSession, SessionCreate, SessionUpdate]):
    """CRUD operations for user sessions."""

    def get_by_jti(self, db: Session, *, jti: str) -> Optional[UserSession]:
        """
        Get session by refresh token JTI.

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
            List of UserSession objects
        """
        try:
            # Convert user_id string to UUID if needed
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

            query = db.query(UserSession).filter(UserSession.user_id == user_uuid)

            if active_only:
                query = query.filter(UserSession.is_active == True)

            return query.order_by(UserSession.last_used_at.desc()).all()
        except Exception as e:
            logger.error(f"Error getting sessions for user {user_id}: {str(e)}")
            raise

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

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of sessions deactivated
        """
        try:
            # Convert user_id string to UUID if needed
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

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

        Called during token refresh.

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

    def cleanup_expired(self, db: Session, *, keep_days: int = 30) -> int:
        """
        Clean up expired sessions.

        Deletes sessions that are:
        - Expired AND inactive
        - Older than keep_days

        Args:
            db: Database session
            keep_days: Keep inactive sessions for this many days (for audit)

        Returns:
            Number of sessions deleted
        """
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=keep_days)

            # Delete sessions that are:
            # 1. Expired (expires_at < now) AND inactive
            # AND
            # 2. Older than keep_days
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

    def get_user_session_count(self, db: Session, *, user_id: str) -> int:
        """
        Get count of active sessions for a user.

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
session = CRUDSession(UserSession)
