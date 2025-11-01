import logging
from datetime import datetime
from typing import Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, status, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.main import api_router
from app.core.config import settings
from app.core.database import check_database_health
from app.core.exceptions import (
    APIException,
    api_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    unhandled_exception_handler
)

scheduler = AsyncIOScheduler()

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

logger.info(f"Starting app!!!")
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Add rate limiter state to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register custom exception handlers (order matters - most specific first)
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Set up CORS middleware with explicit allowed methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # Explicit methods only
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Requested-With",
        "X-Device-Id",  # For session management
    ],  # Explicit headers only
    expose_headers=["Content-Length"],
    max_age=600,  # Cache preflight requests for 10 minutes
)


# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Add security headers to all responses.

    CSP modes (set via CSP_MODE env var):
    - 'strict': Maximum security, blocks most external resources (default for production)
    - 'relaxed': Allows common CDNs and modern frontend features (default for development)
    - 'disabled': No CSP (not recommended, use only for debugging)
    """
    response = await call_next(request)

    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Enforce HTTPS in production
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Content Security Policy
    csp_mode = settings.CSP_MODE.lower()

    # Special handling for API docs
    is_docs = request.url.path in ["/docs", "/redoc"] or \
              request.url.path.startswith("/docs/") or \
              request.url.path.startswith("/redoc/")

    if csp_mode == "disabled":
        # No CSP (only for local development/debugging)
        pass
    elif is_docs:
        # Always allow Swagger UI/ReDoc resources on docs pages
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "frame-ancestors 'none'"
        )
    elif csp_mode == "strict":
        # Maximum security - blocks most external resources
        # Use this in production if you don't need external CDNs
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    else:  # 'relaxed' mode (default)
        # Modern frontend development - allows common CDNs and features
        # Safe for most production apps that use external resources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            # Allow common script sources
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com "
            "https://www.googletagmanager.com https://www.google-analytics.com; "
            # Allow common style sources
            "style-src 'self' 'unsafe-inline' "
            "https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com "
            "https://fonts.googleapis.com; "
            # Allow common font sources
            "font-src 'self' data: "
            "https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            # Allow images from self, data URIs, and common CDNs
            "img-src 'self' data: blob: https:; "
            # Allow API calls to self and common services
            "connect-src 'self' "
            "https://www.google-analytics.com https://analytics.google.com; "
            # Media from self and data URIs
            "media-src 'self' data: blob:; "
            # Prevent framing
            "frame-ancestors 'none'; "
            # Restrict base URI
            "base-uri 'self'; "
            # Restrict form submissions
            "form-action 'self'"
        )

    # Permissions Policy (formerly Feature Policy)
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head>
            <title>App API</title>
        </head>
        <body>
            <h1>Welcome to app API</h1>
            <p>Explore the available endpoints and documentation:</p>
            <a href="/docs">OpenAPI Documentation</a>
        </body>
    </html>
    """


@app.get(
    "/health",
    summary="Health Check",
    description="Check the health status of the API and its dependencies",
    response_description="Health status information",
    tags=["Health"],
    operation_id="health_check"
)
async def health_check() -> JSONResponse:
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        JSONResponse: Health status with the following information:
            - status: Overall health status ("healthy" or "unhealthy")
            - timestamp: Current server timestamp (ISO 8601 format)
            - version: API version
            - environment: Current environment (development, staging, production)
            - database: Database connectivity status
    """
    health_status: Dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {}
    }

    response_status = status.HTTP_200_OK

    # Database health check using dedicated health check function
    try:
        db_healthy = await check_database_health()
        if db_healthy:
            health_status["checks"]["database"] = {
                "status": "healthy",
                "message": "Database connection successful"
            }
        else:
            raise Exception("Database health check returned unhealthy status")
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        response_status = status.HTTP_503_SERVICE_UNAVAILABLE
        logger.error(f"Health check failed - database error: {e}")

    return JSONResponse(
        status_code=response_status,
        content=health_status
    )


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    """
    Application startup event.

    Sets up background jobs and scheduled tasks.
    """
    import os

    # Skip scheduler in test environment
    if os.getenv("IS_TEST", "False") == "True":
        logger.info("Test environment detected - skipping scheduler")
        return

    from app.services.session_cleanup import cleanup_expired_sessions

    # Schedule session cleanup job
    # Runs daily at 2:00 AM server time
    scheduler.add_job(
        cleanup_expired_sessions,
        'cron',
        hour=2,
        minute=0,
        id='cleanup_expired_sessions',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Scheduled jobs started: session cleanup (daily at 2 AM)")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown event.

    Cleans up resources and stops background jobs.
    """
    import os

    if os.getenv("IS_TEST", "False") != "True":
        scheduler.shutdown()
        logger.info("Scheduled jobs stopped")
