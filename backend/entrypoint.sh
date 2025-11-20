#!/bin/bash
set -e
echo "Starting Backend"

# Apply database migrations
# Avoid installing the project in editable mode (which tries to write egg-info)
# when running inside a bind-mounted volume with restricted permissions.
# See: https://github.com/astral-sh/uv (use --no-project to skip project build)
uv run --no-project alembic upgrade head

# Initialize database (creates first superuser if needed)
uv run --no-project python app/init_db.py

# Execute the command passed to docker run
exec "$@"