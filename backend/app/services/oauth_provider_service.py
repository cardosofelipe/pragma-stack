"""
OAuth Provider Service for MCP integration.

Implements OAuth 2.0 Authorization Server functionality:
- Authorization code flow with PKCE
- Token issuance (JWT access tokens, opaque refresh tokens)
- Token refresh
- Token revocation
- Consent management

Security features:
- PKCE required for public clients (S256)
- Short-lived authorization codes (10 minutes)
- JWT access tokens (self-contained, no DB lookup)
- Secure refresh token storage (hashed)
- Token rotation on refresh
- Comprehensive validation
"""

import base64
import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.oauth_client import OAuthClient
from app.models.user import User
from app.repositories.oauth_authorization_code import oauth_authorization_code_repo
from app.repositories.oauth_client import oauth_client_repo
from app.repositories.oauth_consent import oauth_consent_repo
from app.repositories.oauth_provider_token import oauth_provider_token_repo
from app.repositories.user import user_repo
from app.schemas.oauth import OAuthClientCreate

logger = logging.getLogger(__name__)

# Constants
AUTHORIZATION_CODE_EXPIRY_MINUTES = 10
ACCESS_TOKEN_EXPIRY_MINUTES = 60  # 1 hour for MCP clients
REFRESH_TOKEN_EXPIRY_DAYS = 30


class OAuthProviderError(Exception):
    """Base exception for OAuth provider errors."""

    def __init__(
        self,
        error: str,
        error_description: str | None = None,
        error_uri: str | None = None,
    ):
        self.error = error
        self.error_description = error_description
        self.error_uri = error_uri
        super().__init__(error_description or error)


class InvalidClientError(OAuthProviderError):
    """Client authentication failed."""

    def __init__(self, description: str = "Invalid client credentials"):
        super().__init__("invalid_client", description)


class InvalidGrantError(OAuthProviderError):
    """Invalid authorization grant."""

    def __init__(self, description: str = "Invalid grant"):
        super().__init__("invalid_grant", description)


class InvalidRequestError(OAuthProviderError):
    """Invalid request parameters."""

    def __init__(self, description: str = "Invalid request"):
        super().__init__("invalid_request", description)


class InvalidScopeError(OAuthProviderError):
    """Invalid scope requested."""

    def __init__(self, description: str = "Invalid scope"):
        super().__init__("invalid_scope", description)


class UnauthorizedClientError(OAuthProviderError):
    """Client not authorized for this grant type."""

    def __init__(self, description: str = "Unauthorized client"):
        super().__init__("unauthorized_client", description)


class AccessDeniedError(OAuthProviderError):
    """User denied authorization."""

    def __init__(self, description: str = "Access denied"):
        super().__init__("access_denied", description)


# ============================================================================
# Helper Functions
# ============================================================================


def generate_code() -> str:
    """Generate a cryptographically secure authorization code."""
    return secrets.token_urlsafe(64)


def generate_token() -> str:
    """Generate a cryptographically secure token."""
    return secrets.token_urlsafe(48)


def generate_jti() -> str:
    """Generate a unique JWT ID."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash a token using SHA-256."""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_pkce(code_verifier: str, code_challenge: str, method: str) -> bool:
    """
    Verify PKCE code_verifier against stored code_challenge.

    SECURITY: Only S256 method is supported. The 'plain' method provides
    no security benefit and is explicitly rejected per RFC 7636 Section 4.3.
    """
    if method != "S256":
        # SECURITY: Reject any method other than S256
        # 'plain' method provides no security against code interception attacks
        logger.warning(f"PKCE verification rejected for unsupported method: {method}")
        return False

    # SHA-256 hash, then base64url encode (RFC 7636 Section 4.2)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return secrets.compare_digest(computed, code_challenge)


def parse_scope(scope: str) -> list[str]:
    """Parse space-separated scope string into list."""
    return [s.strip() for s in scope.split() if s.strip()]


def join_scope(scopes: list[str]) -> str:
    """Join scope list into space-separated string."""
    return " ".join(sorted(set(scopes)))


# ============================================================================
# Client Validation
# ============================================================================


