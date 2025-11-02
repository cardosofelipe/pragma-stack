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

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or SQLite for development)
- pip and virtualenv

### Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
# Run migrations
python migrate.py apply

# Or use Alembic directly
alembic upgrade head
```

### Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

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
# Run all tests
IS_TEST=True pytest

# Run with coverage
IS_TEST=True pytest --cov=app --cov-report=term-missing -n 0

# Run specific test file
IS_TEST=True pytest tests/api/test_auth.py -v

# Run single test
IS_TEST=True pytest tests/api/test_auth.py::TestLogin::test_login_success -v

# Generate HTML coverage report
IS_TEST=True pytest --cov=app --cov-report=html -n 0
open htmlcov/index.html
```

**Test Environment**: Uses SQLite in-memory database. Tests run in parallel via pytest-xdist.

### Code Quality

```bash
# Type checking
mypy app

# Linting
ruff check app

# Format code
black app
isort app
```

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

## Docker Support

```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d

# Rebuild after changes
docker-compose build backend
```

## Troubleshooting

### Common Issues

**Module Import Errors**
```bash
# Ensure you're in the backend directory
cd backend

# Activate virtual environment
source .venv/bin/activate
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
IS_TEST=True pytest -vv

# Run single test to isolate issue
IS_TEST=True pytest tests/api/test_auth.py::TestLogin::test_login_success -vv
```

### Getting Help

See our detailed documentation:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and patterns
- [CODING_STANDARDS.md](docs/CODING_STANDARDS.md) - Code quality guidelines
- [COMMON_PITFALLS.md](docs/COMMON_PITFALLS.md) - Mistakes to avoid
- [FEATURE_EXAMPLE.md](docs/FEATURE_EXAMPLE.md) - Adding new features

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
4. **Regular updates**: Keep dependencies current
5. **Audit logs**: Monitor authentication events

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

## Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **SQLAlchemy 2.0**: https://docs.sqlalchemy.org/en/20/
- **Pydantic**: https://docs.pydantic.dev/
- **Alembic**: https://alembic.sqlalchemy.org/

---

**Note**: For project-wide information (license, contributing guidelines, deployment), see the [root README](../README.md).
