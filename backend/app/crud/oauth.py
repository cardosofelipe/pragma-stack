"""
Async CRUD operations for OAuth models using SQLAlchemy 2.0 patterns.

Provides operations for:
- OAuthAccount: Managing linked OAuth provider accounts
- OAuthState: CSRF protection state during OAuth flows
- OAuthClient: Registered OAuth clients (provider mode skeleton)
"""

import logging
import secrets
from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.crud.base import CRUDBase
from app.models.oauth_account import OAuthAccount
from app.models.oauth_client import OAuthClient
from app.models.oauth_state import OAuthState
from app.schemas.oauth import OAuthAccountCreate, OAuthClientCreate, OAuthStateCreate

logger = logging.getLogger(__name__)


# ============================================================================
# OAuth Account CRUD
# ============================================================================


class EmptySchema(BaseModel):
    """Placeholder schema for CRUD operations that don't need update schemas."""


class CRUDOAuthAccount(CRUDBase[OAuthAccount, OAuthAccountCreate, EmptySchema]):
    """CRUD operations for OAuth account links."""

    async def get_by_provider_id(
        self,
        db: AsyncSession,
        *,
        provider: str,
        provider_user_id: str,
    ) -> OAuthAccount | None:
        """
        Get OAuth account by provider and provider user ID.

        Args:
            db: Database session
            provider: OAuth provider name (google, github)
            provider_user_id: User ID from the OAuth provider

        Returns:
            OAuthAccount if found, None otherwise
        """
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
        except Exception as e:
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
        """
        Get OAuth account by provider and email.

        Used for auto-linking existing accounts by email.

        Args:
            db: Database session
            provider: OAuth provider name
            email: Email address from the OAuth provider

        Returns:
            OAuthAccount if found, None otherwise
        """
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
        except Exception as e:
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
        """
        Get all OAuth accounts linked to a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of OAuthAccount objects
        """
        try:
            user_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id

            result = await db.execute(
                select(OAuthAccount)
                .where(OAuthAccount.user_id == user_uuid)
                .order_by(OAuthAccount.created_at.desc())
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error getting OAuth accounts for user {user_id}: {e!s}")
            raise

    async def get_user_account_by_provider(
        self,
        db: AsyncSession,
        *,
        user_id: str | UUID,
        provider: str,
    ) -> OAuthAccount | None:
        """
        Get a specific OAuth account for a user and provider.

        Args:
            db: Database session
            user_id: User ID
            provider: OAuth provider name

        Returns:
            OAuthAccount if found, None otherwise
        """
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
        except Exception as e:
            logger.error(
                f"Error getting OAuth account for user {user_id}, provider {provider}: {e!s}"
            )
            raise

    async def create_account(
        self, db: AsyncSession, *, obj_in: OAuthAccountCreate
    ) -> OAuthAccount:
        """
        Create a new OAuth account link.

        Args:
            db: Database session
            obj_in: OAuth account creation data

        Returns:
            Created OAuthAccount

        Raises:
            ValueError: If account already exists or creation fails
        """
        try:
            db_obj = OAuthAccount(
                user_id=obj_in.user_id,
                provider=obj_in.provider,
                provider_user_id=obj_in.provider_user_id,
                provider_email=obj_in.provider_email,
                access_token_encrypted=obj_in.access_token_encrypted,
                refresh_token_encrypted=obj_in.refresh_token_encrypted,
                token_expires_at=obj_in.token_expires_at,
            )
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)

            logger.info(
                f"OAuth account created: {obj_in.provider} linked to user {obj_in.user_id}"
            )
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            if "uq_oauth_provider_user" in error_msg.lower():
                logger.warning(
                    f"OAuth account already exists: {obj_in.provider}:{obj_in.provider_user_id}"
                )
                raise ValueError(
                    f"This {obj_in.provider} account is already linked to another user"
                )
            logger.error(f"Integrity error creating OAuth account: {error_msg}")
            raise ValueError(f"Failed to create OAuth account: {error_msg}")
        except Exception as e:
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
        """
        Delete an OAuth account link.

        Args:
            db: Database session
            user_id: User ID
            provider: OAuth provider name

        Returns:
            True if deleted, False if not found
        """
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
        except Exception as e:
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
        access_token_encrypted: str | None = None,
        refresh_token_encrypted: str | None = None,
        token_expires_at: datetime | None = None,
    ) -> OAuthAccount:
        """
        Update OAuth tokens for an account.

        Args:
            db: Database session
            account: OAuthAccount to update
            access_token_encrypted: New encrypted access token
            refresh_token_encrypted: New encrypted refresh token
            token_expires_at: New token expiration time

        Returns:
            Updated OAuthAccount
        """
        try:
            if access_token_encrypted is not None:
                account.access_token_encrypted = access_token_encrypted
            if refresh_token_encrypted is not None:
                account.refresh_token_encrypted = refresh_token_encrypted
            if token_expires_at is not None:
                account.token_expires_at = token_expires_at

            db.add(account)
            await db.commit()
            await db.refresh(account)

            return account
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating OAuth tokens: {e!s}")
            raise


# ============================================================================
# OAuth State CRUD
# ============================================================================


