#!/usr/bin/env python
"""
Database migration helper script.
Provides convenient commands for generating and applying Alembic migrations.

Usage:
    # Generate migration (auto-increments revision ID: 0001, 0002, etc.)
    python migrate.py --local generate "Add new field"
    python migrate.py --local auto "Add new field"

    # Apply migrations
    python migrate.py --local apply

    # Show next revision ID
    python migrate.py next

    # Reset after deleting migrations (clears alembic_version table)
    python migrate.py --local reset

    # Override auto-increment with custom revision ID
    python migrate.py --local generate "initial_models" --rev-id custom_id

    # Generate empty migration template without database (no autogenerate)
    python migrate.py generate "Add performance indexes" --offline

    # Inside Docker (without --local flag):
    python migrate.py auto "Add new field"
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

# Ensure the project root is in the Python path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))


def setup_database_url(use_local: bool) -> str:
    """Setup database URL, optionally using localhost for local development."""
    if use_local:
        # Override DATABASE_URL to use localhost instead of Docker hostname
        local_url = os.environ.get(
            "LOCAL_DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/app"
        )
        os.environ["DATABASE_URL"] = local_url
        return local_url

    # Use the configured DATABASE_URL from environment/.env
    from app.core.config import settings
    return settings.database_url


def check_models():
    """Check if all models are properly imported"""
    print("Checking model imports...")

    try:
        # Import all models through the models package
        from app.models import __all__ as all_models
        print(f"Found {len(all_models)} model(s):")
        for model in all_models:
            print(f"  - {model}")
        return True
    except Exception as e:
        print(f"Error checking models: {e}")
        return False


def generate_migration(message, rev_id=None, auto_rev_id=True, offline=False):
    """Generate an Alembic migration with the given message.

    Args:
        message: Migration message
        rev_id: Custom revision ID (overrides auto_rev_id)
        auto_rev_id: If True and rev_id is None, auto-generate sequential ID
        offline: If True, generate empty migration without database (no autogenerate)
    """
    # Auto-generate sequential revision ID if not provided
    if rev_id is None and auto_rev_id:
        rev_id = get_next_rev_id()

    print(f"Generating migration: {message}")
    if rev_id:
        print(f"Using revision ID: {rev_id}")

    if offline:
        # Generate migration file directly without database connection
        return generate_offline_migration(message, rev_id)

    cmd = ["alembic", "revision", "--autogenerate", "-m", message]
    if rev_id:
        cmd.extend(["--rev-id", rev_id])
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.returncode != 0:
        print("Error generating migration:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return False

    # Extract revision ID if possible
    revision = None
    for line in result.stdout.split("\n"):
        if "Generating" in line and "..." in line:
            try:
                # Look for the revision ID, which is typically 12 hex characters
                parts = line.split()
                for part in parts:
                    if len(part) >= 12 and all(c in "0123456789abcdef" for c in part[:12]):
                        revision = part[:12]
                        break
            except Exception as e:
                # If parsing fails, we can still proceed without a detected revision
                print(f"Warning: could not parse revision from line '{line}': {e}")

    if revision:
        print(f"Generated revision: {revision}")
    else:
        print("Generated migration (revision ID not identified)")

    return revision or True


def apply_migration(revision=None):
    """Apply migrations up to the specified revision or head"""
    target = revision or "head"
    print(f"Applying migration(s) to: {target}")

    cmd = ["alembic", "upgrade", target]
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.returncode != 0:
        print("Error applying migration:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return False

    print("Migration(s) applied successfully")
    return True


def show_current():
    """Show current revision"""
    print("Current database revision:")

    cmd = ["alembic", "current"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.returncode != 0:
        print("Error getting current revision:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return False

    return True


def list_migrations():
    """List all migrations and their status"""
    print("Listing migrations:")

    cmd = ["alembic", "history", "--verbose"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.returncode != 0:
        print("Error listing migrations:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return False

    return True


def check_database_connection():
    """Check if database is accessible"""
    from sqlalchemy import create_engine
    from sqlalchemy.exc import SQLAlchemyError

    try:
        # Use DATABASE_URL from environment (set by setup_database_url)
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            from app.core.config import settings
            db_url = settings.database_url

        engine = create_engine(db_url)
        with engine.connect():
            print("✓ Database connection successful!")
        return True
    except SQLAlchemyError as e:
        print(f"✗ Error connecting to database: {e}")
        return False


def get_next_rev_id():
    """Get the next sequential revision ID based on existing migrations."""
    import re

    versions_dir = project_root / "app" / "alembic" / "versions"
    if not versions_dir.exists():
        return "0001"

    # Find all migration files with numeric prefixes
    max_num = 0
    pattern = re.compile(r"^(\d{4})_.*\.py$")

    for f in versions_dir.iterdir():
        if f.is_file() and f.suffix == ".py":
            match = pattern.match(f.name)
            if match:
                num = int(match.group(1))
                max_num = max(max_num, num)

    next_num = max_num + 1
    return f"{next_num:04d}"


def get_current_rev_id():
    """Get the current (latest) revision ID from existing migrations."""
    import re

    versions_dir = project_root / "app" / "alembic" / "versions"
    if not versions_dir.exists():
        return None

    # Find all migration files with numeric prefixes and get the highest
    max_num = 0
    max_rev_id = None
    pattern = re.compile(r"^(\d{4})_.*\.py$")

    for f in versions_dir.iterdir():
        if f.is_file() and f.suffix == ".py":
            match = pattern.match(f.name)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
                    max_rev_id = match.group(1)

    return max_rev_id


def generate_offline_migration(message, rev_id):
    """Generate a migration file without database connection.

    Creates an empty migration template that can be filled in manually.
    Useful for performance indexes or when database is not available.
    """
    from datetime import datetime

    versions_dir = project_root / "app" / "alembic" / "versions"
    versions_dir.mkdir(parents=True, exist_ok=True)

    # Slugify the message for filename
    slug = message.lower().replace(" ", "_").replace("-", "_")
    slug = "".join(c for c in slug if c.isalnum() or c == "_")

    filename = f"{rev_id}_{slug}.py"
    filepath = versions_dir / filename

    # Get the previous revision ID
    down_revision = get_current_rev_id()
    down_rev_str = f'"{down_revision}"' if down_revision else "None"

    # Generate the migration file content
    content = f'''"""{message}

