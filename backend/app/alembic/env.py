import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, engine_from_config, pool, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import OperationalError

# Get the path to the app directory (parent of 'alembic')
app_dir = Path(__file__).resolve().parent.parent
# Add the app directory to Python path
sys.path.append(str(app_dir.parent))

# Import Core modules
from app.core.config import settings

# Import all models to ensure they're registered with SQLAlchemy
from app.models import *

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def include_object(object, name, type_, reflected, compare_to):
    """
    Filter objects for autogenerate.

    Skip comparing functional indexes (like LOWER(column)) and partial indexes
    (with WHERE clauses) as Alembic cannot reliably detect these from models.
    These should be managed manually via dedicated performance migrations.

    Convention: Any index starting with "ix_perf_" is automatically excluded.
    This allows adding new performance indexes without updating this file.
    """
    if type_ == "index" and name:
        # Convention-based: any index prefixed with ix_perf_ is manual
        if name.startswith("ix_perf_"):
            return False
    return True


# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# Override the SQLAlchemy URL with the one from settings
config.set_main_option("sqlalchemy.url", settings.database_url)


def ensure_database_exists(db_url: str) -> None:
    """
    Ensure the target PostgreSQL database exists.
    If connection to the target DB fails because it doesn't exist, connect to the
    default 'postgres' database and create it. Safe to call multiple times.
    """
    try:
        # First, try connecting to the target database
        test_engine = create_engine(db_url, poolclass=pool.NullPool)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        test_engine.dispose()
        return
    except OperationalError:
        # Likely the database does not exist; proceed to create it
        pass

    url = make_url(db_url)
    # Only handle PostgreSQL here
    if url.get_backend_name() != "postgresql":
        return

    target_db = url.database
    if not target_db:
        return

    # Build admin URL pointing to the default 'postgres' database
    admin_url = url.set(database="postgres")

    # CREATE DATABASE cannot run inside a transaction
    admin_engine = create_engine(
        str(admin_url), isolation_level="AUTOCOMMIT", poolclass=pool.NullPool
    )
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": target_db},
            ).scalar()
            if not exists:
                # Quote the database name safely
                dbname_quoted = '"' + target_db.replace('"', '""') + '"'
                conn.execute(text(f"CREATE DATABASE {dbname_quoted}"))
    finally:
        admin_engine.dispose()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Ensure the target database exists (handles first-run cases)
    ensure_database_exists(settings.database_url)

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
