# app/repositories/oauth_client.py
"""Repository for OAuthClient model async CRUD operations."""

import logging
import secrets
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository_exceptions import DuplicateEntryError
from app.models.oauth_client import OAuthClient
from app.repositories.base import BaseRepository
from app.schemas.oauth import OAuthClientCreate

logger = logging.getLogger(__name__)


class EmptySchema(BaseModel):
    """Placeholder schema for repository operations that don't need update schemas."""


class OAuthClientRepository(BaseRepository[OAuthClient, OAuthClientCreate, EmptySchema]):
    """Repository for OAuth clients (provider mode)."""

    async def get_by_client_id(
        self, db: AsyncSession, *, client_id: str
    ) -> OAuthClient | None:
        """Get OAuth client by client_id."""
        try:
            result = await db.execute(
                select(OAuthClient).where(
                    and_(
                        OAuthClient.client_id == client_id,
                        OAuthClient.is_active == True,  # noqa: E712
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:  # pragma: no cover
            logger.error(f"Error getting OAuth client {client_id}: {e!s}")
            raise

    async def create_client(
        self,
        db: AsyncSession,
        *,
        obj_in: OAuthClientCreate,
        owner_user_id: UUID | None = None,
    ) -> tuple[OAuthClient, str | None]:
        """Create a new OAuth client."""
        try:
            client_id = secrets.token_urlsafe(32)

            client_secret = None
            client_secret_hash = None
            if obj_in.client_type == "confidential":
                client_secret = secrets.token_urlsafe(48)
                from app.core.auth import get_password_hash

                client_secret_hash = get_password_hash(client_secret)

            db_obj = OAuthClient(
                client_id=client_id,
                client_secret_hash=client_secret_hash,
                client_name=obj_in.client_name,
                client_description=obj_in.client_description,
                client_type=obj_in.client_type,
                redirect_uris=obj_in.redirect_uris,
                allowed_scopes=obj_in.allowed_scopes,
                owner_user_id=owner_user_id,
                is_active=True,
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)

            logger.info(
                f"OAuth client created: {obj_in.client_name} ({client_id[:8]}...)"
            )
            return db_obj, client_secret
        except IntegrityError as e:  # pragma: no cover
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            logger.error(f"Error creating OAuth client: {error_msg}")
            raise DuplicateEntryError(f"Failed to create OAuth client: {error_msg}")
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error creating OAuth client: {e!s}", exc_info=True)
            raise

    async def deactivate_client(
        self, db: AsyncSession, *, client_id: str
    ) -> OAuthClient | None:
        """Deactivate an OAuth client."""
        try:
            client = await self.get_by_client_id(db, client_id=client_id)
            if client is None:
                return None

            client.is_active = False
            db.add(client)
            await db.commit()
            await db.refresh(client)

            logger.info(f"OAuth client deactivated: {client.client_name}")
            return client
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error deactivating OAuth client {client_id}: {e!s}")
            raise

    async def validate_redirect_uri(
        self, db: AsyncSession, *, client_id: str, redirect_uri: str
    ) -> bool:
        """Validate that a redirect URI is allowed for a client."""
        try:
            client = await self.get_by_client_id(db, client_id=client_id)
            if client is None:
                return False

            return redirect_uri in (client.redirect_uris or [])
        except Exception as e:  # pragma: no cover
            logger.error(f"Error validating redirect URI: {e!s}")
            return False

    async def verify_client_secret(
        self, db: AsyncSession, *, client_id: str, client_secret: str
    ) -> bool:
        """Verify client credentials."""
        try:
            result = await db.execute(
                select(OAuthClient).where(
                    and_(
                        OAuthClient.client_id == client_id,
                        OAuthClient.is_active == True,  # noqa: E712
                    )
                )
            )
            client = result.scalar_one_or_none()

            if client is None or client.client_secret_hash is None:
                return False

            from app.core.auth import verify_password

            stored_hash: str = str(client.client_secret_hash)

            if stored_hash.startswith("$2"):
                return verify_password(client_secret, stored_hash)
            else:
                import hashlib

                secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()
                return secrets.compare_digest(stored_hash, secret_hash)
        except Exception as e:  # pragma: no cover
            logger.error(f"Error verifying client secret: {e!s}")
            return False

    async def get_all_clients(
        self, db: AsyncSession, *, include_inactive: bool = False
    ) -> list[OAuthClient]:
        """Get all OAuth clients."""
        try:
            query = select(OAuthClient).order_by(OAuthClient.created_at.desc())
            if not include_inactive:
                query = query.where(OAuthClient.is_active == True)  # noqa: E712

            result = await db.execute(query)
            return list(result.scalars().all())
        except Exception as e:  # pragma: no cover
            logger.error(f"Error getting all OAuth clients: {e!s}")
            raise

    async def delete_client(self, db: AsyncSession, *, client_id: str) -> bool:
        """Delete an OAuth client permanently."""
        try:
            result = await db.execute(
                delete(OAuthClient).where(OAuthClient.client_id == client_id)
            )
            await db.commit()

            deleted = result.rowcount > 0
            if deleted:
                logger.info(f"OAuth client deleted: {client_id}")
            else:
                logger.warning(f"OAuth client not found for deletion: {client_id}")

            return deleted
        except Exception as e:  # pragma: no cover
            await db.rollback()
            logger.error(f"Error deleting OAuth client {client_id}: {e!s}")
            raise


# Singleton instance
oauth_client_repo = OAuthClientRepository(OAuthClient)
