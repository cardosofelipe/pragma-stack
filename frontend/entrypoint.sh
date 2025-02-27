#!/bin/sh

# Wait for backend to be ready
echo "Waiting for backend..."
until nc -z backend 8000; do
    sleep 1
done
echo "Backend is up!"

# Start the Next.js application
exec "$@"