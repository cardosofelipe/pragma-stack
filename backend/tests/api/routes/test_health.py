# tests/api/routes/test_health.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import status
from fastapi.testclient import TestClient
from datetime import datetime
from sqlalchemy.exc import OperationalError

from app.main import app
from app.core.database import get_db


@pytest.fixture
def client():
    """Create a FastAPI test client for the main app with mocked database."""
    # Mock get_db to avoid connecting to the actual database
    with patch("app.main.get_db") as mock_get_db:
        def mock_session_generator():
            mock_session = MagicMock()
            # Mock the execute method to return successfully
            mock_session.execute.return_value = None
            mock_session.close.return_value = None
            yield mock_session

        # Return a new generator each time get_db is called
        mock_get_db.side_effect = lambda: mock_session_generator()
        yield TestClient(app)


class TestHealthEndpoint:
    """Tests for the /health endpoint"""

    def test_health_check_healthy(self, client):
        """Test that health check returns healthy when database is accessible"""
        response = client.get("/health")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Check required fields
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
        assert "environment" in data
        assert "checks" in data

        # Verify timestamp format (ISO 8601)
        assert data["timestamp"].endswith("Z")
        # Verify it's a valid datetime
        datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))

        # Check database health
        assert "database" in data["checks"]
        assert data["checks"]["database"]["status"] == "healthy"
        assert "message" in data["checks"]["database"]

    def test_health_check_response_structure(self, client):
        """Test that health check response has correct structure"""
        response = client.get("/health")
        data = response.json()

        # Verify top-level structure
        assert isinstance(data["status"], str)
        assert isinstance(data["timestamp"], str)
        assert isinstance(data["version"], str)
        assert isinstance(data["environment"], str)
        assert isinstance(data["checks"], dict)

        # Verify database check structure
        db_check = data["checks"]["database"]
        assert isinstance(db_check["status"], str)
        assert isinstance(db_check["message"], str)

    def test_health_check_version_matches_settings(self, client):
        """Test that health check returns correct version from settings"""
        from app.core.config import settings

        response = client.get("/health")
        data = response.json()

        assert data["version"] == settings.VERSION

    def test_health_check_environment_matches_settings(self, client):
        """Test that health check returns correct environment from settings"""
        from app.core.config import settings

        response = client.get("/health")
        data = response.json()

        assert data["environment"] == settings.ENVIRONMENT

    def test_health_check_database_connection_failure(self, client):
        """Test that health check returns unhealthy when database is not accessible"""
        # Mock the database session to raise an exception
        with patch("app.main.get_db") as mock_get_db:
            def mock_session():
                from unittest.mock import MagicMock
                mock = MagicMock()
                mock.execute.side_effect = OperationalError(
                    "Connection refused",
                    params=None,
                    orig=Exception("Connection refused")
                )
                yield mock

            mock_get_db.return_value = mock_session()

            response = client.get("/health")

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()

            # Check overall status
            assert data["status"] == "unhealthy"

            # Check database status
            assert "database" in data["checks"]
            assert data["checks"]["database"]["status"] == "unhealthy"
            assert "failed" in data["checks"]["database"]["message"].lower()

    def test_health_check_timestamp_recent(self, client):
        """Test that health check timestamp is recent (within last minute)"""
        before = datetime.utcnow()
        response = client.get("/health")
        after = datetime.utcnow()

        data = response.json()
        timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))

        # Timestamp should be between before and after
        assert before <= timestamp.replace(tzinfo=None) <= after

    def test_health_check_no_authentication_required(self, client):
        """Test that health check does not require authentication"""
        # Make request without any authentication headers
        response = client.get("/health")

        # Should succeed without authentication
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]

    def test_health_check_idempotent(self, client):
        """Test that multiple health checks return consistent results"""
        response1 = client.get("/health")
        response2 = client.get("/health")

        # Both should have same status code (either both healthy or both unhealthy)
        assert response1.status_code == response2.status_code

        data1 = response1.json()
        data2 = response2.json()

        # Same overall health status
        assert data1["status"] == data2["status"]

        # Same version and environment
        assert data1["version"] == data2["version"]
        assert data1["environment"] == data2["environment"]

        # Same database check status
        assert data1["checks"]["database"]["status"] == data2["checks"]["database"]["status"]

    def test_health_check_content_type(self, client):
        """Test that health check returns JSON content type"""
        response = client.get("/health")

        assert "application/json" in response.headers["content-type"]


class TestHealthEndpointEdgeCases:
    """Edge case tests for the /health endpoint"""

    def test_health_check_with_query_parameters(self, client):
        """Test that health check ignores query parameters"""
        response = client.get("/health?foo=bar&baz=qux")

        # Should still work with query params
        assert response.status_code == status.HTTP_200_OK

    def test_health_check_method_not_allowed(self, client):
        """Test that POST/PUT/DELETE are not allowed on health endpoint"""
        # POST should not be allowed
        response = client.post("/health")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # PUT should not be allowed
        response = client.put("/health")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # DELETE should not be allowed
        response = client.delete("/health")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_health_check_with_accept_header(self, client):
        """Test that health check works with different Accept headers"""
        response = client.get("/health", headers={"Accept": "application/json"})
        assert response.status_code == status.HTTP_200_OK

        response = client.get("/health", headers={"Accept": "*/*"})
        assert response.status_code == status.HTTP_200_OK
