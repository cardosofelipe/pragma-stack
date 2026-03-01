# app/init_db.py
"""
Async database initialization script.

Creates the first superuser if configured and doesn't already exist.
"""

import asyncio
import json
import logging
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select, text

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models.organization import Organization
from app.models.user import User
from app.models.user_organization import UserOrganization
from app.repositories.user import user_repo as user_crud
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

    default_password = "AdminPassword123!"
    if settings.DEMO_MODE:
        default_password = "AdminPass1234!"

    superuser_password = settings.FIRST_SUPERUSER_PASSWORD or default_password

    if not settings.FIRST_SUPERUSER_EMAIL or not settings.FIRST_SUPERUSER_PASSWORD:
        logger.warning(
            "First superuser credentials not configured in settings. "
            "Using defaults: %s",
            superuser_email,
        )

    async with SessionLocal() as session:
        try:
            # Check if superuser already exists
            existing_user = await user_crud.get_by_email(session, email=superuser_email)

            if existing_user:
                logger.info("Superuser already exists: %s", existing_user.email)
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

            logger.info("Created first superuser: %s", user.email)

            # Create demo data if in demo mode
            if settings.DEMO_MODE:
                await load_demo_data(session)

            return user

        except Exception as e:
            await session.rollback()
            logger.error("Error initializing database: %s", e)
            raise


def _load_json_file(path: Path):
    with open(path) as f:
        return json.load(f)


async def load_demo_data(session):
    """Load demo data from JSON file."""
    demo_data_path = Path(__file__).parent / "core" / "demo_data.json"
    if not demo_data_path.exists():
        logger.warning("Demo data file not found: %s", demo_data_path)
        return

    try:
        # Use asyncio.to_thread to avoid blocking the event loop
        data = await asyncio.to_thread(_load_json_file, demo_data_path)

        # Create Organizations
        org_map = {}
        for org_data in data.get("organizations", []):
            # Check if org exists
            result = await session.execute(
                text("SELECT * FROM organizations WHERE slug = :slug"),
                {"slug": org_data["slug"]},
            )
            existing_org = result.first()

            if not existing_org:
                org = Organization(
                    name=org_data["name"],
                    slug=org_data["slug"],
                    description=org_data.get("description"),
                    is_active=True,
                )
                session.add(org)
                await session.flush()  # Flush to get ID
                org_map[org.slug] = org
                logger.info("Created demo organization: %s", org.name)
            else:
                # We can't easily get the ORM object from raw SQL result for map without querying again or mapping
                # So let's just query it properly if we need it for relationships
                # But for simplicity in this script, let's just assume we created it or it exists.
                # To properly map for users, we need the ID.
                # Let's use a simpler approach: just try to create, if slug conflict, skip.
                pass

        # Re-query all orgs to build map for users
        result = await session.execute(select(Organization))
        orgs = result.scalars().all()
        org_map = {org.slug: org for org in orgs}

        # Create Users
        for user_data in data.get("users", []):
            existing_user = await user_crud.get_by_email(
                session, email=user_data["email"]
            )
            if not existing_user:
                # Create user
                user_in = UserCreate(
                    email=user_data["email"],
                    password=user_data["password"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    is_superuser=user_data["is_superuser"],
                    is_active=user_data.get("is_active", True),
                )
                user = await user_crud.create(session, obj_in=user_in)

                # Randomize created_at for demo data (last 30 days)
                # This makes the charts look more realistic
                days_ago = random.randint(0, 30)  # noqa: S311
                random_time = datetime.now(UTC) - timedelta(days=days_ago)
                # Add some random hours/minutes variation
                random_time = random_time.replace(
                    hour=random.randint(0, 23),  # noqa: S311
                    minute=random.randint(0, 59),  # noqa: S311
                )

                # Update the timestamp and is_active directly in the database
                # We do this to ensure the values are persisted correctly
                await session.execute(
                    text(
                        "UPDATE users SET created_at = :created_at, is_active = :is_active WHERE id = :user_id"
                    ),
                    {
                        "created_at": random_time,
                        "is_active": user_data.get("is_active", True),
                        "user_id": user.id,
                    },
                )

                logger.info(
                    "Created demo user: %s (created %s days ago, active=%s)",
                    user.email,
                    days_ago,
                    user_data.get("is_active", True),
                )

                # Add to organization if specified
                org_slug = user_data.get("organization_slug")
                role = user_data.get("role")
                if org_slug and org_slug in org_map and role:
                    org = org_map[org_slug]
                    # Check if membership exists (it shouldn't for new user)
                    member = UserOrganization(
                        user_id=user.id, organization_id=org.id, role=role
                    )
                    session.add(member)
                    logger.info("Added %s to %s as %s", user.email, org.name, role)
            else:
                logger.info("Demo user already exists: %s", existing_user.email)

        await session.commit()
        logger.info("Demo data loaded successfully")

    except Exception as e:
        logger.error("Error loading demo data: %s", e)
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