async def get_client(db: AsyncSession, client_id: str) -> OAuthClient | None:
    """Get OAuth client by client_id."""
    return await oauth_client_repo.get_by_client_id(db, client_id=client_id)


async def validate_client(
    db: AsyncSession,
    client_id: str,
    client_secret: str | None = None,
    require_secret: bool = False,
) -> OAuthClient:
    """
    Validate OAuth client credentials.

    Args:
        db: Database session
        client_id: Client identifier
        client_secret: Client secret (required for confidential clients)
        require_secret: Whether to require secret validation

    Returns:
        Validated OAuthClient

    Raises:
        InvalidClientError: If client validation fails
    """
    client = await get_client(db, client_id)
    if not client:
        raise InvalidClientError("Unknown client_id")

    # Confidential clients must provide valid secret
    if client.client_type == "confidential" or require_secret:
        if not client_secret:
            raise InvalidClientError("Client secret required")
        if not client.client_secret_hash:
            raise InvalidClientError("Client not configured with secret")

        # SECURITY: Verify secret using bcrypt
        from app.core.auth import verify_password

        stored_hash = str(client.client_secret_hash)

        if not stored_hash.startswith("$2"):
            raise InvalidClientError(
                "Client secret uses deprecated hash format. "
                "Please regenerate your client credentials."
            )

        if not verify_password(client_secret, stored_hash):
            raise InvalidClientError("Invalid client secret")

    return client


def validate_redirect_uri(client: OAuthClient, redirect_uri: str) -> None:
    """
    Validate redirect_uri against client's registered URIs.

    Raises:
        InvalidRequestError: If redirect_uri is not registered
    """
    if not client.redirect_uris:
        raise InvalidRequestError("Client has no registered redirect URIs")

    if redirect_uri not in client.redirect_uris:
        raise InvalidRequestError("Invalid redirect_uri")


def validate_scopes(client: OAuthClient, requested_scopes: list[str]) -> list[str]:
    """
    Validate requested scopes against client's allowed scopes.

    Returns:
        List of valid scopes (intersection of requested and allowed)

    Raises:
        InvalidScopeError: If no valid scopes
    """
    allowed = set(client.allowed_scopes or [])
    requested = set(requested_scopes)

    # If no scopes requested, use all allowed scopes
    if not requested:
        return list(allowed)

    valid = requested & allowed
    if not valid:
        raise InvalidScopeError(
            "None of the requested scopes are allowed for this client"
        )

    # Warn if some scopes were filtered out
    invalid = requested - allowed
    if invalid:
        logger.warning(f"Client {client.client_id} requested invalid scopes: {invalid}")

    return list(valid)


# ============================================================================
# Authorization Code Flow
# ============================================================================


async def create_authorization_code(
    db: AsyncSession,
    client: OAuthClient,
    user: User,
    redirect_uri: str,
    scope: str,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    state: str | None = None,
    nonce: str | None = None,
) -> str:
    """
    Create an authorization code for the authorization code flow.

    Args:
        db: Database session
        client: Validated OAuth client
        user: Authenticated user
        redirect_uri: Validated redirect URI
        scope: Granted scopes (space-separated)
        code_challenge: PKCE code challenge
        code_challenge_method: PKCE method (S256)
        state: CSRF state parameter
        nonce: OpenID Connect nonce

    Returns:
        Authorization code string
    """
    # Public clients MUST use PKCE
    if client.client_type == "public":
        if not code_challenge or code_challenge_method != "S256":
            raise InvalidRequestError("PKCE with S256 is required for public clients")

    code = generate_code()
    expires_at = datetime.now(UTC) + timedelta(
        minutes=AUTHORIZATION_CODE_EXPIRY_MINUTES
    )

    await oauth_authorization_code_repo.create_code(
        db,
        code=code,
        client_id=client.client_id,
        user_id=user.id,
        redirect_uri=redirect_uri,
        scope=scope,
        expires_at=expires_at,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        state=state,
        nonce=nonce,
    )

    logger.info(
        f"Created authorization code for user {user.id} and client {client.client_id}"
    )
    return code


