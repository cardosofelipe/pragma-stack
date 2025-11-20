#!/bin/bash
set -e
echo "Starting Backend"

# Ensure the project's virtualenv binaries are on PATH so commands like
# 'uvicorn' work even when not prefixed by 'uv run'. This matches how uv
# installs the env into /app/.venv in our containers.
if [ -d "/app/.venv/bin" ]; then
  export PATH="/app/.venv/bin:$PATH"
fi

# Apply database migrations
# Avoid installing the project in editable mode (which tries to write egg-info)
# when running inside a bind-mounted volume with restricted permissions.
# See: https://github.com/astral-sh/uv (use --no-project to skip project build)
uv run --no-project alembic upgrade head

# Initialize database (creates first superuser if needed)
uv run --no-project python app/init_db.py

# Execute the command passed to docker run
exec "$@"