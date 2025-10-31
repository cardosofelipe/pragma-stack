"""
Background job for cleaning up expired sessions.

This service runs periodically to remove old session records from the database.
"""
import logging
from datetime import datetime, timezone

from app.core.database import SessionLocal
from app.crud.session import session as session_crud

logger = logging.getLogger(__name__)


def cleanup_expired_sessions(keep_days: int = 30) -> int:
    """
    Clean up expired and inactive sessions.

    This removes sessions that are:
    - Inactive (is_active=False) AND
    - Expired (expires_at < now) AND
    - Older than keep_days

    Args:
        keep_days: Keep inactive sessions for this many days for audit purposes

    Returns:
        Number of sessions deleted
    """
    logger.info("Starting session cleanup job...")

    db = SessionLocal()
    try:
        # Use CRUD method to cleanup
        count = session_crud.cleanup_expired(db, keep_days=keep_days)

        logger.info(f"Session cleanup complete: {count} sessions deleted")

        return count

    except Exception as e:
        logger.error(f"Error during session cleanup: {str(e)}", exc_info=True)
        return 0
    finally:
        db.close()


def get_session_statistics() -> dict:
    """
    Get statistics about current sessions.

    Returns:
        Dictionary with session stats
    """
    db = SessionLocal()
    try:
        from app.models.user_session import UserSession

        total_sessions = db.query(UserSession).count()
        active_sessions = db.query(UserSession).filter(UserSession.is_active == True).count()
        expired_sessions = db.query(UserSession).filter(
            UserSession.expires_at < datetime.now(timezone.utc)
        ).count()

        stats = {
            "total": total_sessions,
            "active": active_sessions,
            "inactive": total_sessions - active_sessions,
            "expired": expired_sessions,
        }

        logger.info(f"Session statistics: {stats}")

        return stats

    except Exception as e:
        logger.error(f"Error getting session statistics: {str(e)}", exc_info=True)
        return {}
    finally:
        db.close()
