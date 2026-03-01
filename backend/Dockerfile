# Development stage
FROM python:3.12-slim AS development

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1

# Install system dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc postgresql-client curl ca-certificates && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv* /usr/local/bin/ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (development mode with dev dependencies)
RUN uv sync --extra dev --frozen

# Copy application code
COPY . .
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Note: Running as root in development for bind mount compatibility
# Production stage uses non-root user for security

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Production stage — Alpine eliminates glibc CVEs (e.g. CVE-2026-0861)
FROM python:3.12-alpine AS production

# Create non-root user
RUN addgroup -S appuser && adduser -S -G appuser appuser

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1

# Install system dependencies and uv
RUN apk add --no-cache postgresql-client curl ca-certificates && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv* /usr/local/bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install build dependencies, compile Python packages, then remove build deps
RUN apk add --no-cache --virtual .build-deps \
        gcc g++ musl-dev python3-dev linux-headers libffi-dev openssl-dev && \
    uv sync --frozen --no-dev && \
    apk del .build-deps

# Copy application code
COPY . .
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
