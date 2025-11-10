# app/init_db.py
"""
Async database initialization script.

Creates the first superuser if configured and doesn't already exist.
"""

import asyncio
import logging

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.crud.user import user as user_crud
from app.models.user import User
from app.schemas.users import UserCreate

logger = logging.getLogger(__name__)


async def init_db() -> User | None:
    """
    Initialize database with first superuser if settings are configured and user doesn't exist.

    Returns:
        The created or existing superuser, or None if creation fails
    """
    # Use default values if not set in environment variables
    superuser_email = settings.FIRST_SUPERUSER_EMAIL or "admin@example.com"
    superuser_password = settings.FIRST_SUPERUSER_PASSWORD or "AdminPassword123!"

    if not settings.FIRST_SUPERUSER_EMAIL or not settings.FIRST_SUPERUSER_PASSWORD:
        logger.warning(
            "First superuser credentials not configured in settings. "
            f"Using defaults: {superuser_email}"
        )

    async with SessionLocal() as session:
        try:
            # Check if superuser already exists
            existing_user = await user_crud.get_by_email(session, email=superuser_email)

            if existing_user:
                logger.info(f"Superuser already exists: {existing_user.email}")
                return existing_user

            # Create superuser if doesn't exist
            user_in = UserCreate(
                email=superuser_email,
                password=superuser_password,
                first_name="Admin",
                last_name="User",
                is_superuser=True,
            )

            user = await user_crud.create(session, obj_in=user_in)
            await session.commit()
            await session.refresh(user)

            logger.info(f"Created first superuser: {user.email}")
            return user

        except Exception as e:
            await session.rollback()
            logger.error(f"Error initializing database: {e}")
            raise


async def main():
    """Main entry point for database initialization."""
    # Configure logging to show info logs
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    try:
        user = await init_db()
        if user:
            print("✓ Database initialized successfully")
            print(f"✓ Superuser: {user.email}")
        else:
            print("✗ Failed to initialize database")
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        raise
    finally:
        # Close the engine
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
