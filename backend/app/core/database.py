# app/core/database.py
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# SQLite compatibility for testing
@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, 'sqlite')
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"

# Declarative base for models
Base = declarative_base()

# Create engine with optimized settings for PostgreSQL
def create_production_engine():
    return create_engine(
        settings.database_url,
        # Connection pool settings
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
        # Query execution settings
        connect_args={
            "application_name": "eventspace",
            "keepalives": 1,
            "keepalives_idle": 60,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "options": "-c timezone=UTC",
        },
        isolation_level="READ COMMITTED",
        echo=settings.sql_echo,
        echo_pool=settings.sql_echo_pool,
    )

# Default production engine and session factory
engine = create_production_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()