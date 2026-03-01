"""
Performance Benchmark Tests.

These tests establish baseline performance metrics for critical API endpoints
and detect regressions when response times degrade significantly.

Usage:
    make benchmark          # Run benchmarks and save baseline
    make benchmark-check    # Run benchmarks and compare against saved baseline

Baselines are stored in .benchmarks/ and should be committed to version control
so CI can detect performance regressions across commits.
"""

import time
import uuid
from unittest.mock import patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.main import app

pytestmark = [pytest.mark.benchmark]


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def sync_client():
    """Create a FastAPI test client with mocked database for stateless endpoints."""
    with patch("app.main.check_database_health") as mock_health_check:
        mock_health_check.return_value = True
        yield TestClient(app)


# =============================================================================
# Stateless Endpoint Benchmarks (no DB required)
# =============================================================================


def test_health_endpoint_performance(sync_client, benchmark):
    """Benchmark: GET /health should respond within acceptable latency."""
    result = benchmark(sync_client.get, "/health")
    assert result.status_code == 200


def test_openapi_schema_performance(sync_client, benchmark):
    """Benchmark: OpenAPI schema generation should not regress."""
    result = benchmark(sync_client.get, "/api/v1/openapi.json")
    assert result.status_code == 200


# =============================================================================
# Database-dependent Endpoint Benchmarks (async, manual timing)
#
# pytest-benchmark does not support async functions natively. These tests
# measure latency manually and assert against a maximum threshold (in ms)
# to catch performance regressions.
# =============================================================================

MAX_LOGIN_MS = 500
MAX_GET_USER_MS = 200


@pytest_asyncio.fixture
async def bench_user(async_test_db):
    """Create a test user for benchmark tests."""
    from app.core.auth import get_password_hash
    from app.models.user import User

    _test_engine, AsyncTestingSessionLocal = async_test_db

    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="bench@example.com",
            password_hash=get_password_hash("BenchPass123!"),
            first_name="Bench",
            last_name="User",
            is_active=True,
            is_superuser=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def bench_token(client, bench_user):
    """Get an auth token for the benchmark user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "bench@example.com", "password": "BenchPass123!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_login_latency(client, bench_user):
    """Performance: POST /api/v1/auth/login must respond under threshold."""
    iterations = 5
    total_ms = 0.0

    for _ in range(iterations):
        start = time.perf_counter()
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "bench@example.com", "password": "BenchPass123!"},
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200

    mean_ms = total_ms / iterations
    print(f"\n  Login mean latency: {mean_ms:.1f}ms (threshold: {MAX_LOGIN_MS}ms)")
    assert mean_ms < MAX_LOGIN_MS, (
        f"Login latency regression: {mean_ms:.1f}ms exceeds {MAX_LOGIN_MS}ms threshold"
    )


@pytest.mark.asyncio
async def test_get_current_user_latency(client, bench_token):
    """Performance: GET /api/v1/users/me must respond under threshold."""
    iterations = 10
    total_ms = 0.0

    for _ in range(iterations):
        start = time.perf_counter()
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {bench_token}"},
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200

    mean_ms = total_ms / iterations
    print(
        f"\n  Get user mean latency: {mean_ms:.1f}ms (threshold: {MAX_GET_USER_MS}ms)"
    )
    assert mean_ms < MAX_GET_USER_MS, (
        f"Get user latency regression: {mean_ms:.1f}ms exceeds {MAX_GET_USER_MS}ms threshold"
    )
