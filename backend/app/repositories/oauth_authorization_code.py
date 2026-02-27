# app/repositories/oauth_authorization_code.py
"""Repository for OAuthAuthorizationCode model."""

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_authorization_code import OAuthAuthorizationCode

logger = logging.getLogger(__name__)


class OAuthAuthorizationCodeRepository:
    """Repository for OAuth 2.0 authorization codes."""

    async def create_code(
        self,
        db: AsyncSession,
        *,
        code: str,
        client_id: str,
        user_id: UUID,
        redirect_uri: str,
        scope: str,
        expires_at: datetime,
        code_challenge: str | None = None,
        code_challenge_method: str | None = None,
        state: str | None = None,
        nonce: str | None = None,
    ) -> OAuthAuthorizationCode:
        """Create and persist a new authorization code."""
        auth_code = OAuthAuthorizationCode(
            code=code,
            client_id=client_id,
            user_id=user_id,
            redirect_uri=redirect_uri,
            scope=scope,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            state=state,
            nonce=nonce,
            expires_at=expires_at,
            used=False,
        )
        db.add(auth_code)
        await db.commit()
        return auth_code

    async def consume_code_atomically(
        self, db: AsyncSession, *, code: str
    ) -> UUID | None:
        """
        Atomically mark a code as used and return its UUID.

        Returns the UUID if the code was found and not yet used, None otherwise.
        This prevents race conditions per RFC 6749 Section 4.1.2.
        """
        stmt = (
            update(OAuthAuthorizationCode)
            .where(
                and_(
                    OAuthAuthorizationCode.code == code,
                    OAuthAuthorizationCode.used == False,  # noqa: E712
                )
            )
            .values(used=True)
            .returning(OAuthAuthorizationCode.id)
        )
        result = await db.execute(stmt)
        row_id = result.scalar_one_or_none()
        if row_id is not None:
            await db.commit()
        return row_id

    async def get_by_id(
        self, db: AsyncSession, *, code_id: UUID
    ) -> OAuthAuthorizationCode | None:
        """Get authorization code by its UUID primary key."""
        result = await db.execute(
            select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.id == code_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(
        self, db: AsyncSession, *, code: str
    ) -> OAuthAuthorizationCode | None:
        """Get authorization code by the code string value."""
        result = await db.execute(
            select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code == code)
        )
        return result.scalar_one_or_none()

    async def cleanup_expired(self, db: AsyncSession) -> int:
        """Delete all expired authorization codes. Returns count deleted."""
        result = await db.execute(
            delete(OAuthAuthorizationCode).where(
                OAuthAuthorizationCode.expires_at < datetime.now(UTC)
            )
        )
        await db.commit()
        return result.rowcount  # type: ignore[attr-defined]


# Singleton instance
oauth_authorization_code_repo = OAuthAuthorizationCodeRepository()
