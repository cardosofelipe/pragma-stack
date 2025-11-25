# app/api/routes/oauth_provider.py
"""
OAuth Provider routes (Authorization Server mode) for MCP integration.

Implements OAuth 2.0 Authorization Server endpoints:
- GET /.well-known/oauth-authorization-server - Server metadata (RFC 8414)
- GET /oauth/provider/authorize - Authorization endpoint
- POST /oauth/provider/token - Token endpoint
- POST /oauth/provider/revoke - Token revocation (RFC 7009)
- POST /oauth/provider/introspect - Token introspection (RFC 7662)
- Client management endpoints

Security features:
- PKCE required for public clients (S256)
- CSRF protection via state parameter
- Secure token handling
- Rate limiting on sensitive endpoints
"""

import logging
from typing import Any
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_active_user, get_current_superuser
from app.core.config import settings
from app.core.database import get_db
from app.crud import oauth_client as oauth_client_crud
from app.models.user import User
from app.schemas.oauth import (
    OAuthClientCreate,
    OAuthClientResponse,
    OAuthServerMetadata,
    OAuthTokenIntrospectionResponse,
    OAuthTokenResponse,
)
from app.services import oauth_provider_service as provider_service

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


def require_provider_enabled():
    """Dependency to check if OAuth provider mode is enabled."""
    if not settings.OAUTH_PROVIDER_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth provider mode is not enabled. Set OAUTH_PROVIDER_ENABLED=true",
        )


# ============================================================================
# Server Metadata (RFC 8414)
# ============================================================================


@router.get(
    "/.well-known/oauth-authorization-server",
    response_model=OAuthServerMetadata,
    summary="OAuth Server Metadata",
    description="""
    OAuth 2.0 Authorization Server Metadata (RFC 8414).

    Returns server metadata including supported endpoints, scopes,
    and capabilities. MCP clients use this to discover the server.
    """,
    operation_id="get_oauth_server_metadata",
    tags=["OAuth Provider"],
)
async def get_server_metadata(
    _: None = Depends(require_provider_enabled),
) -> OAuthServerMetadata:
    """Get OAuth 2.0 server metadata."""
    base_url = settings.OAUTH_ISSUER.rstrip("/")

    return OAuthServerMetadata(
        issuer=base_url,
        authorization_endpoint=f"{base_url}/api/v1/oauth/provider/authorize",
        token_endpoint=f"{base_url}/api/v1/oauth/provider/token",
        revocation_endpoint=f"{base_url}/api/v1/oauth/provider/revoke",
        introspection_endpoint=f"{base_url}/api/v1/oauth/provider/introspect",
        registration_endpoint=None,  # Dynamic registration not supported
        scopes_supported=[
            "openid",
            "profile",
            "email",
            "read:users",
            "write:users",
            "read:organizations",
            "write:organizations",
            "admin",
        ],
        response_types_supported=["code"],
        grant_types_supported=["authorization_code", "refresh_token"],
        code_challenge_methods_supported=["S256"],
        token_endpoint_auth_methods_supported=[
            "client_secret_basic",
            "client_secret_post",
            "none",  # For public clients with PKCE
        ],
    )


# ============================================================================
# Authorization Endpoint
# ============================================================================


