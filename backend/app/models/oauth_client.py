"""OAuth client model for OAuth provider mode (MCP clients)."""

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin, UUIDMixin


class OAuthClient(Base, UUIDMixin, TimestampMixin):
    """
    Registered OAuth clients (for OAuth provider mode).

    This model stores third-party applications that can authenticate
    against this API using OAuth 2.0. Used for MCP (Model Context Protocol)
    client authentication and API access.

    NOTE: This is a skeleton implementation. The full OAuth provider
    functionality (authorization endpoint, token endpoint, etc.) can be
    expanded when needed.
    """

    __tablename__ = "oauth_clients"

    # Client credentials
    client_id = Column(String(64), unique=True, nullable=False, index=True)
    client_secret_hash = Column(
        String(255), nullable=True
    )  # NULL for public clients (PKCE)

    # Client metadata
    client_name = Column(String(255), nullable=False)
    client_description = Column(String(1000), nullable=True)

    # Client type: "public" (SPA, mobile) or "confidential" (server-side)
    client_type = Column(String(20), nullable=False, default="public")

    # Allowed redirect URIs (JSON array)
    redirect_uris = Column(JSONB, nullable=False, default=list)

    # Allowed scopes (JSON array of scope names)
    allowed_scopes = Column(JSONB, nullable=False, default=list)

    # Token lifetimes (in seconds)
    access_token_lifetime = Column(String(10), nullable=False, default="3600")  # 1 hour
    refresh_token_lifetime = Column(
        String(10), nullable=False, default="604800"
    )  # 7 days

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Optional: owner user (for user-registered applications)
    owner_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # MCP-specific: URL of the MCP server this client represents
    mcp_server_url = Column(String(2048), nullable=True)

    # Relationship
    owner = relationship("User", backref="owned_oauth_clients")

    def __repr__(self):
        return f"<OAuthClient {self.client_name} ({self.client_id[:8]}...)>"
