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

from jose import jwt
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.oauth_authorization_code import OAuthAuthorizationCode
from app.models.oauth_client import OAuthClient
from app.models.oauth_provider_token import OAuthConsent, OAuthProviderRefreshToken
from app.models.user import User

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
    """Verify PKCE code_verifier against stored code_challenge."""
    if method == "S256":
        # SHA-256 hash, then base64url encode
        digest = hashlib.sha256(code_verifier.encode()).digest()
        computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        return secrets.compare_digest(computed, code_challenge)
    elif method == "plain":
        # Direct comparison (not recommended, but supported)
        return secrets.compare_digest(code_verifier, code_challenge)
    return False


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
    result = await db.execute(
        select(OAuthClient).where(
            and_(
                OAuthClient.client_id == client_id,
                OAuthClient.is_active == True,  # noqa: E712
            )
        )
    )
    return result.scalar_one_or_none()


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

        # Verify secret using SHA256 hash (consistent with CRUD)
        computed_hash = hashlib.sha256(client_secret.encode()).hexdigest()
        if not secrets.compare_digest(computed_hash, client.client_secret_hash):
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
        logger.warning(
            f"Client {client.client_id} requested invalid scopes: {invalid}"
        )

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

    auth_code = OAuthAuthorizationCode(
        code=code,
        client_id=client.client_id,
        user_id=user.id,
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
    # Get and validate authorization code
    result = await db.execute(
        select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code == code)
    )
    auth_code = result.scalar_one_or_none()

    if not auth_code:
        raise InvalidGrantError("Invalid authorization code")

    if auth_code.used:
        # Code reuse is a security incident - revoke all tokens for this grant
        logger.warning(
            f"Authorization code reuse detected for client {auth_code.client_id}"
        )
        await revoke_tokens_for_user_client(db, auth_code.user_id, auth_code.client_id)
        raise InvalidGrantError("Authorization code has already been used")

    if auth_code.is_expired:
        raise InvalidGrantError("Authorization code has expired")

    if auth_code.client_id != client_id:
        raise InvalidGrantError("Authorization code was not issued to this client")

    if auth_code.redirect_uri != redirect_uri:
        raise InvalidGrantError("redirect_uri mismatch")

    # Validate client
    client = await validate_client(
        db,
        client_id,
        client_secret,
        require_secret=(client_secret is not None),
    )

    # Verify PKCE
    if auth_code.code_challenge:
        if not code_verifier:
            raise InvalidGrantError("code_verifier required")
        if not verify_pkce(
            code_verifier,
            auth_code.code_challenge,
            auth_code.code_challenge_method or "S256",
        ):
            raise InvalidGrantError("Invalid code_verifier")
    elif client.client_type == "public":
        # Public clients without PKCE - this shouldn't happen if we validated on authorize
        raise InvalidGrantError("PKCE required for public clients")

    # Mark code as used (single-use)
    auth_code.used = True
    await db.commit()

    # Get user
    user_result = await db.execute(select(User).where(User.id == auth_code.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise InvalidGrantError("User not found or inactive")

    # Generate tokens
    return await create_tokens(
        db=db,
        client=client,
        user=user,
        scope=auth_code.scope,
        nonce=auth_code.nonce,
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
    refresh_token_lifetime = int(client.refresh_token_lifetime or str(REFRESH_TOKEN_EXPIRY_DAYS * 86400))
    refresh_expires = now + timedelta(seconds=refresh_token_lifetime)

    # Create JWT access token
    access_token_payload = {
        "iss": settings.OAUTH_ISSUER,
        "sub": str(user.id),
        "aud": client.client_id,
        "exp": int(access_expires.timestamp()),
        "iat": int(now.timestamp()),
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
    refresh_token_record = OAuthProviderRefreshToken(
        token_hash=refresh_token_hash,
        jti=jti,
        client_id=client.client_id,
        user_id=user.id,
        scope=scope,
        expires_at=refresh_expires,
        device_info=device_info,
        ip_address=ip_address,
    )
    db.add(refresh_token_record)
    await db.commit()

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
    result = await db.execute(
        select(OAuthProviderRefreshToken).where(
            OAuthProviderRefreshToken.token_hash == token_hash
        )
    )
    token_record = result.scalar_one_or_none()

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
    user_result = await db.execute(
        select(User).where(User.id == token_record.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise InvalidGrantError("User not found or inactive")

    # Validate scope (can only reduce, not expand)
    original_scopes = set(parse_scope(token_record.scope))
    if scope:
        requested_scopes = set(parse_scope(scope))
        if not requested_scopes.issubset(original_scopes):
            raise InvalidScopeError("Cannot expand scope on refresh")
        final_scope = join_scope(list(requested_scopes))
    else:
        final_scope = token_record.scope

    # Revoke old refresh token (token rotation)
    token_record.revoked = True
    token_record.last_used_at = datetime.now(UTC)
    await db.commit()

    # Issue new tokens
    return await create_tokens(
        db=db,
        client=client,
        user=user,
        scope=final_scope,
        device_info=device_info or token_record.device_info,
        ip_address=ip_address or token_record.ip_address,
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
        result = await db.execute(
            select(OAuthProviderRefreshToken).where(
                OAuthProviderRefreshToken.token_hash == token_hash
            )
        )
        refresh_record = result.scalar_one_or_none()

        if refresh_record:
            # Validate client if provided
            if client_id and refresh_record.client_id != client_id:
                raise InvalidClientError("Token was not issued to this client")

            refresh_record.revoked = True
            await db.commit()
            logger.info(f"Revoked refresh token {refresh_record.jti[:8]}...")
            return True

    # Try as access token (JWT)
    if token_type_hint != "refresh_token":
        try:
            from jose.exceptions import JWTError

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False, "verify_aud": False},  # Allow expired tokens
            )
            jti = payload.get("jti")
            if jti:
                # Find and revoke the associated refresh token
                result = await db.execute(
                    select(OAuthProviderRefreshToken).where(
                        OAuthProviderRefreshToken.jti == jti
                    )
                )
                refresh_record = result.scalar_one_or_none()
                if refresh_record:
                    if client_id and refresh_record.client_id != client_id:
                        raise InvalidClientError("Token was not issued to this client")
                    refresh_record.revoked = True
                    await db.commit()
                    logger.info(
                        f"Revoked refresh token via access token JTI {jti[:8]}..."
                    )
                    return True
        except (JWTError, Exception):  # noqa: S110 - Intentional: invalid JWT not an error
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
    result = await db.execute(
        select(OAuthProviderRefreshToken).where(
            and_(
                OAuthProviderRefreshToken.user_id == user_id,
                OAuthProviderRefreshToken.client_id == client_id,
                OAuthProviderRefreshToken.revoked == False,  # noqa: E712
            )
        )
    )
    tokens = result.scalars().all()

    count = 0
    for token in tokens:
        token.revoked = True
        count += 1

    if count > 0:
        await db.commit()
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
    result = await db.execute(
        select(OAuthProviderRefreshToken).where(
            and_(
                OAuthProviderRefreshToken.user_id == user_id,
                OAuthProviderRefreshToken.revoked == False,  # noqa: E712
            )
        )
    )
    tokens = result.scalars().all()

    count = 0
    for token in tokens:
        token.revoked = True
        count += 1

    if count > 0:
        await db.commit()
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
            from jose.exceptions import ExpiredSignatureError, JWTError

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False},  # Don't require audience match for introspection
            )

            # Check if associated refresh token is revoked
            jti = payload.get("jti")
            if jti:
                result = await db.execute(
                    select(OAuthProviderRefreshToken).where(
                        OAuthProviderRefreshToken.jti == jti
                    )
                )
                refresh_record = result.scalar_one_or_none()
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
        except (JWTError, Exception):  # noqa: S110 - Intentional: invalid JWT falls through to refresh token check
            pass

    # Try as refresh token
    if token_type_hint != "access_token":
        token_hash = hash_token(token)
        result = await db.execute(
            select(OAuthProviderRefreshToken).where(
                OAuthProviderRefreshToken.token_hash == token_hash
            )
        )
        refresh_record = result.scalar_one_or_none()

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
) -> OAuthConsent | None:
    """Get existing consent record for user-client pair."""
    result = await db.execute(
        select(OAuthConsent).where(
            and_(
                OAuthConsent.user_id == user_id,
                OAuthConsent.client_id == client_id,
            )
        )
    )
    return result.scalar_one_or_none()


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
) -> OAuthConsent:
    """
    Grant or update consent for a user-client pair.

    If consent already exists, updates the granted scopes.
    """
    consent = await get_consent(db, user_id, client_id)

    if consent:
        # Merge scopes
        existing = set(parse_scope(consent.granted_scopes))
        new_scopes = existing | set(scopes)
        consent.granted_scopes = join_scope(list(new_scopes))
    else:
        consent = OAuthConsent(
            user_id=user_id,
            client_id=client_id,
            granted_scopes=join_scope(scopes),
        )
        db.add(consent)

    await db.commit()
    await db.refresh(consent)
    return consent


async def revoke_consent(
    db: AsyncSession,
    user_id: UUID,
    client_id: str,
) -> bool:
    """
    Revoke consent and all tokens for a user-client pair.

    Returns True if consent was found and revoked.
    """
    # Delete consent record
    result = await db.execute(
        delete(OAuthConsent).where(
            and_(
                OAuthConsent.user_id == user_id,
                OAuthConsent.client_id == client_id,
            )
        )
    )

    # Revoke all tokens
    await revoke_tokens_for_user_client(db, user_id, client_id)

    await db.commit()
    return result.rowcount > 0


# ============================================================================
# Cleanup
# ============================================================================


async def cleanup_expired_codes(db: AsyncSession) -> int:
    """
    Delete expired authorization codes.

    Should be called periodically (e.g., every hour).

    Returns:
        Number of codes deleted
    """
    result = await db.execute(
        delete(OAuthAuthorizationCode).where(
            OAuthAuthorizationCode.expires_at < datetime.now(UTC)
        )
    )
    await db.commit()
    return result.rowcount


async def cleanup_expired_tokens(db: AsyncSession) -> int:
    """
    Delete expired and revoked refresh tokens.

    Should be called periodically (e.g., daily).

    Returns:
        Number of tokens deleted
    """
    # Delete tokens that are both expired AND revoked (or just very old)
    cutoff = datetime.now(UTC) - timedelta(days=7)
    result = await db.execute(
        delete(OAuthProviderRefreshToken).where(
            OAuthProviderRefreshToken.expires_at < cutoff
        )
    )
    await db.commit()
    return result.rowcount
