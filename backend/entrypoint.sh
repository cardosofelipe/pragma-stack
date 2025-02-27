#!/bin/bash
set -e
echo "Starting Backend"

# Apply database migrations
alembic upgrade head
# Execute the command passed to docker run
exec "$@"