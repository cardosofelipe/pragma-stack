"""
Pydantic schemas for OAuth authentication.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# OAuth Provider Info (for frontend to display available providers)
# ============================================================================


class OAuthProviderInfo(BaseModel):
    """Information about an available OAuth provider."""

    provider: str = Field(..., description="Provider identifier (google, github)")
    name: str = Field(..., description="Human-readable provider name")
    icon: str | None = Field(None, description="Icon identifier for frontend")


class OAuthProvidersResponse(BaseModel):
    """Response containing list of enabled OAuth providers."""

    enabled: bool = Field(..., description="Whether OAuth is globally enabled")
    providers: list[OAuthProviderInfo] = Field(
        default_factory=list, description="List of enabled providers"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "enabled": True,
                "providers": [
                    {"provider": "google", "name": "Google", "icon": "google"},
                    {"provider": "github", "name": "GitHub", "icon": "github"},
                ],
            }
        }
    )


# ============================================================================
# OAuth Account (linked provider accounts)
# ============================================================================


class OAuthAccountBase(BaseModel):
    """Base schema for OAuth accounts."""

    provider: str = Field(..., max_length=50, description="OAuth provider name")
    provider_email: str | None = Field(
        None, max_length=255, description="Email from OAuth provider"
    )


class OAuthAccountCreate(OAuthAccountBase):
    """Schema for creating an OAuth account link (internal use)."""

    user_id: UUID
    provider_user_id: str = Field(..., max_length=255)
    access_token_encrypted: str | None = None
    refresh_token_encrypted: str | None = None
    token_expires_at: datetime | None = None


class OAuthAccountResponse(OAuthAccountBase):
    """Schema for OAuth account response to clients."""

    id: UUID
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "provider": "google",
                "provider_email": "user@gmail.com",
                "created_at": "2025-11-24T12:00:00Z",
            }
        },
    )


class OAuthAccountsListResponse(BaseModel):
    """Response containing list of linked OAuth accounts."""

    accounts: list[OAuthAccountResponse]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "accounts": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "provider": "google",
                        "provider_email": "user@gmail.com",
                        "created_at": "2025-11-24T12:00:00Z",
                    }
                ]
            }
        }
    )


# ============================================================================
# OAuth Flow (authorization, callback, etc.)
# ============================================================================


class OAuthAuthorizeRequest(BaseModel):
    """Request parameters for OAuth authorization."""

    provider: str = Field(..., description="OAuth provider (google, github)")
    redirect_uri: str | None = Field(
        None, description="Frontend callback URL after OAuth"
    )
    mode: str = Field(
        default="login",
        description="OAuth mode: login, register, or link",
        pattern="^(login|register|link)$",
    )


class OAuthCallbackRequest(BaseModel):
    """Request parameters for OAuth callback."""

    code: str = Field(..., description="Authorization code from provider")
    state: str = Field(..., description="State parameter for CSRF protection")


class OAuthCallbackResponse(BaseModel):
    """Response after successful OAuth authentication."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(..., description="Token expiration in seconds")
    is_new_user: bool = Field(
        default=False, description="Whether a new user was created"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900,
                "is_new_user": False,
            }
        }
    )


class OAuthUnlinkResponse(BaseModel):
    """Response after unlinking an OAuth account."""

    success: bool = Field(..., description="Whether the unlink was successful")
    message: str = Field(..., description="Status message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"success": True, "message": "Google account unlinked"}
        }
    )


# ============================================================================
# OAuth State (CSRF protection - internal use)
# ============================================================================


class OAuthStateCreate(BaseModel):
    """Schema for creating OAuth state (internal use)."""

    state: str = Field(..., max_length=255)
    code_verifier: str | None = Field(None, max_length=128)
    nonce: str | None = Field(None, max_length=255)
    provider: str = Field(..., max_length=50)
    redirect_uri: str | None = Field(None, max_length=500)
    user_id: UUID | None = None
    expires_at: datetime


# ============================================================================
# OAuth Client (Provider Mode - MCP clients)
# ============================================================================


class OAuthClientBase(BaseModel):
    """Base schema for OAuth clients."""

    client_name: str = Field(..., max_length=255, description="Client application name")
    client_description: str | None = Field(
        None, max_length=1000, description="Client description"
    )
    redirect_uris: list[str] = Field(
        default_factory=list, description="Allowed redirect URIs"
    )
    allowed_scopes: list[str] = Field(
        default_factory=list, description="Allowed OAuth scopes"
    )


class OAuthClientCreate(OAuthClientBase):
    """Schema for creating an OAuth client."""

    client_type: str = Field(
        default="public",
        description="Client type: public or confidential",
        pattern="^(public|confidential)$",
    )


class OAuthClientResponse(OAuthClientBase):
    """Schema for OAuth client response."""

    id: UUID
    client_id: str = Field(..., description="OAuth client ID")
    client_type: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "client_id": "abc123def456",
                "client_name": "My MCP App",
                "client_description": "My application that uses MCP",
                "client_type": "public",
                "redirect_uris": ["http://localhost:3000/callback"],
                "allowed_scopes": ["read:users", "write:users"],
                "is_active": True,
                "created_at": "2025-11-24T12:00:00Z",
            }
        },
    )


class OAuthClientWithSecret(OAuthClientResponse):
    """Schema for OAuth client response including secret (only shown once)."""

    client_secret: str | None = Field(
        None, description="Client secret (only shown once for confidential clients)"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "client_id": "abc123def456",
                "client_secret": "secret_xyz789",
                "client_name": "My MCP App",
                "client_type": "confidential",
                "redirect_uris": ["http://localhost:3000/callback"],
                "allowed_scopes": ["read:users"],
                "is_active": True,
                "created_at": "2025-11-24T12:00:00Z",
            }
        },
    )


# ============================================================================
# OAuth Provider Discovery (RFC 8414 - skeleton)
# ============================================================================


class OAuthServerMetadata(BaseModel):
    """OAuth 2.0 Authorization Server Metadata (RFC 8414)."""

    issuer: str = Field(..., description="Authorization server issuer URL")
    authorization_endpoint: str = Field(..., description="Authorization endpoint URL")
    token_endpoint: str = Field(..., description="Token endpoint URL")
    registration_endpoint: str | None = Field(
        None, description="Dynamic client registration endpoint"
    )
    revocation_endpoint: str | None = Field(
        None, description="Token revocation endpoint"
    )
    scopes_supported: list[str] = Field(
        default_factory=list, description="Supported scopes"
    )
    response_types_supported: list[str] = Field(
        default_factory=lambda: ["code"], description="Supported response types"
    )
    grant_types_supported: list[str] = Field(
        default_factory=lambda: ["authorization_code", "refresh_token"],
        description="Supported grant types",
    )
    code_challenge_methods_supported: list[str] = Field(
        default_factory=lambda: ["S256"], description="Supported PKCE methods"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "issuer": "https://api.example.com",
                "authorization_endpoint": "https://api.example.com/oauth/authorize",
                "token_endpoint": "https://api.example.com/oauth/token",
                "scopes_supported": ["openid", "profile", "email", "read:users"],
                "response_types_supported": ["code"],
                "grant_types_supported": ["authorization_code", "refresh_token"],
                "code_challenge_methods_supported": ["S256"],
            }
        }
    )