class CRUDOAuthState(CRUDBase[OAuthState, OAuthStateCreate, EmptySchema]):
    """CRUD operations for OAuth state (CSRF protection)."""

    async def create_state(
        self, db: AsyncSession, *, obj_in: OAuthStateCreate
    ) -> OAuthState:
        """
        Create a new OAuth state for CSRF protection.

        Args:
            db: Database session
            obj_in: OAuth state creation data

        Returns:
            Created OAuthState
        """
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
        except IntegrityError as e:
            await db.rollback()
            # State collision (extremely rare with cryptographic random)
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            logger.error(f"OAuth state collision: {error_msg}")
            raise ValueError("Failed to create OAuth state, please retry")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating OAuth state: {e!s}", exc_info=True)
            raise

    async def get_and_consume_state(
        self, db: AsyncSession, *, state: str
    ) -> OAuthState | None:
        """
        Get and delete OAuth state (consume it).

        This ensures each state can only be used once (replay protection).

        Args:
            db: Database session
            state: State string to look up

        Returns:
            OAuthState if found and valid, None otherwise
        """
        try:
            # Get the state
            result = await db.execute(
                select(OAuthState).where(OAuthState.state == state)
            )
            db_obj = result.scalar_one_or_none()

            if db_obj is None:
                logger.warning(f"OAuth state not found: {state[:8]}...")
                return None

            # Check expiration
            # Handle both timezone-aware and timezone-naive datetimes
            now = datetime.now(UTC)
            expires_at = db_obj.expires_at
            if expires_at.tzinfo is None:
                # SQLite returns naive datetimes, assume UTC
                expires_at = expires_at.replace(tzinfo=UTC)

            if expires_at < now:
                logger.warning(f"OAuth state expired: {state[:8]}...")
                await db.delete(db_obj)
                await db.commit()
                return None

            # Delete it (consume)
            await db.delete(db_obj)
            await db.commit()

            logger.debug(f"OAuth state consumed: {state[:8]}...")
            return db_obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error consuming OAuth state: {e!s}")
            raise

    async def cleanup_expired(self, db: AsyncSession) -> int:
        """
        Clean up expired OAuth states.

        Should be called periodically to remove stale states.

        Args:
            db: Database session

        Returns:
            Number of states deleted
        """
        try:
            now = datetime.now(UTC)

            stmt = delete(OAuthState).where(OAuthState.expires_at < now)
            result = await db.execute(stmt)
            await db.commit()

            count = result.rowcount
            if count > 0:
                logger.info(f"Cleaned up {count} expired OAuth states")

            return count
        except Exception as e:
            await db.rollback()
            logger.error(f"Error cleaning up expired OAuth states: {e!s}")
            raise


# ============================================================================
# OAuth Client CRUD (Provider Mode - Skeleton)
# ============================================================================


class CRUDOAuthClient(CRUDBase[OAuthClient, OAuthClientCreate, EmptySchema]):
    """
    CRUD operations for OAuth clients (provider mode).

    This is a skeleton implementation for MCP client registration.
    Full implementation can be expanded when needed.
    """

    async def get_by_client_id(
        self, db: AsyncSession, *, client_id: str
    ) -> OAuthClient | None:
        """
        Get OAuth client by client_id.

        Args:
            db: Database session
            client_id: OAuth client ID

        Returns:
            OAuthClient if found, None otherwise
        """
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
        except Exception as e:
            logger.error(f"Error getting OAuth client {client_id}: {e!s}")
            raise

    async def create_client(
        self,
        db: AsyncSession,
        *,
        obj_in: OAuthClientCreate,
        owner_user_id: UUID | None = None,
    ) -> tuple[OAuthClient, str | None]:
        """
        Create a new OAuth client.

        Args:
            db: Database session
            obj_in: OAuth client creation data
            owner_user_id: Optional owner user ID

        Returns:
            Tuple of (created OAuthClient, client_secret or None for public clients)
        """
        try:
            # Generate client_id
            client_id = secrets.token_urlsafe(32)

            # Generate client_secret for confidential clients
            client_secret = None
            client_secret_hash = None
            if obj_in.client_type == "confidential":
                client_secret = secrets.token_urlsafe(48)
                # In production, use proper password hashing (bcrypt)
                # For now, we store a hash placeholder
                import hashlib

                client_secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()

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
        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
            logger.error(f"Error creating OAuth client: {error_msg}")
            raise ValueError(f"Failed to create OAuth client: {error_msg}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating OAuth client: {e!s}", exc_info=True)
            raise

    async def deactivate_client(
        self, db: AsyncSession, *, client_id: str
    ) -> OAuthClient | None:
        """
        Deactivate an OAuth client.

        Args:
            db: Database session
            client_id: OAuth client ID

        Returns:
            Deactivated OAuthClient if found, None otherwise
        """
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
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deactivating OAuth client {client_id}: {e!s}")
            raise

    async def validate_redirect_uri(
        self, db: AsyncSession, *, client_id: str, redirect_uri: str
    ) -> bool:
        """
        Validate that a redirect URI is allowed for a client.

        Args:
            db: Database session
            client_id: OAuth client ID
            redirect_uri: Redirect URI to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            client = await self.get_by_client_id(db, client_id=client_id)
            if client is None:
                return False

            return redirect_uri in (client.redirect_uris or [])
        except Exception as e:
            logger.error(f"Error validating redirect URI: {e!s}")
            return False

    async def verify_client_secret(
        self, db: AsyncSession, *, client_id: str, client_secret: str
    ) -> bool:
        """
        Verify client credentials.

        Args:
            db: Database session
            client_id: OAuth client ID
            client_secret: Client secret to verify

        Returns:
            True if valid, False otherwise
        """
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

            # Verify secret
            import hashlib

            secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()
            # Cast to str for type safety with compare_digest
            stored_hash: str = str(client.client_secret_hash)
            return secrets.compare_digest(stored_hash, secret_hash)
        except Exception as e:
            logger.error(f"Error verifying client secret: {e!s}")
            return False


# ============================================================================
# Singleton instances
# ============================================================================

oauth_account = CRUDOAuthAccount(OAuthAccount)
oauth_state = CRUDOAuthState(OAuthState)
oauth_client = CRUDOAuthClient(OAuthClient)
