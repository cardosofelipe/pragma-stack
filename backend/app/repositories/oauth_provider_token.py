# app/repositories/oauth_provider_token.py
"""Repository for OAuthProviderRefreshToken model."""

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_provider_token import OAuthProviderRefreshToken

logger = logging.getLogger(__name__)


class OAuthProviderTokenRepository:
    """Repository for OAuth provider refresh tokens."""

    async def create_token(
        self,
        db: AsyncSession,
        *,
        token_hash: str,
        jti: str,
        client_id: str,
        user_id: UUID,
        scope: str,
        expires_at: datetime,
        device_info: str | None = None,
        ip_address: str | None = None,
    ) -> OAuthProviderRefreshToken:
        """Create and persist a new refresh token record."""
        token = OAuthProviderRefreshToken(
            token_hash=token_hash,
            jti=jti,
            client_id=client_id,
            user_id=user_id,
            scope=scope,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address,
        )
        db.add(token)
        await db.commit()
        return token

    async def get_by_token_hash(
        self, db: AsyncSession, *, token_hash: str
    ) -> OAuthProviderRefreshToken | None:
        """Get refresh token record by SHA-256 token hash."""
        result = await db.execute(
            select(OAuthProviderRefreshToken).where(
                OAuthProviderRefreshToken.token_hash == token_hash
            )
        )
        return result.scalar_one_or_none()

    async def get_by_jti(
        self, db: AsyncSession, *, jti: str
    ) -> OAuthProviderRefreshToken | None:
        """Get refresh token record by JWT ID (JTI)."""
        result = await db.execute(
            select(OAuthProviderRefreshToken).where(
                OAuthProviderRefreshToken.jti == jti
            )
        )
        return result.scalar_one_or_none()

    async def revoke(
        self, db: AsyncSession, *, token: OAuthProviderRefreshToken
    ) -> None:
        """Mark a specific token record as revoked."""
        token.revoked = True  # type: ignore[assignment]
        token.last_used_at = datetime.now(UTC)  # type: ignore[assignment]
        await db.commit()

    async def revoke_all_for_user_client(
        self, db: AsyncSession, *, user_id: UUID, client_id: str
    ) -> int:
        """
        Revoke all active tokens for a specific user-client pair.

        Used when security incidents are detected (e.g., authorization code reuse).
        Returns the number of tokens revoked.
        """
        result = await db.execute(
            update(OAuthProviderRefreshToken)
            .where(
                and_(
                    OAuthProviderRefreshToken.user_id == user_id,
                    OAuthProviderRefreshToken.client_id == client_id,
                    OAuthProviderRefreshToken.revoked == False,  # noqa: E712
                )
            )
            .values(revoked=True)
        )
        count = result.rowcount  # type: ignore[attr-defined]
        if count > 0:
            await db.commit()
        return count

    async def revoke_all_for_user(
        self, db: AsyncSession, *, user_id: UUID
    ) -> int:
        """
        Revoke all active tokens for a user across all clients.

        Used when user changes password or logs out everywhere.
        Returns the number of tokens revoked.
        """
        result = await db.execute(
            update(OAuthProviderRefreshToken)
            .where(
                and_(
                    OAuthProviderRefreshToken.user_id == user_id,
                    OAuthProviderRefreshToken.revoked == False,  # noqa: E712
                )
            )
            .values(revoked=True)
        )
        count = result.rowcount  # type: ignore[attr-defined]
        if count > 0:
            await db.commit()
        return count

    async def cleanup_expired(
        self, db: AsyncSession, *, cutoff_days: int = 7
    ) -> int:
        """
        Delete expired refresh tokens older than cutoff_days.

        Should be called periodically (e.g., daily).
        Returns the number of tokens deleted.
        """
        cutoff = datetime.now(UTC) - timedelta(days=cutoff_days)
        result = await db.execute(
            delete(OAuthProviderRefreshToken).where(
                OAuthProviderRefreshToken.expires_at < cutoff
            )
        )
        await db.commit()
        return result.rowcount  # type: ignore[attr-defined]


# Singleton instance
oauth_provider_token_repo = OAuthProviderTokenRepository()
