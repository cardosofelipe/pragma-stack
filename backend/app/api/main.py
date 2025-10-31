from fastapi import APIRouter

from app.api.routes import auth, users, sessions, admin, organizations

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
