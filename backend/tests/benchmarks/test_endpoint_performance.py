"""
Performance Benchmark Tests.

These tests establish baseline performance metrics for critical API endpoints
and core operations, detecting regressions when response times degrade.

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

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.main import app

pytestmark = [pytest.mark.benchmark]

# Pre-computed hash for sync benchmarks (avoids hashing in every iteration)
_BENCH_PASSWORD = "BenchPass123!"
_BENCH_HASH = get_password_hash(_BENCH_PASSWORD)


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
# Core Crypto & Token Benchmarks (no DB required)
#
# These benchmark the CPU-intensive operations that underpin auth:
# password hashing, verification, and JWT creation/decoding.
# =============================================================================


def test_password_hashing_performance(benchmark):
    """Benchmark: bcrypt password hashing (CPU-bound, ~100ms expected)."""
    result = benchmark(get_password_hash, _BENCH_PASSWORD)
    assert result.startswith("$2b$")


def test_password_verification_performance(benchmark):
    """Benchmark: bcrypt password verification against a known hash."""
    result = benchmark(verify_password, _BENCH_PASSWORD, _BENCH_HASH)
    assert result is True


def test_access_token_creation_performance(benchmark):
    """Benchmark: JWT access token generation."""
    user_id = str(uuid.uuid4())
    token = benchmark(create_access_token, user_id)
    assert isinstance(token, str)
    assert len(token) > 0


def test_refresh_token_creation_performance(benchmark):
    """Benchmark: JWT refresh token generation."""
    user_id = str(uuid.uuid4())
    token = benchmark(create_refresh_token, user_id)
    assert isinstance(token, str)
    assert len(token) > 0


def test_token_decode_performance(benchmark):
    """Benchmark: JWT token decoding and validation."""
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id)
    payload = benchmark(decode_token, token, "access")
    assert payload.sub == user_id


# =============================================================================
# Database-dependent Endpoint Benchmarks (async, manual timing)
#
# pytest-benchmark does not support async functions natively. These tests
# measure latency manually and assert against a maximum threshold (in ms)
# to catch performance regressions.
# =============================================================================

MAX_LOGIN_MS = 500
MAX_GET_USER_MS = 200
MAX_REGISTER_MS = 500
MAX_TOKEN_REFRESH_MS = 200
MAX_SESSIONS_LIST_MS = 200
MAX_USER_UPDATE_MS = 200


@pytest_asyncio.fixture
async def bench_user(async_test_db):
    """Create a test user for benchmark tests."""
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


@pytest_asyncio.fixture
async def bench_refresh_token(client, bench_user):
    """Get a refresh token for the benchmark user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "bench@example.com", "password": "BenchPass123!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["refresh_token"]


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


@pytest.mark.asyncio
async def test_register_latency(client):
    """Performance: POST /api/v1/auth/register must respond under threshold."""
    iterations = 3
    total_ms = 0.0

    for i in range(iterations):
        start = time.perf_counter()
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"benchreg{i}@example.com",
                "password": "BenchRegPass123!",
                "first_name": "Bench",
                "last_name": "Register",
            },
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 201, f"Register failed: {response.text}"

    mean_ms = total_ms / iterations
    print(
        f"\n  Register mean latency: {mean_ms:.1f}ms (threshold: {MAX_REGISTER_MS}ms)"
    )
    assert mean_ms < MAX_REGISTER_MS, (
        f"Register latency regression: {mean_ms:.1f}ms exceeds {MAX_REGISTER_MS}ms threshold"
    )


@pytest.mark.asyncio
async def test_token_refresh_latency(client, bench_refresh_token):
    """Performance: POST /api/v1/auth/refresh must respond under threshold."""
    iterations = 5
    total_ms = 0.0

    for _ in range(iterations):
        start = time.perf_counter()
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": bench_refresh_token},
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200, f"Refresh failed: {response.text}"
        # Use the new refresh token for the next iteration
        bench_refresh_token = response.json()["refresh_token"]

    mean_ms = total_ms / iterations
    print(
        f"\n  Token refresh mean latency: {mean_ms:.1f}ms (threshold: {MAX_TOKEN_REFRESH_MS}ms)"
    )
    assert mean_ms < MAX_TOKEN_REFRESH_MS, (
        f"Token refresh latency regression: {mean_ms:.1f}ms exceeds {MAX_TOKEN_REFRESH_MS}ms threshold"
    )


@pytest.mark.asyncio
async def test_sessions_list_latency(client, bench_token):
    """Performance: GET /api/v1/sessions must respond under threshold."""
    iterations = 10
    total_ms = 0.0

    for _ in range(iterations):
        start = time.perf_counter()
        response = await client.get(
            "/api/v1/sessions/me",
            headers={"Authorization": f"Bearer {bench_token}"},
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200

    mean_ms = total_ms / iterations
    print(
        f"\n  Sessions list mean latency: {mean_ms:.1f}ms (threshold: {MAX_SESSIONS_LIST_MS}ms)"
    )
    assert mean_ms < MAX_SESSIONS_LIST_MS, (
        f"Sessions list latency regression: {mean_ms:.1f}ms exceeds {MAX_SESSIONS_LIST_MS}ms threshold"
    )


@pytest.mark.asyncio
async def test_user_profile_update_latency(client, bench_token):
    """Performance: PATCH /api/v1/users/me must respond under threshold."""
    iterations = 5
    total_ms = 0.0

    for i in range(iterations):
        start = time.perf_counter()
        response = await client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {bench_token}"},
            json={"first_name": f"Bench{i}"},
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200, f"Update failed: {response.text}"

    mean_ms = total_ms / iterations
    print(
        f"\n  User update mean latency: {mean_ms:.1f}ms (threshold: {MAX_USER_UPDATE_MS}ms)"
    )
    assert mean_ms < MAX_USER_UPDATE_MS, (
        f"User update latency regression: {mean_ms:.1f}ms exceeds {MAX_USER_UPDATE_MS}ms threshold"
    )
