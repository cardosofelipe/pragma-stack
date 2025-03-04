import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.main import api_router
from app.core.config import settings

scheduler = AsyncIOScheduler()

logger = logging.getLogger(__name__)

logger.info(f"Starting app!!!")
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


app.include_router(api_router, prefix=settings.API_V1_STR)
