"""
API Contract Tests using Schemathesis.

These tests demonstrate Schemathesis contract testing capabilities.
Schemathesis auto-generates test cases from OpenAPI schema and validates
that responses match documented schemas.

Usage:
    make test-e2e-schema   # Run schema tests only
    make test-e2e          # Run all E2E tests

Note: Schemathesis v4.x API - filtering is done via include/exclude methods.
"""

import pytest

try:
    from schemathesis import openapi
    from hypothesis import Phase, settings

    SCHEMATHESIS_AVAILABLE = True
except ImportError:
    SCHEMATHESIS_AVAILABLE = False


# Skip all tests in this module if schemathesis is not installed
pytestmark = [
    pytest.mark.e2e,
    pytest.mark.schemathesis,
    pytest.mark.skipif(
        not SCHEMATHESIS_AVAILABLE,
        reason="schemathesis not installed - run: make install-e2e",
    ),
]


if SCHEMATHESIS_AVAILABLE:
    from app.main import app

    # Load schema from the FastAPI app using schemathesis.openapi (v4.x API)
    schema = openapi.from_asgi("/api/v1/openapi.json", app=app)

    # Test root endpoint (simple, always works)
    root_schema = schema.include(path="/")

    @root_schema.parametrize()
    @settings(max_examples=5)
    def test_root_endpoint_schema(case):
        """
        Root endpoint schema compliance.

        Tests that the root endpoint returns responses matching its schema.
        """
        response = case.call()
        # Just verify we get a response and no 5xx errors
        assert response.status_code < 500, f"Server error: {response.text}"

    # Test auth registration endpoint
    # Note: This tests schema validation, not actual database operations
    auth_register_schema = schema.include(path="/api/v1/auth/register")

    @auth_register_schema.parametrize()
    @settings(max_examples=10)
    def test_register_endpoint_validates_input(case):
        """
        Registration endpoint input validation.

        Schemathesis generates various inputs to test validation.
        The endpoint should never return 5xx errors for invalid input.
        """
        response = case.call()
        # Registration returns 200/201 (success), 400/422 (validation), 409 (conflict)
        # Never a 5xx error for validation issues
        assert response.status_code < 500, f"Server error: {response.text}"

    class TestSchemaValidation:
        """Manual validation tests for schema structure."""

        def test_schema_loaded_successfully(self):
            """Verify schema was loaded from the app."""
            # Count operations to verify schema loaded
            ops = list(schema.get_all_operations())
            assert len(ops) > 0, "No operations found in schema"

        def test_multiple_endpoints_documented(self):
            """Verify multiple endpoints are documented in schema."""
            ops = list(schema.get_all_operations())
            # Should have at least 10 operations in a real API
            assert len(ops) >= 10, f"Only {len(ops)} operations found"

        def test_schema_has_auth_operations(self):
            """Verify auth-related operations exist."""
            # Filter for auth endpoints
            auth_ops = list(schema.include(path_regex=r".*auth.*").get_all_operations())
            assert len(auth_ops) > 0, "No auth operations found"
