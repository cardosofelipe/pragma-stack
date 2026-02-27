# app/repositories/oauth_state.py
"""Repository for OAuthState model async CRUD operations."""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository_exceptions import DuplicateEntryError
from app.models.oauth_state import OAuthState
from app.repositories.base import BaseRepository
from app.schemas.oauth import OAuthStateCreate

logger = logging.getLogger(__name__)


class EmptySchema(BaseModel):
    """Placeholder schema for repository operations that don't need update schemas."""


class OAuthStateRepository(BaseRepository[OAuthState, OAuthStateCreate, EmptySchema]):
    """Repository for OAuth state (CSRF protection)."""

    async def create_state(
        self, db: AsyncSession, *, obj_in: OAuthStateCreate
    ) -> OAuthState:
        """Create a new OAuth state for CSRF protection."""
        try:
            db_obj = OAuthState(
                state=obj_in.state,
                code_verifier=obj_in.code_verifier,
                nonce=obj_in.nonce,
                provider=obj_in.provider,
                redirect_uri=obj_in.redirect_uri,
                user_id=obj_in.user_id,
                expires_at=obj_in.expires_at,
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)

            logger.debug(f"OAuth state created for {obj_in.provider}")
            return db_obj
        except IntegrityError as e:  # pragma: no cover
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            logger.error(f"OAuth state collision: {error_msg}")
            raise DuplicateEntryError("Failed to create OAuth state, please retry")
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error creating OAuth state: {e!s}", exc_info=True)
            raise

    async def get_and_consume_state(
        self, db: AsyncSession, *, state: str
    ) -> OAuthState | None:
        """Get and delete OAuth state (consume it)."""
        try:
            result = await db.execute(
                select(OAuthState).where(OAuthState.state == state)
            )
            db_obj = result.scalar_one_or_none()

            if db_obj is None:
                logger.warning(f"OAuth state not found: {state[:8]}...")
                return None

            now = datetime.now(UTC)
            expires_at = db_obj.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)

            if expires_at < now:
                logger.warning(f"OAuth state expired: {state[:8]}...")
                await db.delete(db_obj)
                await db.commit()
                return None

            await db.delete(db_obj)
            await db.commit()

            logger.debug(f"OAuth state consumed: {state[:8]}...")
            return db_obj
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error consuming OAuth state: {e!s}")
            raise

    async def cleanup_expired(self, db: AsyncSession) -> int:
        """Clean up expired OAuth states."""
        try:
            now = datetime.now(UTC)

            stmt = delete(OAuthState).where(OAuthState.expires_at < now)
            result = await db.execute(stmt)
            await db.commit()

            count = result.rowcount
            if count > 0:
                logger.info(f"Cleaned up {count} expired OAuth states")

            return count
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error cleaning up expired OAuth states: {e!s}")
            raise


# Singleton instance
oauth_state_repo = OAuthStateRepository(OAuthState)