async def exchange_authorization_code(
    db: AsyncSession,
    code: str,
    client_id: str,
    redirect_uri: str,
    code_verifier: str | None = None,
    client_secret: str | None = None,
    device_info: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    """
    Exchange authorization code for tokens.

    Args:
        db: Database session
        code: Authorization code
        client_id: Client identifier
        redirect_uri: Must match the original redirect_uri
        code_verifier: PKCE code verifier
        client_secret: Client secret (for confidential clients)
        device_info: Optional device information
        ip_address: Optional IP address

    Returns:
        Token response dict with access_token, refresh_token, etc.

    Raises:
        InvalidGrantError: If code is invalid, expired, or already used
        InvalidClientError: If client validation fails
    """
    # Atomically mark code as used and fetch it (prevents race condition)
    # RFC 6749 Section 4.1.2: Authorization codes MUST be single-use
    updated_id = await oauth_authorization_code_repo.consume_code_atomically(
        db, code=code
    )

    if not updated_id:
        # Either code doesn't exist or was already used
        # Check if it exists to provide appropriate error
        existing_code = await oauth_authorization_code_repo.get_by_code(db, code=code)

        if existing_code and existing_code.used:
            # Code reuse is a security incident - revoke all tokens for this grant
            logger.warning(
                f"Authorization code reuse detected for client {existing_code.client_id}"
            )
            await revoke_tokens_for_user_client(
                db, UUID(str(existing_code.user_id)), str(existing_code.client_id)
            )
            raise InvalidGrantError("Authorization code has already been used")
        else:
            raise InvalidGrantError("Invalid authorization code")

    # Now fetch the full auth code record
    auth_code = await oauth_authorization_code_repo.get_by_id(db, code_id=updated_id)
    if auth_code is None:
        raise InvalidGrantError("Authorization code not found after consumption")

    if auth_code.is_expired:
        raise InvalidGrantError("Authorization code has expired")

    if auth_code.client_id != client_id:
        raise InvalidGrantError("Authorization code was not issued to this client")

    if auth_code.redirect_uri != redirect_uri:
        raise InvalidGrantError("redirect_uri mismatch")

    # Validate client - ALWAYS require secret for confidential clients
    client = await get_client(db, client_id)
    if not client:
        raise InvalidClientError("Unknown client_id")

    # Confidential clients MUST authenticate (RFC 6749 Section 3.2.1)
    if client.client_type == "confidential":
        if not client_secret:
            raise InvalidClientError("Client secret required for confidential clients")
        client = await validate_client(
            db, client_id, client_secret, require_secret=True
        )
    elif client_secret:
        # Public client provided secret - validate it if given
        client = await validate_client(
            db, client_id, client_secret, require_secret=True
        )

    # Verify PKCE
    if auth_code.code_challenge:
        if not code_verifier:
            raise InvalidGrantError("code_verifier required")
        if not verify_pkce(
            code_verifier,
            str(auth_code.code_challenge),
            str(auth_code.code_challenge_method or "S256"),
        ):
            raise InvalidGrantError("Invalid code_verifier")
    elif client.client_type == "public":
        # Public clients without PKCE - this shouldn't happen if we validated on authorize
        raise InvalidGrantError("PKCE required for public clients")

    # Get user
    user = await user_repo.get(db, id=str(auth_code.user_id))
    if not user or not user.is_active:
        raise InvalidGrantError("User not found or inactive")

    # Generate tokens
    return await create_tokens(
        db=db,
        client=client,
        user=user,
        scope=str(auth_code.scope),
        nonce=str(auth_code.nonce) if auth_code.nonce else None,
        device_info=device_info,
        ip_address=ip_address,
    )


# ============================================================================
# Token Generation
# ============================================================================


async def create_tokens(
    db: AsyncSession,
    client: OAuthClient,
    user: User,
    scope: str,
    nonce: str | None = None,
    device_info: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    """
    Create access and refresh tokens.

    Args:
        db: Database session
        client: OAuth client
        user: User
        scope: Granted scopes
        nonce: OpenID Connect nonce (included in ID token)
        device_info: Optional device information
        ip_address: Optional IP address

    Returns:
        Token response dict
    """
    now = datetime.now(UTC)
    jti = generate_jti()

    # Access token expiry
    access_token_lifetime = int(client.access_token_lifetime or "3600")
    access_expires = now + timedelta(seconds=access_token_lifetime)

    # Refresh token expiry
    refresh_token_lifetime = int(
        client.refresh_token_lifetime or str(REFRESH_TOKEN_EXPIRY_DAYS * 86400)
    )
    refresh_expires = now + timedelta(seconds=refresh_token_lifetime)

    # Create JWT access token
    # SECURITY: Include all standard JWT claims per RFC 7519
    access_token_payload = {
        "iss": settings.OAUTH_ISSUER,
        "sub": str(user.id),
        "aud": client.client_id,
        "exp": int(access_expires.timestamp()),
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),  # Not Before - token is valid immediately
        "jti": jti,
        "scope": scope,
        "client_id": client.client_id,
        # User info (basic claims)
        "email": user.email,
        "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
    }

    # Add nonce for OpenID Connect
    if nonce:
        access_token_payload["nonce"] = nonce

    access_token = jwt.encode(
        access_token_payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    # Create opaque refresh token
    refresh_token = generate_token()
    refresh_token_hash = hash_token(refresh_token)

    # Store refresh token in database
    await oauth_provider_token_repo.create_token(
        db,
        token_hash=refresh_token_hash,
        jti=jti,
        client_id=client.client_id,
        user_id=user.id,
        scope=scope,
        expires_at=refresh_expires,
        device_info=device_info,
        ip_address=ip_address,
    )

    logger.info(f"Issued tokens for user {user.id} to client {client.client_id}")

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": access_token_lifetime,
        "refresh_token": refresh_token,
        "scope": scope,
    }


async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
    client_id: str,
    client_secret: str | None = None,
    scope: str | None = None,
    device_info: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    """
    Refresh access token using refresh token.

    Implements token rotation - old refresh token is invalidated,
    new refresh token is issued.

    Args:
        db: Database session
        refresh_token: Refresh token
        client_id: Client identifier
        client_secret: Client secret (for confidential clients)
        scope: Optional reduced scope
        device_info: Optional device information
        ip_address: Optional IP address

    Returns:
        New token response dict

    Raises:
        InvalidGrantError: If refresh token is invalid
    """
    # Find refresh token
    token_hash = hash_token(refresh_token)
    token_record = await oauth_provider_token_repo.get_by_token_hash(
        db, token_hash=token_hash
    )

    if not token_record:
        raise InvalidGrantError("Invalid refresh token")

    if token_record.revoked:
        # Token reuse after revocation - security incident
        logger.warning(
            f"Revoked refresh token reuse detected for client {token_record.client_id}"
        )
        raise InvalidGrantError("Refresh token has been revoked")

    if token_record.is_expired:
        raise InvalidGrantError("Refresh token has expired")

    if token_record.client_id != client_id:
        raise InvalidGrantError("Refresh token was not issued to this client")

    # Validate client
    client = await validate_client(
        db,
        client_id,
        client_secret,
        require_secret=(client_secret is not None),
    )

    # Get user
    user = await user_repo.get(db, id=str(token_record.user_id))
    if not user or not user.is_active:
        raise InvalidGrantError("User not found or inactive")

    # Validate scope (can only reduce, not expand)
    token_scope = str(token_record.scope) if token_record.scope else ""
    original_scopes = set(parse_scope(token_scope))
    if scope:
        requested_scopes = set(parse_scope(scope))
        if not requested_scopes.issubset(original_scopes):
            raise InvalidScopeError("Cannot expand scope on refresh")
        final_scope = join_scope(list(requested_scopes))
    else:
        final_scope = token_scope

    # Revoke old refresh token (token rotation)
    await oauth_provider_token_repo.revoke(db, token=token_record)

    # Issue new tokens
    device = str(token_record.device_info) if token_record.device_info else None
    ip_addr = str(token_record.ip_address) if token_record.ip_address else None
    return await create_tokens(
        db=db,
        client=client,
        user=user,
        scope=final_scope,
        device_info=device_info or device,
        ip_address=ip_address or ip_addr,
    )


# ============================================================================
# Token Revocation
# ============================================================================


async def revoke_token(
    db: AsyncSession,
    token: str,
    token_type_hint: str | None = None,
    client_id: str | None = None,
    client_secret: str | None = None,
) -> bool:
    """
    Revoke a token (access or refresh).

    For refresh tokens: marks as revoked in database
    For access tokens: we can't truly revoke JWTs, but we can revoke
    the associated refresh token to prevent further refreshes

    Args:
        db: Database session
        token: Token to revoke
        token_type_hint: "access_token" or "refresh_token"
        client_id: Client identifier (for validation)
        client_secret: Client secret (for confidential clients)

    Returns:
        True if token was revoked, False if not found
    """
    # Try as refresh token first (more likely)
    if token_type_hint != "access_token":
        token_hash = hash_token(token)
        refresh_record = await oauth_provider_token_repo.get_by_token_hash(
            db, token_hash=token_hash
        )

        if refresh_record:
            # Validate client if provided
            if client_id and refresh_record.client_id != client_id:
                raise InvalidClientError("Token was not issued to this client")

            await oauth_provider_token_repo.revoke(db, token=refresh_record)
            logger.info(f"Revoked refresh token {refresh_record.jti[:8]}...")
            return True

    # Try as access token (JWT)
    if token_type_hint != "refresh_token":
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={
                    "verify_exp": False,
                    "verify_aud": False,
                },  # Allow expired tokens
            )
            jti = payload.get("jti")
            if jti:
                # Find and revoke the associated refresh token
                refresh_record = await oauth_provider_token_repo.get_by_jti(db, jti=jti)
                if refresh_record:
                    if client_id and refresh_record.client_id != client_id:
                        raise InvalidClientError("Token was not issued to this client")
                    await oauth_provider_token_repo.revoke(db, token=refresh_record)
                    logger.info(
                        f"Revoked refresh token via access token JTI {jti[:8]}..."
                    )
                    return True
        except JWTError:
            pass
        except Exception:  # noqa: S110 - Intentional: invalid JWT not an error
            pass

    return False


