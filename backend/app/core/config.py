from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    PROJECT_NAME: str = "EventSpace"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "app"
    DATABASE_URL: Optional[str] = None
    REFRESH_TOKEN_EXPIRE_DAYS: int = 60
    db_pool_size: int = 20  # Default connection pool size
    db_max_overflow: int = 50  # Maximum overflow connections
    db_pool_timeout: int = 30  # Seconds to wait for a connection
    db_pool_recycle: int = 3600  # Recycle connections after 1 hour

    # SQL debugging (disable in production)
    sql_echo: bool = False  # Log SQL statements
    sql_echo_pool: bool = False  # Log connection pool events
    sql_echo_timing: bool = False  # Log query execution times
    slow_query_threshold: float = 0.5  # Log queries taking longer than this

    @property
    def database_url(self) -> str:
        """
        Get the SQLAlchemy database URL.
        If DATABASE_URL is explicitly set, use that.
        Otherwise, construct from components.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        self.DATABASE_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        return self.DATABASE_URL

    # JWT configuration
    SECRET_KEY: str = "your_secret_key_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 1 day

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Admin user
    FIRST_SUPERUSER_EMAIL: Optional[str] = None
    FIRST_SUPERUSER_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()