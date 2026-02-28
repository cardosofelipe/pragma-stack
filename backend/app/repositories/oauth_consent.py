# app/repositories/oauth_consent.py
"""Repository for OAuthConsent model."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_client import OAuthClient
from app.models.oauth_provider_token import OAuthConsent

logger = logging.getLogger(__name__)


class OAuthConsentRepository:
    """Repository for OAuth consent records (user grants to clients)."""

    async def get_consent(
        self, db: AsyncSession, *, user_id: UUID, client_id: str
    ) -> OAuthConsent | None:
        """Get the consent record for a user-client pair, or None if not found."""
        result = await db.execute(
            select(OAuthConsent).where(
                and_(
                    OAuthConsent.user_id == user_id,
                    OAuthConsent.client_id == client_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def grant_consent(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        client_id: str,
        scopes: list[str],
    ) -> OAuthConsent:
        """
        Create or update consent for a user-client pair.

        If consent already exists, the new scopes are merged with existing ones.
        Returns the created or updated consent record.
        """
        consent = await self.get_consent(db, user_id=user_id, client_id=client_id)

        if consent:
            existing = (
                set(consent.granted_scopes.split()) if consent.granted_scopes else set()
            )
            merged = existing | set(scopes)
            consent.granted_scopes = " ".join(sorted(merged))  # type: ignore[assignment]
        else:
            consent = OAuthConsent(
                user_id=user_id,
                client_id=client_id,
                granted_scopes=" ".join(sorted(set(scopes))),
            )
            db.add(consent)

        await db.commit()
        await db.refresh(consent)
        return consent

    async def get_user_consents_with_clients(
        self, db: AsyncSession, *, user_id: UUID
    ) -> list[dict[str, Any]]:
        """Get all consent records for a user joined with client details."""
        result = await db.execute(
            select(OAuthConsent, OAuthClient)
            .join(OAuthClient, OAuthConsent.client_id == OAuthClient.client_id)
            .where(OAuthConsent.user_id == user_id)
        )
        rows = result.all()
        return [
            {
                "client_id": consent.client_id,
                "client_name": client.client_name,
                "client_description": client.client_description,
                "granted_scopes": consent.granted_scopes.split()
                if consent.granted_scopes
                else [],
                "granted_at": consent.created_at.isoformat(),
            }
            for consent, client in rows
        ]

    async def revoke_consent(
        self, db: AsyncSession, *, user_id: UUID, client_id: str
    ) -> bool:
        """
        Delete the consent record for a user-client pair.

        Returns True if a record was found and deleted.
        Note: Callers are responsible for also revoking associated tokens.
        """
        result = await db.execute(
            delete(OAuthConsent).where(
                and_(
                    OAuthConsent.user_id == user_id,
                    OAuthConsent.client_id == client_id,
                )
            )
        )
        await db.commit()
        return result.rowcount > 0  # type: ignore[attr-defined]


# Singleton instance
oauth_consent_repo = OAuthConsentRepository()
