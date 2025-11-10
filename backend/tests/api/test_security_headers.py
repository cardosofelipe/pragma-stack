# tests/api/test_security_headers.py
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client for the main app (module-scoped for speed)."""
    # Mock get_db to avoid database connection issues
    with patch("app.core.database.get_db") as mock_get_db:

        async def mock_session_generator():
            from unittest.mock import AsyncMock, MagicMock

            mock_session = MagicMock()
            mock_session.execute = AsyncMock(return_value=None)
            mock_session.close = AsyncMock(return_value=None)
            yield mock_session

        mock_get_db.side_effect = lambda: mock_session_generator()
        yield TestClient(app)


class TestSecurityHeaders:
    """Tests for security headers middleware"""

    def test_all_security_headers(self, client):
        """Test all security headers in a single request for speed"""
        response = client.get("/health")

        # Test X-Frame-Options
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

        # Test X-Content-Type-Options
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

        # Test X-XSS-Protection
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"

        # Test Content-Security-Policy
        assert "Content-Security-Policy" in response.headers
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]

        # Test Permissions-Policy
        assert "Permissions-Policy" in response.headers
        assert "geolocation=()" in response.headers["Permissions-Policy"]
        assert "microphone=()" in response.headers["Permissions-Policy"]
        assert "camera=()" in response.headers["Permissions-Policy"]

        # Test Referrer-Policy
        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_hsts_not_in_development(self, client):
        """Test that Strict-Transport-Security header is not set in development"""
        from app.core.config import settings

        # In development, HSTS should not be present
        if settings.ENVIRONMENT == "development":
            response = client.get("/health")
            assert "Strict-Transport-Security" not in response.headers

    def test_security_headers_on_404(self, client):
        """Test that security headers are present even on 404 responses"""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-XSS-Protection" in response.headers

    def test_hsts_in_production(self):
        """Test that HSTS header is set in production (covers line 95)"""
        with patch("app.core.config.settings.ENVIRONMENT", "production"):
            with patch("app.core.database.get_db") as mock_get_db:

                async def mock_session_generator():
                    from unittest.mock import AsyncMock, MagicMock

                    mock_session = MagicMock()
                    mock_session.execute = AsyncMock(return_value=None)
                    mock_session.close = AsyncMock(return_value=None)
                    yield mock_session

                mock_get_db.side_effect = lambda: mock_session_generator()

                # Need to reimport app to pick up the new settings
                from importlib import reload

                import app.main

                reload(app.main)
                test_client = TestClient(app.main.app)

                response = test_client.get("/health")
                assert "Strict-Transport-Security" in response.headers
                assert (
                    "max-age=31536000" in response.headers["Strict-Transport-Security"]
                )

    def test_csp_strict_mode(self):
        """Test CSP strict mode (covers line 121)"""
        with patch("app.core.config.settings.CSP_MODE", "strict"):
            with patch("app.core.database.get_db") as mock_get_db:

                async def mock_session_generator():
                    from unittest.mock import AsyncMock, MagicMock

                    mock_session = MagicMock()
                    mock_session.execute = AsyncMock(return_value=None)
                    mock_session.close = AsyncMock(return_value=None)
                    yield mock_session

                mock_get_db.side_effect = lambda: mock_session_generator()

                from importlib import reload

                import app.main

                reload(app.main)
                test_client = TestClient(app.main.app)

                response = test_client.get("/health")
                csp = response.headers.get("Content-Security-Policy", "")
                # Strict mode should only allow 'self'
                assert "script-src 'self'" in csp
                assert "style-src 'self'" in csp
                assert "cdn.jsdelivr.net" not in csp  # No external CDNs in strict mode

    def test_csp_docs_endpoint(self, client):
        """Test CSP on /docs endpoint allows Swagger resources (covers line 110)"""
        response = client.get("/docs")
        csp = response.headers.get("Content-Security-Policy", "")
        # Docs endpoint should allow Swagger UI resources
        assert "cdn.jsdelivr.net" in csp
        assert "fastapi.tiangolo.com" in csp


class TestRootEndpoint:
    """Tests for the root endpoint"""

    def test_root_endpoint(self):
        """Test root endpoint returns HTML (covers line 174)"""
        with patch("app.core.database.get_db") as mock_get_db:

            async def mock_session_generator():
                from unittest.mock import AsyncMock, MagicMock

                mock_session = MagicMock()
                mock_session.execute = AsyncMock(return_value=None)
                mock_session.close = AsyncMock(return_value=None)
                yield mock_session

            mock_get_db.side_effect = lambda: mock_session_generator()
            test_client = TestClient(app)

            response = test_client.get("/")
            assert response.status_code == 200
            assert "text/html" in response.headers["content-type"]
            assert "Welcome to app API" in response.text
            assert "/docs" in response.text
