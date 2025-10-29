#!/bin/bash
set -e
echo "Starting Backend"

# Apply database migrations
alembic upgrade head

# Initialize database (creates first superuser if needed)
python app/init_db.py

# Execute the command passed to docker run
exec "$@"