async def revoke_tokens_for_user_client(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
) -> int:
    """
    Revoke all tokens for a specific user-client pair.

    Used when security incidents are detected (e.g., code reuse).

    Args:
        db: Database session
        user_id: User identifier
        client_id: Client identifier

    Returns:
        Number of tokens revoked
    """
    count = await oauth_provider_token_repo.revoke_all_for_user_client(
        db, user_id=user_id, client_id=client_id
    )

    if count > 0:
        logger.warning(
            f"Revoked {count} tokens for user {user_id} and client {client_id}"
        )

    return count


async def revoke_all_user_tokens(db: AsyncSession, user_id: UUID) -> int:
    """
    Revoke all OAuth provider tokens for a user.

    Used when user changes password or explicitly logs out everywhere.

    Args:
        db: Database session
        user_id: User identifier

    Returns:
        Number of tokens revoked
    """
    count = await oauth_provider_token_repo.revoke_all_for_user(db, user_id=user_id)

    if count > 0:
        logger.info(f"Revoked {count} OAuth provider tokens for user {user_id}")

    return count


# ============================================================================
# Token Introspection (RFC 7662)
# ============================================================================


async def introspect_token(
    db: AsyncSession,
    token: str,
    token_type_hint: str | None = None,
    client_id: str | None = None,
    client_secret: str | None = None,
) -> dict[str, Any]:
    """
    Introspect a token to determine its validity and metadata.

    Implements RFC 7662 Token Introspection.

    Args:
        db: Database session
        token: Token to introspect
        token_type_hint: "access_token" or "refresh_token"
        client_id: Client requesting introspection
        client_secret: Client secret

    Returns:
        Introspection response dict
    """
    # Validate client if credentials provided
    if client_id:
        await validate_client(db, client_id, client_secret)

    # Try as access token (JWT) first
    if token_type_hint != "refresh_token":
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={
                    "verify_aud": False
                },  # Don't require audience match for introspection
            )

            # Check if associated refresh token is revoked
            jti = payload.get("jti")
            if jti:
                refresh_record = await oauth_provider_token_repo.get_by_jti(db, jti=jti)
                if refresh_record and refresh_record.revoked:
                    return {"active": False}

            return {
                "active": True,
                "scope": payload.get("scope", ""),
                "client_id": payload.get("client_id"),
                "username": payload.get("email"),
                "token_type": "Bearer",
                "exp": payload.get("exp"),
                "iat": payload.get("iat"),
                "sub": payload.get("sub"),
                "aud": payload.get("aud"),
                "iss": payload.get("iss"),
            }
        except ExpiredSignatureError:
            return {"active": False}
        except JWTError:
            pass
        except Exception:  # noqa: S110 - Intentional: invalid JWT falls through to refresh token check
            pass

    # Try as refresh token
    if token_type_hint != "access_token":
        token_hash = hash_token(token)
        refresh_record = await oauth_provider_token_repo.get_by_token_hash(
            db, token_hash=token_hash
        )

        if refresh_record and refresh_record.is_valid:
            return {
                "active": True,
                "scope": refresh_record.scope,
                "client_id": refresh_record.client_id,
                "token_type": "refresh_token",
                "exp": int(refresh_record.expires_at.timestamp()),
                "iat": int(refresh_record.created_at.timestamp()),
                "sub": str(refresh_record.user_id),
            }

    return {"active": False}


