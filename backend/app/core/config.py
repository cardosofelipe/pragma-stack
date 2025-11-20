import logging

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "PragmaStack"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment (must be before SECRET_KEY for validation)
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, or production",
    )

    # Security: Content Security Policy
    # Set to False to disable CSP entirely (not recommended)
    # Set to True for strict CSP (blocks most external resources)
    # Set to "relaxed" for modern frontend development
    CSP_MODE: str = Field(
        default="relaxed", description="CSP mode: 'strict', 'relaxed', or 'disabled'"
    )

    # Database configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "app"
    DATABASE_URL: str | None = None
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
    SECRET_KEY: str = Field(
        default="dev_only_insecure_key_change_in_production_32chars_min",
        min_length=32,
        description="JWT signing key. MUST be changed in production. Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes (production standard)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days

    # CORS configuration
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Frontend URL for email links
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="Frontend application URL for email links",
    )

    # Admin user
    FIRST_SUPERUSER_EMAIL: str | None = Field(
        default=None, description="Email for first superuser account"
    )
    FIRST_SUPERUSER_PASSWORD: str | None = Field(
        default=None, description="Password for first superuser (min 12 characters)"
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Validate SECRET_KEY is secure, especially in production."""
        # Get environment from values if available
        values_data = info.data if info.data else {}
        env = values_data.get("ENVIRONMENT", "development")

        if v.startswith("your_secret_key_here"):
            if env == "production":
                raise ValueError(
                    "SECRET_KEY must be set to a secure random value in production. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )
            # Warn in development but allow
            logger = logging.getLogger(__name__)
            logger.warning(
                "⚠️  Using default SECRET_KEY. This is ONLY acceptable in development. "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )

        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long for security"
            )

        return v

    @field_validator("FIRST_SUPERUSER_PASSWORD")
    @classmethod
    def validate_superuser_password(cls, v: str | None) -> str | None:
        """Validate superuser password strength."""
        if v is None:
            return v

        if len(v) < 12:
            raise ValueError("FIRST_SUPERUSER_PASSWORD must be at least 12 characters")

        # Check for common weak passwords
        weak_passwords = {
            "admin123",
            "Admin123",
            "password123",
            "Password123",
            "123456789012",
        }
        if v in weak_passwords:
            raise ValueError(
                "FIRST_SUPERUSER_PASSWORD is too weak. "
                "Use a strong, unique password with mixed case, numbers, and symbols."
            )

        # Basic strength check
        has_lower = any(c.islower() for c in v)
        has_upper = any(c.isupper() for c in v)
        has_digit = any(c.isdigit() for c in v)

        if not (has_lower and has_upper and has_digit):
            raise ValueError(
                "FIRST_SUPERUSER_PASSWORD must contain lowercase, uppercase, and digits"
            )

        return v

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",  # Ignore extra fields from .env (e.g., frontend-specific vars)
    }


settings = Settings()
