"""
Background job for cleaning up expired sessions.

This service runs periodically to remove old session records from the database.
"""
import logging
from datetime import datetime, timezone

from app.core.database_async import AsyncSessionLocal
from app.crud.session_async import session_async as session_crud

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions(keep_days: int = 30) -> int:
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

    async with AsyncSessionLocal() as db:
        try:
            # Use CRUD method to cleanup
            count = await session_crud.cleanup_expired(db, keep_days=keep_days)

            logger.info(f"Session cleanup complete: {count} sessions deleted")

            return count

        except Exception as e:
            logger.error(f"Error during session cleanup: {str(e)}", exc_info=True)
            return 0


async def get_session_statistics() -> dict:
    """
    Get statistics about current sessions.

    Returns:
        Dictionary with session stats
    """
    async with AsyncSessionLocal() as db:
        try:
            from app.models.user_session import UserSession
            from sqlalchemy import select, func

            total_result = await db.execute(select(func.count(UserSession.id)))
            total_sessions = total_result.scalar_one()

            active_result = await db.execute(
                select(func.count(UserSession.id)).where(UserSession.is_active == True)
            )
            active_sessions = active_result.scalar_one()

            expired_result = await db.execute(
                select(func.count(UserSession.id)).where(
                    UserSession.expires_at < datetime.now(timezone.utc)
                )
            )
            expired_sessions = expired_result.scalar_one()

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
