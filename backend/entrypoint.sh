#!/bin/bash
set -e
echo "Starting Backend"

# Apply database migrations
uv run alembic upgrade head

# Initialize database (creates first superuser if needed)
uv run python app/init_db.py

# Execute the command passed to docker run
exec "$@"