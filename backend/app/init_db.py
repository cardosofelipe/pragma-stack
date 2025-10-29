# app/init_db.py
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.crud.user import user as user_crud
from app.schemas.users import UserCreate
from app.core.database import engine

logger = logging.getLogger(__name__)


def init_db(db: Session) -> Optional[UserCreate]:
    """
    Initialize database with first superuser if settings are configured and user doesn't exist.

    Returns:
        The created or existing superuser, or None if creation fails
    """
    # Use default values if not set in environment variables
    superuser_email = settings.FIRST_SUPERUSER_EMAIL or "admin@example.com"
    superuser_password = settings.FIRST_SUPERUSER_PASSWORD or "admin123"

    if not settings.FIRST_SUPERUSER_EMAIL or not settings.FIRST_SUPERUSER_PASSWORD:
        logger.warning(
            "First superuser credentials not configured in settings. "
            f"Using defaults: {superuser_email}"
        )

    try:
        # Check if superuser already exists
        existing_user = user_crud.get_by_email(db, email=superuser_email)

        if existing_user:
            logger.info(f"Superuser already exists: {existing_user.email}")
            return existing_user

        # Create superuser if doesn't exist
        user_in = UserCreate(
            email=superuser_email,
            password=superuser_password,
            first_name="Admin",
            last_name="User",
            is_superuser=True
        )

        user = user_crud.create(db, obj_in=user_in)
        logger.info(f"Created first superuser: {user.email}")

        return user

    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


if __name__ == "__main__":
    # Configure logging to show info logs
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    with Session(engine) as session:
        try:
            user = init_db(session)
            if user:
                print(f"✓ Database initialized successfully")
                print(f"✓ Superuser: {user.email}")
            else:
                print("✗ Failed to initialize database")
        except Exception as e:
            print(f"✗ Error initializing database: {e}")
            raise
        finally:
            session.close()