@router.get(
    "/provider/authorize",
    summary="Authorization Endpoint",
    description="""
    OAuth 2.0 Authorization Endpoint.

    Initiates the authorization code flow:
    1. Validates client and parameters
    2. Checks if user is authenticated (redirects to login if not)
    3. Checks existing consent
    4. Redirects to consent page if needed
    5. Issues authorization code and redirects back to client

    Required parameters:
    - response_type: Must be "code"
    - client_id: Registered client ID
    - redirect_uri: Must match registered URI

    Recommended parameters:
    - state: CSRF protection
    - code_challenge + code_challenge_method: PKCE (required for public clients)
    - scope: Requested permissions
    """,
    operation_id="oauth_provider_authorize",
    tags=["OAuth Provider"],
)
@limiter.limit("30/minute")
async def authorize(
    request: Request,
    response_type: str = Query(..., description="Must be 'code'"),
    client_id: str = Query(..., description="OAuth client ID"),
    redirect_uri: str = Query(..., description="Redirect URI"),
    scope: str = Query(default="", description="Requested scopes (space-separated)"),
    state: str = Query(default="", description="CSRF state parameter"),
    code_challenge: str | None = Query(default=None, description="PKCE code challenge"),
    code_challenge_method: str | None = Query(
        default=None, description="PKCE method (S256)"
    ),
    nonce: str | None = Query(default=None, description="OpenID Connect nonce"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User | None = Depends(get_current_active_user),
) -> Any:
    """
    Authorization endpoint - initiates OAuth flow.

    If user is not authenticated, redirects to login with return URL.
    If user has not consented, redirects to consent page.
    If all checks pass, generates code and redirects to client.
    """
    # Validate response_type
    if response_type != "code":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_request: response_type must be 'code'",
        )

    # Validate PKCE method if provided - ONLY S256 is allowed (RFC 7636 Section 4.3)
    # "plain" method provides no security benefit and MUST NOT be used
    if code_challenge_method and code_challenge_method != "S256":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_request: code_challenge_method must be 'S256' (plain is not supported)",
        )

    # Validate client
    try:
        client = await provider_service.get_client(db, client_id)
        if not client:
            raise provider_service.InvalidClientError("Unknown client_id")
        provider_service.validate_redirect_uri(client, redirect_uri)
    except provider_service.OAuthProviderError as e:
        # For client/redirect errors, we can't safely redirect - show error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{e.error}: {e.error_description}",
        )

    # Validate and filter scopes
    try:
        requested_scopes = provider_service.parse_scope(scope)
        valid_scopes = provider_service.validate_scopes(client, requested_scopes)
    except provider_service.InvalidScopeError as e:
        # Redirect with error
        error_params = {
            "error": e.error,
            "error_description": e.error_description,
        }
        if state:
            error_params["state"] = state
        return RedirectResponse(
            url=f"{redirect_uri}?{urlencode(error_params)}",
            status_code=status.HTTP_302_FOUND,
        )

    # Public clients MUST use PKCE
    if client.client_type == "public":
        if not code_challenge or code_challenge_method != "S256":
            error_params = {
                "error": "invalid_request",
                "error_description": "PKCE with S256 is required for public clients",
            }
            if state:
                error_params["state"] = state
            return RedirectResponse(
                url=f"{redirect_uri}?{urlencode(error_params)}",
                status_code=status.HTTP_302_FOUND,
            )

    # If user is not authenticated, redirect to login
    if not current_user:
        # Store authorization request in session and redirect to login
        # The frontend will handle the return URL
        login_url = f"{settings.FRONTEND_URL}/login"
        return_params = urlencode({
            "oauth_authorize": "true",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(valid_scopes),
            "state": state,
            "code_challenge": code_challenge or "",
            "code_challenge_method": code_challenge_method or "",
            "nonce": nonce or "",
        })
        return RedirectResponse(
            url=f"{login_url}?return_to=/auth/consent?{return_params}",
            status_code=status.HTTP_302_FOUND,
        )

    # Check if user has already consented
    has_consent = await provider_service.check_consent(
        db, current_user.id, client_id, valid_scopes
    )

    if not has_consent:
        # Redirect to consent page
        consent_params = urlencode({
            "client_id": client_id,
            "client_name": client.client_name,
            "redirect_uri": redirect_uri,
            "scope": " ".join(valid_scopes),
            "state": state,
            "code_challenge": code_challenge or "",
            "code_challenge_method": code_challenge_method or "",
            "nonce": nonce or "",
        })
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/consent?{consent_params}",
            status_code=status.HTTP_302_FOUND,
        )

    # User is authenticated and has consented - issue authorization code
    try:
        code = await provider_service.create_authorization_code(
            db=db,
            client=client,
            user=current_user,
            redirect_uri=redirect_uri,
            scope=" ".join(valid_scopes),
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            state=state,
            nonce=nonce,
        )
    except provider_service.OAuthProviderError as e:
        error_params = {
            "error": e.error,
            "error_description": e.error_description,
        }
        if state:
            error_params["state"] = state
        return RedirectResponse(
            url=f"{redirect_uri}?{urlencode(error_params)}",
            status_code=status.HTTP_302_FOUND,
        )

    # Success - redirect with code
    success_params = {"code": code}
    if state:
        success_params["state"] = state

    return RedirectResponse(
        url=f"{redirect_uri}?{urlencode(success_params)}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post(
    "/provider/authorize/consent",
    summary="Submit Authorization Consent",
    description="""
    Submit user consent for OAuth authorization.

    Called by the consent page after user approves or denies.
    """,
    operation_id="oauth_provider_consent",
    tags=["OAuth Provider"],
)
@limiter.limit("30/minute")
async def submit_consent(
    request: Request,
    approved: bool = Form(..., description="Whether user approved"),
    client_id: str = Form(..., description="OAuth client ID"),
    redirect_uri: str = Form(..., description="Redirect URI"),
    scope: str = Form(default="", description="Granted scopes"),
    state: str = Form(default="", description="CSRF state parameter"),
    code_challenge: str | None = Form(default=None),
    code_challenge_method: str | None = Form(default=None),
    nonce: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Process consent form submission."""
    # Validate client
    try:
        client = await provider_service.get_client(db, client_id)
        if not client:
            raise provider_service.InvalidClientError("Unknown client_id")
        provider_service.validate_redirect_uri(client, redirect_uri)
    except provider_service.OAuthProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{e.error}: {e.error_description}",
        )

    # If user denied, redirect with error
    if not approved:
        error_params = {
            "error": "access_denied",
            "error_description": "User denied authorization",
        }
        if state:
            error_params["state"] = state
        return RedirectResponse(
            url=f"{redirect_uri}?{urlencode(error_params)}",
            status_code=status.HTTP_302_FOUND,
        )

    # Parse and validate scopes
    granted_scopes = provider_service.parse_scope(scope)
    valid_scopes = provider_service.validate_scopes(client, granted_scopes)

    # Record consent
    await provider_service.grant_consent(
        db, current_user.id, client_id, valid_scopes
    )

    # Generate authorization code
    try:
        code = await provider_service.create_authorization_code(
            db=db,
            client=client,
            user=current_user,
            redirect_uri=redirect_uri,
            scope=" ".join(valid_scopes),
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            state=state,
            nonce=nonce,
        )
    except provider_service.OAuthProviderError as e:
        error_params = {
            "error": e.error,
            "error_description": e.error_description,
        }
        if state:
            error_params["state"] = state
        return RedirectResponse(
            url=f"{redirect_uri}?{urlencode(error_params)}",
            status_code=status.HTTP_302_FOUND,
        )

    # Success
    success_params = {"code": code}
    if state:
        success_params["state"] = state

    return RedirectResponse(
        url=f"{redirect_uri}?{urlencode(success_params)}",
        status_code=status.HTTP_302_FOUND,
    )


# ============================================================================
# Token Endpoint
# ============================================================================


@router.post(
    "/provider/token",
    response_model=OAuthTokenResponse,
    summary="Token Endpoint",
    description="""
    OAuth 2.0 Token Endpoint.

    Supports:
    - authorization_code: Exchange code for tokens
    - refresh_token: Refresh access token

    Client authentication:
    - Confidential clients: client_secret (Basic auth or POST body)
    - Public clients: No secret, but PKCE code_verifier required
    """,
    operation_id="oauth_provider_token",
    tags=["OAuth Provider"],
)
@limiter.limit("60/minute")
async def token(
    request: Request,
    grant_type: str = Form(..., description="Grant type"),
    code: str | None = Form(default=None, description="Authorization code"),
    redirect_uri: str | None = Form(default=None, description="Redirect URI"),
    client_id: str | None = Form(default=None, description="Client ID"),
    client_secret: str | None = Form(default=None, description="Client secret"),
    code_verifier: str | None = Form(default=None, description="PKCE code verifier"),
    refresh_token: str | None = Form(default=None, description="Refresh token"),
    scope: str | None = Form(default=None, description="Scope (for refresh)"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
) -> OAuthTokenResponse:
    """Token endpoint - exchange code for tokens or refresh."""
    # Extract client credentials from Basic auth if not in body
    if not client_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Basic "):
            import base64
            try:
                decoded = base64.b64decode(auth_header[6:]).decode()
                client_id, client_secret = decoded.split(":", 1)
            except Exception as e:
                # Log malformed Basic auth for security monitoring
                logger.warning(
                    f"Malformed Basic auth header in token request: {type(e).__name__}"
                )
                # Fall back to form body

    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client: client_id required",
            headers={"WWW-Authenticate": "Basic"},
        )

    # Get device info
    device_info = request.headers.get("User-Agent", "")[:500]
    ip_address = get_remote_address(request)

    try:
        if grant_type == "authorization_code":
            if not code:
                raise provider_service.InvalidRequestError("code required")
            if not redirect_uri:
                raise provider_service.InvalidRequestError("redirect_uri required")

            result = await provider_service.exchange_authorization_code(
                db=db,
                code=code,
                client_id=client_id,
                redirect_uri=redirect_uri,
                code_verifier=code_verifier,
                client_secret=client_secret,
                device_info=device_info,
                ip_address=ip_address,
            )

        elif grant_type == "refresh_token":
            if not refresh_token:
                raise provider_service.InvalidRequestError("refresh_token required")

            result = await provider_service.refresh_tokens(
                db=db,
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
                scope=scope,
                device_info=device_info,
                ip_address=ip_address,
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="unsupported_grant_type: Must be authorization_code or refresh_token",
            )

        return OAuthTokenResponse(**result)

    except provider_service.InvalidClientError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"{e.error}: {e.error_description}",
            headers={"WWW-Authenticate": "Basic"},
        )
    except provider_service.OAuthProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{e.error}: {e.error_description}",
        )


# ============================================================================
# Token Revocation (RFC 7009)
# ============================================================================


@router.post(
    "/provider/revoke",
    status_code=status.HTTP_200_OK,
    summary="Token Revocation Endpoint",
    description="""
    OAuth 2.0 Token Revocation Endpoint (RFC 7009).

    Revokes an access token or refresh token.
    Always returns 200 OK (even if token is invalid) per spec.
    """,
    operation_id="oauth_provider_revoke",
    tags=["OAuth Provider"],
)
@limiter.limit("30/minute")
async def revoke(
    request: Request,
    token: str = Form(..., description="Token to revoke"),
    token_type_hint: str | None = Form(
        default=None, description="Token type hint (access_token, refresh_token)"
    ),
    client_id: str | None = Form(default=None, description="Client ID"),
    client_secret: str | None = Form(default=None, description="Client secret"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
) -> dict[str, str]:
    """Revoke a token."""
    # Extract client credentials from Basic auth if not in body
    if not client_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Basic "):
            import base64
            try:
                decoded = base64.b64decode(auth_header[6:]).decode()
                client_id, client_secret = decoded.split(":", 1)
            except Exception as e:
                # Log malformed Basic auth for security monitoring
                logger.warning(
                    f"Malformed Basic auth header in revoke request: {type(e).__name__}"
                )
                # Fall back to form body

    try:
        await provider_service.revoke_token(
            db=db,
            token=token,
            token_type_hint=token_type_hint,
            client_id=client_id,
            client_secret=client_secret,
        )
    except provider_service.InvalidClientError:
        # Per RFC 7009, we should return 200 OK even for errors
        # But client authentication errors can return 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client",
            headers={"WWW-Authenticate": "Basic"},
        )
    except Exception as e:
        # Log but don't expose errors per RFC 7009
        logger.warning(f"Token revocation error: {e}")

    # Always return 200 OK per RFC 7009
    return {"status": "ok"}


# ============================================================================
# Token Introspection (RFC 7662)
# ============================================================================


@router.post(
    "/provider/introspect",
    response_model=OAuthTokenIntrospectionResponse,
    summary="Token Introspection Endpoint",
    description="""
    OAuth 2.0 Token Introspection Endpoint (RFC 7662).

    Allows resource servers to query the authorization server
    to determine the active state and metadata of a token.
    """,
    operation_id="oauth_provider_introspect",
    tags=["OAuth Provider"],
)
@limiter.limit("120/minute")
async def introspect(
    request: Request,
    token: str = Form(..., description="Token to introspect"),
    token_type_hint: str | None = Form(
        default=None, description="Token type hint (access_token, refresh_token)"
    ),
    client_id: str | None = Form(default=None, description="Client ID"),
    client_secret: str | None = Form(default=None, description="Client secret"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
) -> OAuthTokenIntrospectionResponse:
    """Introspect a token."""
    # Extract client credentials from Basic auth if not in body
    if not client_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Basic "):
            import base64
            try:
                decoded = base64.b64decode(auth_header[6:]).decode()
                client_id, client_secret = decoded.split(":", 1)
            except Exception as e:
                # Log malformed Basic auth for security monitoring
                logger.warning(
                    f"Malformed Basic auth header in introspect request: {type(e).__name__}"
                )
                # Fall back to form body

    try:
        result = await provider_service.introspect_token(
            db=db,
            token=token,
            token_type_hint=token_type_hint,
            client_id=client_id,
            client_secret=client_secret,
        )
        return OAuthTokenIntrospectionResponse(**result)
    except provider_service.InvalidClientError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client",
            headers={"WWW-Authenticate": "Basic"},
        )
    except Exception as e:
        logger.warning(f"Token introspection error: {e}")
        return OAuthTokenIntrospectionResponse(active=False)


# ============================================================================
# Client Management (Admin)
# ============================================================================


@router.post(
    "/provider/clients",
    response_model=dict,
    summary="Register OAuth Client",
    description="""
    Register a new OAuth client (admin only).

    Creates an MCP client that can authenticate against this API.
    Returns client_id and client_secret (for confidential clients).

    **Important:** Store the client_secret securely - it won't be shown again!
    """,
    operation_id="register_oauth_client",
    tags=["OAuth Provider Admin"],
)
async def register_client(
    client_name: str = Form(..., description="Client application name"),
    redirect_uris: str = Form(..., description="Comma-separated redirect URIs"),
    client_type: str = Form(default="public", description="public or confidential"),
    scopes: str = Form(
        default="openid profile email",
        description="Allowed scopes (space-separated)",
    ),
    mcp_server_url: str | None = Form(default=None, description="MCP server URL"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_superuser),
) -> dict:
    """Register a new OAuth client."""
    # Parse redirect URIs
    uris = [uri.strip() for uri in redirect_uris.split(",") if uri.strip()]
    if not uris:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one redirect_uri is required",
        )

    # Parse scopes
    allowed_scopes = [s.strip() for s in scopes.split() if s.strip()]

    client_data = OAuthClientCreate(
        client_name=client_name,
        client_description=None,
        redirect_uris=uris,
        allowed_scopes=allowed_scopes,
        client_type=client_type,
    )

    client, secret = await oauth_client_crud.create_client(db, obj_in=client_data)

    # Update MCP server URL if provided
    if mcp_server_url:
        client.mcp_server_url = mcp_server_url
        await db.commit()

    result = {
        "client_id": client.client_id,
        "client_name": client.client_name,
        "client_type": client.client_type,
        "redirect_uris": client.redirect_uris,
        "allowed_scopes": client.allowed_scopes,
    }

    if secret:
        result["client_secret"] = secret
        result["warning"] = (
            "Store the client_secret securely! It will not be shown again."
        )

    return result


@router.get(
    "/provider/clients",
    response_model=list[OAuthClientResponse],
    summary="List OAuth Clients",
    description="List all registered OAuth clients (admin only).",
    operation_id="list_oauth_clients",
    tags=["OAuth Provider Admin"],
)
async def list_clients(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_superuser),
) -> list[OAuthClientResponse]:
    """List all OAuth clients."""
    clients = await oauth_client_crud.get_all_clients(db)
    return [OAuthClientResponse.model_validate(c) for c in clients]


@router.delete(
    "/provider/clients/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete OAuth Client",
    description="Delete an OAuth client (admin only). Revokes all tokens.",
    operation_id="delete_oauth_client",
    tags=["OAuth Provider Admin"],
)
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete an OAuth client."""
    client = await provider_service.get_client(db, client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    await oauth_client_crud.delete_client(db, client_id=client_id)


# ============================================================================
# User Consent Management
# ============================================================================


@router.get(
    "/provider/consents",
    summary="List My Consents",
    description="List OAuth applications the current user has authorized.",
    operation_id="list_my_oauth_consents",
    tags=["OAuth Provider"],
)
async def list_my_consents(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_active_user),
) -> list[dict]:
    """List applications the user has authorized."""
    from sqlalchemy import select

    from app.models.oauth_client import OAuthClient
    from app.models.oauth_provider_token import OAuthConsent

    result = await db.execute(
        select(OAuthConsent, OAuthClient)
        .join(OAuthClient, OAuthConsent.client_id == OAuthClient.client_id)
        .where(OAuthConsent.user_id == current_user.id)
    )
    rows = result.all()

    return [
        {
            "client_id": consent.client_id,
            "client_name": client.client_name,
            "client_description": client.client_description,
            "granted_scopes": consent.granted_scopes.split() if consent.granted_scopes else [],
            "granted_at": consent.created_at.isoformat(),
        }
        for consent, client in rows
    ]


@router.delete(
    "/provider/consents/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke My Consent",
    description="Revoke authorization for an OAuth application. Also revokes all tokens.",
    operation_id="revoke_my_oauth_consent",
    tags=["OAuth Provider"],
)
async def revoke_my_consent(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_provider_enabled),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Revoke consent for an application."""
    revoked = await provider_service.revoke_consent(db, current_user.id, client_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No consent found for this client",
        )
