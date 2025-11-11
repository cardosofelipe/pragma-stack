# Backend API

> FastAPI-based REST API with async SQLAlchemy, JWT authentication, and comprehensive testing.

## Overview

Production-ready FastAPI backend featuring:

- **Authentication**: JWT with refresh tokens, session management, device tracking
- **Database**: Async PostgreSQL with SQLAlchemy 2.0, Alembic migrations
- **Security**: Rate limiting, CORS, CSP headers, password hashing (bcrypt)
- **Multi-tenancy**: Organization-based access control with roles (Owner/Admin/Member)
- **Testing**: 97%+ coverage with security-focused test suite
- **Performance**: Async throughout, connection pooling, optimized queries
- **Modern Tooling**: uv for dependencies, Ruff for linting/formatting, mypy for type checking

## Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 14+ (or SQLite for development)
- **[uv](https://docs.astral.sh/uv/)** - Modern Python package manager (replaces pip)

### Installation

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install all dependencies (production + dev)
cd backend
uv sync --extra dev

# Or use the Makefile
make install-dev

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

**Why uv?**
- 🚀 10-100x faster than pip
- 🔒 Reproducible builds via `uv.lock` lockfile
- 📦 Better dependency resolution
- ⚡ Built by Astral (creators of Ruff)

### Database Setup

```bash
# Run migrations
python migrate.py apply

# Or use Alembic directly
alembic upgrade head
```

### Run Development Server

```bash
# Using uv
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or activate environment first
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Dependency Management with uv

### Understanding uv

**uv** is the modern standard for Python dependency management, built in Rust for speed and reliability.

**Key files:**
- `pyproject.toml` - Declares dependencies and tool configurations
- `uv.lock` - Locks exact versions for reproducible builds (commit to git)

### Common Commands

#### Installing Dependencies

```bash
# Install all dependencies from lockfile
uv sync --extra dev

# Install only production dependencies (no dev tools)
uv sync

# Or use the Makefile
make install-dev    # Install with dev dependencies
make sync           # Sync from lockfile
```

#### Adding Dependencies

```bash
# Add a production dependency
uv add httpx

# Add a development dependency
uv add --dev pytest-mock

# Add with version constraint
uv add "fastapi>=0.115.0,<0.116.0"

# Add exact version
uv add "pydantic==2.10.6"
```

After adding dependencies, **commit both `pyproject.toml` and `uv.lock`** to git.

#### Removing Dependencies

```bash
# Remove a package
uv remove httpx

# Remove a dev dependency
uv remove --dev pytest-mock
```

#### Updating Dependencies

```bash
# Update all packages to latest compatible versions
uv sync --upgrade

# Update a specific package
uv add --upgrade fastapi

# Check for outdated packages
uv pip list --outdated
```

#### Running Commands in uv Environment

```bash
# Run any Python command via uv (no activation needed)
uv run python script.py
uv run pytest
uv run mypy app/

# Or activate the virtual environment
source .venv/bin/activate
python script.py
pytest
```

### Makefile Commands

We provide convenient Makefile commands that use uv:

```bash
# Setup
make install-dev   # Install all dependencies (prod + dev)
make sync          # Sync from lockfile

# Code Quality
make lint          # Run Ruff linter (check only)
make lint-fix      # Run Ruff with auto-fix
make format        # Format code with Ruff
make format-check  # Check if code is formatted
make type-check    # Run mypy type checking
make validate      # Run all checks (lint + format + types)

# Testing
make test          # Run all tests
make test-cov      # Run tests with coverage report

# Utilities
make clean         # Remove cache and build artifacts
make help          # Show all commands
```

### Dependency Workflow Example

```bash
# 1. Clone repository
git clone <repo-url>
cd backend

# 2. Install dependencies
make install-dev

# 3. Make changes, add a new dependency
uv add httpx

# 4. Test your changes
make test

# 5. Commit (includes uv.lock)
git add pyproject.toml uv.lock
git commit -m "Add httpx dependency"

# 6. Other developers pull and sync
git pull
make sync  # Uses the committed uv.lock
```

### Troubleshooting uv

**Dependencies not found after install:**
```bash
# Make sure you're using uv run or activated environment
uv run pytest          # Option 1: Run via uv
source .venv/bin/activate  # Option 2: Activate first
pytest
```

**Lockfile out of sync:**
```bash
# Regenerate lockfile
uv lock

# Force reinstall from lockfile
uv sync --reinstall
```

**uv not found:**
```bash
# Install uv globally
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH if needed
export PATH="$HOME/.cargo/bin:$PATH"
```

---

## Development

### Project Structure

```
app/
├── api/              # API routes and dependencies
│   ├── routes/       # Endpoint implementations
│   └── dependencies/ # Auth, permissions, etc.
├── core/             # Core functionality
│   ├── config.py     # Settings management
│   ├── database.py   # Database engine setup
│   ├── auth.py       # JWT token handling
│   └── exceptions.py # Custom exceptions
├── crud/             # Database operations
├── models/           # SQLAlchemy ORM models
├── schemas/          # Pydantic request/response schemas
├── services/         # Business logic layer
└── utils/            # Utility functions
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

### Configuration

Environment variables (`.env`):

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=app_db

# Security (IMPORTANT: Change these!)
SECRET_KEY=your-secret-key-min-32-chars-change-in-production
ENVIRONMENT=development  # development | production

# Optional
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
CSP_MODE=relaxed  # strict | relaxed | disabled

# First superuser (auto-created on startup)
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=SecurePass123!
```

⚠️ **Security Note**: Never commit `.env` files. Use strong, unique values in production.

### Database Migrations

We use Alembic for database migrations with a helper script:

```bash
# Generate migration from model changes
python migrate.py generate "add user preferences"

# Apply migrations
python migrate.py apply

# Generate and apply in one step
python migrate.py auto "add user preferences"

# Check current version
python migrate.py current

# List all migrations
python migrate.py list
```

Manual Alembic usage:

```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Testing

```bash
# Using Makefile (recommended)
make test              # Run all tests
make test-cov          # Run with coverage report

# Using uv directly
IS_TEST=True uv run pytest
IS_TEST=True uv run pytest --cov=app --cov-report=term-missing -n 0

# Run specific test file
IS_TEST=True uv run pytest tests/api/test_auth.py -v

# Run single test
IS_TEST=True uv run pytest tests/api/test_auth.py::TestLogin::test_login_success -v

# Generate HTML coverage report
IS_TEST=True uv run pytest --cov=app --cov-report=html -n 0
open htmlcov/index.html
```

**Test Environment**: Uses SQLite in-memory database. Tests run in parallel via pytest-xdist.

### Code Quality

```bash
# Using Makefile (recommended)
make lint          # Ruff linting
make format        # Ruff formatting
make type-check    # mypy type checking
make validate      # All checks at once

# Using uv directly
uv run ruff check app/ tests/
uv run ruff format app/ tests/
uv run mypy app/
```

**Tools:**
- **Ruff**: All-in-one linting, formatting, and import sorting (replaces Black, Flake8, isort)
- **mypy**: Static type checking with Pydantic plugin

All configurations are in `pyproject.toml`.

---

## API Documentation

Once the server is running, interactive API documentation is available:

- **Swagger UI**: http://localhost:8000/docs
  - Try out endpoints directly
  - See request/response schemas
  - View authentication requirements

- **ReDoc**: http://localhost:8000/redoc
  - Alternative documentation interface
  - Better for reading/printing

- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json
  - Raw OpenAPI 3.0 specification
  - Use for client generation

---

## Authentication

### Token-Based Authentication

The API uses JWT tokens for authentication:

1. **Login**: `POST /api/v1/auth/login`
   - Returns access token (15 min expiry) and refresh token (7 day expiry)
   - Session tracked with device information

2. **Refresh**: `POST /api/v1/auth/refresh`
   - Exchange refresh token for new access token
   - Validates session is still active

3. **Logout**: `POST /api/v1/auth/logout`
   - Invalidates current session
   - Use `logout-all` to invalidate all user sessions

### Using Protected Endpoints

Include access token in Authorization header:

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/api/v1/users/me
```

### Roles & Permissions

- **Superuser**: Full system access (user/org management)
- **Organization Roles**:
  - `Owner`: Full control of organization
  - `Admin`: Can manage members (except owners)
  - `Member`: Read-only access

---

## Common Tasks

### Create a Superuser

Superusers are created automatically on startup using `FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD` from `.env`.

To create additional superusers, update a user via SQL or admin API.

### Add a New API Endpoint

See [docs/FEATURE_EXAMPLE.md](docs/FEATURE_EXAMPLE.md) for step-by-step guide.

Quick overview:
1. Create Pydantic schemas in `app/schemas/`
2. Create CRUD operations in `app/crud/`
3. Create route in `app/api/routes/`
4. Register router in `app/api/main.py`
5. Write tests in `tests/api/`

### Database Health Check

```bash
# Check database connection
python migrate.py check

# Health endpoint
curl http://localhost:8000/health
```

---

## Docker Support

The Dockerfile uses **uv** for fast, reproducible builds:

```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d

# Rebuild after changes
docker-compose build backend
```

**Docker features:**
- Multi-stage builds (development + production)
- uv for fast dependency installation
- `uv.lock` ensures exact versions in containers
- Development stage includes dev dependencies
- Production stage optimized for size and security

---

## Troubleshooting

### Common Issues

**Module Import Errors**
```bash
# Ensure dependencies are installed
make install-dev

# Or sync from lockfile
make sync

# Verify Python environment
uv run python --version
```

**uv command not found**
```bash
# Install uv globally
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.cargo/bin:$PATH"
```

**Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in .env
cat .env | grep POSTGRES
```

**Migration Conflicts**
```bash
# Check migration history
python migrate.py list

# Downgrade and retry
alembic downgrade -1
alembic upgrade head
```

**Tests Failing**
```bash
# Run with verbose output
make test

# Run single test to isolate issue
IS_TEST=True uv run pytest tests/api/test_auth.py::TestLogin::test_login_success -vv
```

**Dependencies out of sync**
```bash
# Regenerate lockfile from pyproject.toml
uv lock

# Reinstall everything
make install-dev
```

### Getting Help

See our detailed documentation:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and patterns
- [CODING_STANDARDS.md](docs/CODING_STANDARDS.md) - Code quality guidelines
- [COMMON_PITFALLS.md](docs/COMMON_PITFALLS.md) - Mistakes to avoid
- [FEATURE_EXAMPLE.md](docs/FEATURE_EXAMPLE.md) - Adding new features

---

## Performance

### Database Connection Pooling

Configured in `app/core/config.py`:
- Pool size: 20 connections
- Max overflow: 50 connections
- Pool timeout: 30 seconds
- Connection recycling: 1 hour

### Async Operations

- All I/O operations use async/await
- CPU-intensive operations (bcrypt) run in thread pool
- No blocking calls in request handlers

### Query Optimization

- N+1 query prevention via eager loading
- Bulk operations for admin actions
- Indexed foreign keys and common lookups

---

## Security

### Built-in Security Features

- **Password Security**: bcrypt hashing, strength validation, common password blocking
- **Token Security**: HMAC-SHA256 signed, short-lived access tokens, algorithm validation
- **Session Management**: Database-backed, device tracking, revocation support
- **Rate Limiting**: Per-endpoint limits on auth/sensitive operations
- **CORS**: Explicit origins, methods, and headers only
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Validation**: Pydantic schemas, SQL injection prevention (ORM)

### Security Best Practices

1. **Never commit secrets**: Use `.env` files (git-ignored)
2. **Strong SECRET_KEY**: Min 32 chars, cryptographically random
3. **HTTPS in production**: Required for token security
4. **Regular updates**: Keep dependencies current (`uv sync --upgrade`)
5. **Audit logs**: Monitor authentication events

---

## Monitoring

### Health Check

```bash
curl http://localhost:8000/health
```

Returns:
- API version
- Environment
- Database connectivity
- Timestamp

### Logging

Logs are written to stdout with structured format:

```python
# Configure log level
logging.basicConfig(level=logging.INFO)

# In production, use JSON logs for log aggregation
```

---

## Additional Resources

### Official Documentation
- **uv**: https://docs.astral.sh/uv/
- **FastAPI**: https://fastapi.tiangolo.com
- **SQLAlchemy 2.0**: https://docs.sqlalchemy.org/en/20/
- **Pydantic**: https://docs.pydantic.dev/
- **Alembic**: https://alembic.sqlalchemy.org/
- **Ruff**: https://docs.astral.sh/ruff/

### Our Documentation
- [Root README](../README.md) - Project-wide information
- [CLAUDE.md](../CLAUDE.md) - Comprehensive development guide

---

**Built with modern Python tooling:**
- 🚀 **uv** - 10-100x faster dependency management
- ⚡ **Ruff** - 10-100x faster linting & formatting
- 🔍 **mypy** - Static type checking
- ✅ **pytest** - Comprehensive test suite

**All configured in a single `pyproject.toml` file!**
