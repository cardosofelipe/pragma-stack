# Development stage
FROM python:3.12-slim AS development

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install system dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc postgresql-client curl ca-certificates && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.cargo/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (development mode with dev dependencies)
RUN uv sync --extra dev --frozen

# Copy application code
COPY . .
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Production stage
FROM python:3.12-slim AS production

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install system dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client curl ca-certificates && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.cargo/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install only production dependencies using uv (no dev dependencies)
RUN uv sync --frozen --no-dev

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
