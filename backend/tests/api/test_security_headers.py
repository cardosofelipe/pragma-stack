# tests/api/test_security_headers.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app


@pytest.fixture
def client():
    """Create a FastAPI test client for the main app."""
    # Mock get_db to avoid database connection issues
    with patch("app.core.database.get_db") as mock_get_db:
        async def mock_session_generator():
            from unittest.mock import MagicMock, AsyncMock
            mock_session = MagicMock()
            mock_session.execute = AsyncMock(return_value=None)
            mock_session.close = AsyncMock(return_value=None)
            yield mock_session

        mock_get_db.side_effect = lambda: mock_session_generator()
        yield TestClient(app)


class TestSecurityHeaders:
    """Tests for security headers middleware"""

    def test_x_frame_options_header(self, client):
        """Test that X-Frame-Options header is set to DENY"""
        response = client.get("/health")
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_content_type_options_header(self, client):
        """Test that X-Content-Type-Options header is set to nosniff"""
        response = client.get("/health")
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_x_xss_protection_header(self, client):
        """Test that X-XSS-Protection header is set"""
        response = client.get("/health")
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"

    def test_content_security_policy_header(self, client):
        """Test that Content-Security-Policy header is set"""
        response = client.get("/health")
        assert "Content-Security-Policy" in response.headers
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]

    def test_permissions_policy_header(self, client):
        """Test that Permissions-Policy header is set"""
        response = client.get("/health")
        assert "Permissions-Policy" in response.headers
        assert "geolocation=()" in response.headers["Permissions-Policy"]
        assert "microphone=()" in response.headers["Permissions-Policy"]
        assert "camera=()" in response.headers["Permissions-Policy"]

    def test_referrer_policy_header(self, client):
        """Test that Referrer-Policy header is set"""
        response = client.get("/health")
        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_strict_transport_security_not_in_development(self, client):
        """Test that Strict-Transport-Security header is not set in development"""
        from app.core.config import settings

        # In development, HSTS should not be present
        if settings.ENVIRONMENT == "development":
            response = client.get("/health")
            assert "Strict-Transport-Security" not in response.headers

    def test_security_headers_on_all_endpoints(self, client):
        """Test that security headers are present on all endpoints"""
        # Test health endpoint
        response = client.get("/health")
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers

        # Test root endpoint
        response = client.get("/")
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers

    def test_security_headers_on_404(self, client):
        """Test that security headers are present even on 404 responses"""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
