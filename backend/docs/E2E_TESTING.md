# Backend E2E Testing Guide

End-to-end testing infrastructure using **Testcontainers** (real PostgreSQL) and **Schemathesis** (OpenAPI contract testing).

## Table of Contents

- [Quick Start](#quick-start)
- [Requirements](#requirements)
- [How It Works](#how-it-works)
- [Test Organization](#test-organization)
- [Writing E2E Tests](#writing-e2e-tests)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

---

## Quick Start

```bash
# 1. Install E2E dependencies
make install-e2e

# 2. Ensure Docker is running
make check-docker

# 3. Run E2E tests
make test-e2e
```

---

## Requirements

### Docker

E2E tests use Testcontainers to spin up real PostgreSQL containers. Docker must be running:

- **macOS/Windows**: Docker Desktop
- **Linux**: Docker Engine (`sudo systemctl start docker`)

### Dependencies

E2E tests require additional packages beyond the standard dev dependencies:

```bash
# Install E2E dependencies
make install-e2e

# Or manually:
uv sync --extra dev --extra e2e
```

This installs:
- `testcontainers[postgres]>=4.0.0` - Docker container management
- `schemathesis>=3.30.0` - OpenAPI contract testing

---

## How It Works

### Testcontainers

Testcontainers automatically manages Docker containers for tests:

1. **Session-scoped container**: A single PostgreSQL 17 container starts once per test session
2. **Function-scoped isolation**: Each test gets fresh tables (drop + recreate)
3. **Automatic cleanup**: Container is destroyed when tests complete

This approach catches bugs that SQLite-based tests miss:
- PostgreSQL-specific SQL behavior
- Real constraint violations
- Actual transaction semantics
- JSONB column behavior

### Schemathesis

Schemathesis generates test cases from your OpenAPI schema:

1. **Schema loading**: Reads `/api/v1/openapi.json` from your FastAPI app
2. **Test generation**: Creates test cases for each endpoint
3. **Response validation**: Verifies responses match documented schema

This catches:
- Undocumented response codes
- Schema mismatches (wrong types, missing fields)
- Edge cases in input validation

---

## Test Organization

```
backend/tests/
├── e2e/                          # E2E tests (PostgreSQL, Docker required)
│   ├── __init__.py
│   ├── conftest.py               # Testcontainers fixtures
│   ├── test_api_contracts.py     # Schemathesis schema tests
│   └── test_database_workflows.py # PostgreSQL workflow tests
│
├── api/                          # Integration tests (SQLite, fast)
├── crud/                         # Unit tests
└── conftest.py                   # Standard fixtures
```

### Test Markers

Tests use pytest markers for filtering:

| Marker | Description |
|--------|-------------|
| `@pytest.mark.e2e` | End-to-end test requiring Docker |
| `@pytest.mark.postgres` | PostgreSQL-specific test |
| `@pytest.mark.schemathesis` | Schemathesis schema test |

---

## Writing E2E Tests

### Basic E2E Test

```python
import pytest
from uuid import uuid4

@pytest.mark.e2e
@pytest.mark.postgres
@pytest.mark.asyncio
async def test_user_workflow(e2e_client):
    """Test user registration with real PostgreSQL."""
    email = f"test-{uuid4().hex[:8]}@example.com"

    response = await e2e_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "first_name": "Test",
            "last_name": "User",
        },
    )

    assert response.status_code in [200, 201]
    assert response.json()["email"] == email
```

### Available Fixtures

| Fixture | Scope | Description |
|---------|-------|-------------|
| `postgres_container` | session | Raw Testcontainers PostgreSQL container |
| `async_postgres_url` | session | Asyncpg-compatible connection URL |
| `e2e_db_session` | function | SQLAlchemy AsyncSession with fresh tables |
| `e2e_client` | function | httpx AsyncClient connected to real DB |

### Schemathesis Test

```python
import pytest
import schemathesis
from hypothesis import settings, Phase

from app.main import app

schema = schemathesis.from_asgi("/api/v1/openapi.json", app=app)

@pytest.mark.e2e
@pytest.mark.schemathesis
@schema.parametrize(endpoint="/api/v1/auth/register")
@settings(max_examples=20)
def test_registration_schema(case):
    """Test registration endpoint conforms to schema."""
    response = case.call_asgi()
    case.validate_response(response)
```

---

## Running Tests

### Commands

```bash
# Run all E2E tests
make test-e2e

# Run only Schemathesis schema tests
make test-e2e-schema

# Run all tests (unit + integration + E2E)
make test-all

# Check Docker availability
make check-docker
```

### Direct pytest

```bash
# All E2E tests
IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v

# Only PostgreSQL tests
IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v -m postgres

# Only Schemathesis tests
IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v -m schemathesis
```

---

## Troubleshooting

### Docker Not Running

**Error:**
```
Docker is not running!
E2E tests require Docker to be running.
```

**Solution:**
```bash
# macOS/Windows
# Open Docker Desktop

# Linux
sudo systemctl start docker
```

### Testcontainers Not Installed

**Error:**
```
SKIPPED: testcontainers not installed - run: make install-e2e
```

**Solution:**
```bash
make install-e2e
# Or: uv sync --extra dev --extra e2e
```

### Container Startup Timeout

**Error:**
```
testcontainers.core.waiting_utils.UnexpectedResponse
```

**Solutions:**
1. Increase Docker resources (memory, CPU)
2. Pull the image manually: `docker pull postgres:17-alpine`
3. Check Docker daemon logs: `docker logs`

### Port Conflicts

**Error:**
```
Error starting container: port is already allocated
```

**Solution:**
Testcontainers uses random ports, so conflicts are rare. If occurring:
1. Stop other PostgreSQL containers: `docker stop $(docker ps -q)`
2. Check for orphaned containers: `docker container prune`

### Ryuk/Reaper Port 8080 Issues

**Error:**
```
ConnectionError: Port mapping for container ... and port 8080 is not available
```

**Solution:**
This is related to the Testcontainers Reaper (Ryuk) which handles automatic cleanup.
The `conftest.py` automatically disables Ryuk to avoid this issue. If you still encounter
this error, ensure you're using the latest conftest.py or set the environment variable:

```bash
export TESTCONTAINERS_RYUK_DISABLED=true
```

### Parallel Test Execution Issues

**Error:**
```
ScopeMismatch: ... cannot use a higher-scoped fixture 'postgres_container'
```

**Solution:**
E2E tests must run sequentially (not in parallel) because they share a session-scoped
PostgreSQL container. The Makefile commands use `-n 0` to disable parallel execution.
If running pytest directly, add `-n 0`:

```bash
IS_TEST=True PYTHONPATH=. uv run pytest tests/e2e/ -v -n 0
```

---

## CI/CD Integration

### GitHub Actions

A workflow template is provided at `.github/workflows/backend-e2e-tests.yml.template`.

To enable:
1. Rename to `backend-e2e-tests.yml`
2. Push to repository

The workflow:
- Runs on pushes to `main`/`develop` affecting `backend/`
- Uses `continue-on-error: true` (E2E failures don't block merge)
- Caches uv dependencies for speed

### Local CI Simulation

```bash
# Run what CI runs
make test-all
```

---

## Best Practices

### DO

- Use unique emails per test: `f"test-{uuid4().hex[:8]}@example.com"`
- Mark tests with appropriate markers: `@pytest.mark.e2e`
- Keep E2E tests focused on critical workflows
- Use `e2e_client` fixture for most tests

### DON'T

- Share state between tests (each test gets fresh tables)
- Test every endpoint in E2E (use unit tests for edge cases)
- Skip the `IS_TEST=True` environment variable
- Run E2E tests without Docker

---

## Further Reading

- [Testcontainers Documentation](https://testcontainers.com/guides/getting-started-with-testcontainers-for-python/)
- [Schemathesis Documentation](https://schemathesis.readthedocs.io/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
