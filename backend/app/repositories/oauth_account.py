# app/repositories/oauth_account.py
"""Repository for OAuthAccount model async CRUD operations."""

import logging
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.repository_exceptions import DuplicateEntryError
from app.models.oauth_account import OAuthAccount
from app.repositories.base import BaseRepository
from app.schemas.oauth import OAuthAccountCreate

logger = logging.getLogger(__name__)


class EmptySchema(BaseModel):
    """Placeholder schema for repository operations that don't need update schemas."""


class OAuthAccountRepository(
    BaseRepository[OAuthAccount, OAuthAccountCreate, EmptySchema]
):
    """Repository for OAuth account links."""

    async def get_by_provider_id(
        self,
        db: AsyncSession,
        *,
        provider: str,
        provider_user_id: str,
    ) -> OAuthAccount | None:
        """Get OAuth account by provider and provider user ID."""
        try:
            result = await db.execute(
                select(OAuthAccount)
                .where(
                    and_(
                        OAuthAccount.provider == provider,
                        OAuthAccount.provider_user_id == provider_user_id,
                    )
                )
                .options(joinedload(OAuthAccount.user))
            )
            return result.scalar_one_or_none()
        except Exception as e:  # pragma: no cover
            logger.error(
                f"Error getting OAuth account for {provider}:{provider_user_id}: {e!s}"
            )
            raise

    async def get_by_provider_email(
        self,
        db: AsyncSession,
        *,
        provider: str,
        email: str,
    ) -> OAuthAccount | None:
        """Get OAuth account by provider and email."""
        try:
            result = await db.execute(
                select(OAuthAccount)
                .where(
                    and_(
                        OAuthAccount.provider == provider,
                        OAuthAccount.provider_email == email,
                    )
                )
                .options(joinedload(OAuthAccount.user))
            )
            return result.scalar_one_or_none()
        except Exception as e:  # pragma: no cover
            logger.error(
                f"Error getting OAuth account for {provider} email {email}: {e!s}"
            )
            raise

    async def get_user_accounts(
        self,
        db: AsyncSession,
        *,
        user_id: str | UUID,
    ) -> list[OAuthAccount]:
        """Get all OAuth accounts linked to a user."""
        try:
            user_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id

            result = await db.execute(
                select(OAuthAccount)
                .where(OAuthAccount.user_id == user_uuid)
                .order_by(OAuthAccount.created_at.desc())
            )
            return list(result.scalars().all())
        except Exception as e:  # pragma: no cover
            logger.error(f"Error getting OAuth accounts for user {user_id}: {e!s}")
            raise

    async def get_user_account_by_provider(
        self,
        db: AsyncSession,
        *,
        user_id: str | UUID,
        provider: str,
    ) -> OAuthAccount | None:
        """Get a specific OAuth account for a user and provider."""
        try:
            user_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id

            result = await db.execute(
                select(OAuthAccount).where(
                    and_(
                        OAuthAccount.user_id == user_uuid,
                        OAuthAccount.provider == provider,
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:  # pragma: no cover
            logger.error(
                f"Error getting OAuth account for user {user_id}, provider {provider}: {e!s}"
            )
            raise

    async def create_account(
        self, db: AsyncSession, *, obj_in: OAuthAccountCreate
    ) -> OAuthAccount:
        """Create a new OAuth account link."""
        try:
            db_obj = OAuthAccount(
                user_id=obj_in.user_id,
                provider=obj_in.provider,
                provider_user_id=obj_in.provider_user_id,
                provider_email=obj_in.provider_email,
                access_token=obj_in.access_token,
                refresh_token=obj_in.refresh_token,
                token_expires_at=obj_in.token_expires_at,
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)

            logger.info(
                f"OAuth account created: {obj_in.provider} linked to user {obj_in.user_id}"
            )
            return db_obj
        except IntegrityError as e:  # pragma: no cover
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            if "uq_oauth_provider_user" in error_msg.lower():
                logger.warning(
                    f"OAuth account already exists: {obj_in.provider}:{obj_in.provider_user_id}"
                )
                raise DuplicateEntryError(
                    f"This {obj_in.provider} account is already linked to another user"
                )
            logger.error(f"Integrity error creating OAuth account: {error_msg}")
            raise DuplicateEntryError(f"Failed to create OAuth account: {error_msg}")
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error creating OAuth account: {e!s}", exc_info=True)
            raise

    async def delete_account(
        self,
        db: AsyncSession,
        *,
        user_id: str | UUID,
        provider: str,
    ) -> bool:
        """Delete an OAuth account link."""
        try:
            user_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id

            result = await db.execute(
                delete(OAuthAccount).where(
                    and_(
                        OAuthAccount.user_id == user_uuid,
                        OAuthAccount.provider == provider,
                    )
                )
            )
            await db.commit()

            deleted = result.rowcount > 0
            if deleted:
                logger.info(
                    f"OAuth account deleted: {provider} unlinked from user {user_id}"
                )
            else:
                logger.warning(
                    f"OAuth account not found for deletion: {provider} for user {user_id}"
                )

            return deleted
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(
                f"Error deleting OAuth account {provider} for user {user_id}: {e!s}"
            )
            raise

    async def update_tokens(
        self,
        db: AsyncSession,
        *,
        account: OAuthAccount,
        access_token: str | None = None,
        refresh_token: str | None = None,
        token_expires_at: datetime | None = None,
    ) -> OAuthAccount:
        """Update OAuth tokens for an account."""
        try:
            if access_token is not None:
                account.access_token = access_token
            if refresh_token is not None:
                account.refresh_token = refresh_token
            if token_expires_at is not None:
                account.token_expires_at = token_expires_at

            db.add(account)
            await db.commit()
            await db.refresh(account)

            return account
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error updating OAuth tokens: {e!s}")
            raise


# Singleton instance
oauth_account_repo = OAuthAccountRepository(OAuthAccount)
