#!/usr/bin/env python
"""
Database migration helper script.
Provides convenient commands for generating and applying Alembic migrations.
"""
import argparse
import subprocess
import sys
from pathlib import Path

# Ensure the project root is in the Python path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

try:
    # Import settings to check if configuration is working
    from app.core.config import settings

    print(f"Using database URL: {settings.database_url}")
except ImportError as e:
    print(f"Error importing settings: {e}")
    print("Make sure your Python path includes the project root.")
    sys.exit(1)


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


def generate_migration(message):
    """Generate an Alembic migration with the given message"""
    print(f"Generating migration: {message}")

    cmd = ["alembic", "revision", "--autogenerate", "-m", message]
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
            except Exception:
                pass

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
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            print("✓ Database connection successful!")
        return True
    except SQLAlchemyError as e:
        print(f"✗ Error connecting to database: {e}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Database migration helper for FastNext template'
    )
    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate a migration')
    generate_parser.add_argument('message', help='Migration message')

    # Apply command
    apply_parser = subparsers.add_parser('apply', help='Apply migrations')
    apply_parser.add_argument('--revision', help='Specific revision to apply to')

    # List command
    subparsers.add_parser('list', help='List migrations')

    # Current command
    subparsers.add_parser('current', help='Show current revision')

    # Check command
    subparsers.add_parser('check', help='Check database connection and models')

    # Auto command (generate and apply)
    auto_parser = subparsers.add_parser('auto', help='Generate and apply migration')
    auto_parser.add_argument('message', help='Migration message')

    args = parser.parse_args()

    if args.command == 'generate':
        check_models()
        generate_migration(args.message)

    elif args.command == 'apply':
        apply_migration(args.revision)

    elif args.command == 'list':
        list_migrations()

    elif args.command == 'current':
        show_current()

    elif args.command == 'check':
        check_database_connection()
        check_models()

    elif args.command == 'auto':
        check_models()
        revision = generate_migration(args.message)
        if revision:
            proceed = input("\nPress Enter to apply migration or Ctrl+C to abort... ")
            apply_migration()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
