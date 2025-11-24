from fastapi import APIRouter

from app.api.routes import (
    admin,
    auth,
    oauth,
    oauth_provider,
    organizations,
    sessions,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(
    oauth_provider.router, prefix="/oauth", tags=["OAuth Provider"]
)
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["Organizations"]
)