# ============================================================================
# Consent Management
# ============================================================================


async def get_consent(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
):
    """Get existing consent record for user-client pair."""
    return await oauth_consent_repo.get_consent(
        db, user_id=user_id, client_id=client_id
    )


async def check_consent(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
    requested_scopes: list[str],
) -> bool:
    """
    Check if user has already consented to the requested scopes.

    Returns True if all requested scopes are already granted.
    """
    consent = await get_consent(db, user_id, client_id)
    if not consent:
        return False
    return consent.has_scopes(requested_scopes)


async def grant_consent(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
    scopes: list[str],
):
    """
    Grant or update consent for a user-client pair.

    If consent already exists, updates the granted scopes.
    """
    return await oauth_consent_repo.grant_consent(
        db, user_id=user_id, client_id=client_id, scopes=scopes
    )


async def revoke_consent(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
) -> bool:
    """
    Revoke consent and all tokens for a user-client pair.

    Returns True if consent was found and revoked.
    """
    # Revoke all tokens first
    await revoke_tokens_for_user_client(db, user_id, client_id)

    # Delete consent record
    return await oauth_consent_repo.revoke_consent(
        db, user_id=user_id, client_id=client_id
    )


# ============================================================================
# Cleanup
# ============================================================================


async def register_client(db: AsyncSession, client_data: OAuthClientCreate) -> tuple:
    """Create a new OAuth client. Returns (client, secret)."""
    return await oauth_client_repo.create_client(db, obj_in=client_data)


async def list_clients(db: AsyncSession) -> list:
    """List all registered OAuth clients."""
    return await oauth_client_repo.get_all_clients(db)


async def delete_client_by_id(db: AsyncSession, client_id: str) -> None:
    """Delete an OAuth client by client_id."""
    await oauth_client_repo.delete_client(db, client_id=client_id)


async def list_user_consents(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Get all OAuth consents for a user with client details."""
    return await oauth_consent_repo.get_user_consents_with_clients(db, user_id=user_id)


async def cleanup_expired_codes(db: AsyncSession) -> int:
    """
    Delete expired authorization codes.

    Should be called periodically (e.g., every hour).

    Returns:
        Number of codes deleted
    """
    return await oauth_authorization_code_repo.cleanup_expired(db)


async def cleanup_expired_tokens(db: AsyncSession) -> int:
    """
    Delete expired and revoked refresh tokens.

    Should be called periodically (e.g., daily).

    Returns:
        Number of tokens deleted
    """
    return await oauth_provider_token_repo.cleanup_expired(db, cutoff_days=7)