Revision ID: {rev_id}
Revises: {down_revision or ''}
Create Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "{rev_id}"
down_revision: str | None = {down_rev_str}
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # TODO: Add your upgrade operations here
    pass


def downgrade() -> None:
    # TODO: Add your downgrade operations here
    pass
'''

    filepath.write_text(content)
    print(f"Generated offline migration: {filepath}")
    return rev_id


def show_next_rev_id():
    """Show the next sequential revision ID."""
    next_id = get_next_rev_id()
    print(f"Next revision ID: {next_id}")
    print(f"\nUsage:")
    print(f"  python migrate.py --local generate 'your_message' --rev-id {next_id}")
    print(f"  python migrate.py --local auto 'your_message' --rev-id {next_id}")
    return next_id


def reset_alembic_version():
    """Reset the alembic_version table (for fresh start after deleting migrations)."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        from app.core.config import settings
        db_url = settings.database_url

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
            conn.commit()
        print("✓ Alembic version table reset successfully")
        print("  You can now run migrations from scratch")
        return True
    except SQLAlchemyError as e:
        print(f"✗ Error resetting alembic version: {e}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Database migration helper for Generative Models Arena'
    )

    # Global options
    parser.add_argument(
        '--local', '-l',
        action='store_true',
        help='Use localhost instead of Docker hostname (for local development)'
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate a migration')
    generate_parser.add_argument('message', help='Migration message')
    generate_parser.add_argument(
        '--rev-id',
        help='Custom revision ID (e.g., 0001, 0002 for sequential naming)'
    )
    generate_parser.add_argument(
        '--offline',
        action='store_true',
        help='Generate empty migration template without database connection'
    )

    # Apply command
    apply_parser = subparsers.add_parser('apply', help='Apply migrations')
    apply_parser.add_argument('--revision', help='Specific revision to apply to')

    # List command
    subparsers.add_parser('list', help='List migrations')

    # Current command
    subparsers.add_parser('current', help='Show current revision')

    # Check command
    subparsers.add_parser('check', help='Check database connection and models')

    # Next command (show next revision ID)
    subparsers.add_parser('next', help='Show the next sequential revision ID')

    # Reset command (clear alembic_version table)
    subparsers.add_parser(
        'reset',
        help='Reset alembic_version table (use after deleting all migrations)'
    )

    # Auto command (generate and apply)
    auto_parser = subparsers.add_parser('auto', help='Generate and apply migration')
    auto_parser.add_argument('message', help='Migration message')
    auto_parser.add_argument(
        '--rev-id',
        help='Custom revision ID (e.g., 0001, 0002 for sequential naming)'
    )
    auto_parser.add_argument(
        '--offline',
        action='store_true',
        help='Generate empty migration template without database connection'
    )

    args = parser.parse_args()

    # Commands that don't need database connection
    if args.command == 'next':
        show_next_rev_id()
        return

    # Check if offline mode is requested
    offline = getattr(args, 'offline', False)

    # Offline generate doesn't need database or model check
    if args.command == 'generate' and offline:
        generate_migration(args.message, rev_id=args.rev_id, offline=True)
        return

    if args.command == 'auto' and offline:
        generate_migration(args.message, rev_id=args.rev_id, offline=True)
        print("\nOffline migration generated. Apply it later with:")
        print(f"  python migrate.py --local apply")
        return

    # Setup database URL (must be done before importing settings elsewhere)
    db_url = setup_database_url(args.local)
    print(f"Using database URL: {db_url}")

    if args.command == 'generate':
        check_models()
        generate_migration(args.message, rev_id=args.rev_id)

    elif args.command == 'apply':
        apply_migration(args.revision)

    elif args.command == 'list':
        list_migrations()

    elif args.command == 'current':
        show_current()

    elif args.command == 'check':
        check_database_connection()
        check_models()

    elif args.command == 'reset':
        reset_alembic_version()

    elif args.command == 'auto':
        check_models()
        revision = generate_migration(args.message, rev_id=args.rev_id)
        if revision:
            input("\nPress Enter to apply migration or Ctrl+C to abort... ")
            apply_migration()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
