from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    PROJECT_NAME: Optional[str] = "EventSpace"
    VERSION: Optional[str] = "1.0.0"
    API_V1_STR: Optional[str] = "/api/v1"

    # Database configuration
    DATABASE_URL: Optional[str] = None

    # JWT configuration
    SECRET_KEY: Optional[str] = None
    ALGORITHM: Optional[str] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: Optional[int] = 30

    # CORS configuration
    BACKEND_CORS_ORIGINS: Optional[List[str]] = ["http://localhost:3000"]  # Frontend URL

    # Admin user
    FIRST_SUPERUSER_EMAIL: Optional[str] = None
    FIRST_SUPERUSER_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()