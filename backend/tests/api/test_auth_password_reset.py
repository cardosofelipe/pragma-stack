# tests/api/test_auth_password_reset.py
"""
Tests for password reset endpoints.
"""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import status
from sqlalchemy import select

from app.schemas.users import PasswordResetRequest, PasswordResetConfirm
from app.utils.security import create_password_reset_token
from app.models.user import User


# Disable rate limiting for tests
@pytest.fixture(autouse=True)
def disable_rate_limit():
    """Disable rate limiting for all tests in this module."""
    with patch('app.api.routes.auth.limiter.enabled', False):
        yield


class TestPasswordResetRequest:
    """Tests for POST /auth/password-reset/request endpoint."""

    @pytest.mark.asyncio
    async def test_password_reset_request_valid_email(self, client, async_test_user):
        """Test password reset request with valid email."""
        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            mock_send.return_value = True

            response = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": async_test_user.email}
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True
            assert "reset link" in data["message"].lower()

            # Verify email was sent
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            assert call_args.kwargs["to_email"] == async_test_user.email
            assert call_args.kwargs["user_name"] == async_test_user.first_name
            assert "reset_token" in call_args.kwargs

    @pytest.mark.asyncio
    async def test_password_reset_request_nonexistent_email(self, client):
        """Test password reset request with non-existent email."""
        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            response = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "nonexistent@example.com"}
            )

            # Should still return success to prevent email enumeration
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True

            # Email should not be sent
            mock_send.assert_not_called()

    @pytest.mark.asyncio
    async def test_password_reset_request_inactive_user(self, client, async_test_db, async_test_user):
        """Test password reset request with inactive user."""
        # Deactivate user
        test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user_in_session = result.scalar_one_or_none()
            user_in_session.is_active = False
            await session.commit()

        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            response = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": async_test_user.email}
            )

            # Should still return success to prevent email enumeration
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True

            # Email should not be sent to inactive user
            mock_send.assert_not_called()

    @pytest.mark.asyncio
    async def test_password_reset_request_invalid_email_format(self, client):
        """Test password reset request with invalid email format."""
        response = await client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "not-an-email"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_password_reset_request_missing_email(self, client):
        """Test password reset request without email."""
        response = await client.post(
            "/api/v1/auth/password-reset/request",
            json={}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_password_reset_request_email_service_error(self, client, async_test_user):
        """Test password reset when email service fails."""
        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            mock_send.side_effect = Exception("SMTP Error")

            response = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": async_test_user.email}
            )

            # Should still return success even if email fails
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True

    @pytest.mark.asyncio
    async def test_password_reset_request_rate_limiting(self, client, async_test_user):
        """Test that password reset requests are rate limited."""
        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            mock_send.return_value = True

            # Make multiple requests quickly (3/minute limit)
            for _ in range(3):
                response = await client.post(
                    "/api/v1/auth/password-reset/request",
                    json={"email": async_test_user.email}
                )
                assert response.status_code == status.HTTP_200_OK


class TestPasswordResetConfirm:
    """Tests for POST /auth/password-reset/confirm endpoint."""

    @pytest.mark.asyncio
    async def test_password_reset_confirm_valid_token(self, client, async_test_user, async_test_db):
        """Test password reset confirmation with valid token."""
        # Generate valid token
        token = create_password_reset_token(async_test_user.email)
        new_password = "NewSecure123"

        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": token,
                "new_password": new_password
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "successfully" in data["message"].lower()

        # Verify user can login with new password
        test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            updated_user = result.scalar_one_or_none()
            from app.core.auth import verify_password
            assert verify_password(new_password, updated_user.password_hash) is True

    @pytest.mark.asyncio
    async def test_password_reset_confirm_expired_token(self, client, async_test_user):
        """Test password reset confirmation with expired token."""
        import time as time_module

        # Create token that expires immediately
        token = create_password_reset_token(async_test_user.email, expires_in=1)

        # Wait for token to expire
        time_module.sleep(2)

        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": token,
                "new_password": "NewSecure123"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        # Check custom error format
        assert data["success"] is False
        error_msg = data["errors"][0]["message"].lower() if "errors" in data else ""
        assert "invalid" in error_msg or "expired" in error_msg

    @pytest.mark.asyncio
    async def test_password_reset_confirm_invalid_token(self, client):
        """Test password reset confirmation with invalid token."""
        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": "invalid_token_xyz",
                "new_password": "NewSecure123"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["success"] is False
        error_msg = data["errors"][0]["message"].lower() if "errors" in data else ""
        assert "invalid" in error_msg or "expired" in error_msg

    @pytest.mark.asyncio
    async def test_password_reset_confirm_tampered_token(self, client, async_test_user):
        """Test password reset confirmation with tampered token."""
        import base64
        import json

        # Create valid token and tamper with it
        token = create_password_reset_token(async_test_user.email)
        decoded = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        token_data = json.loads(decoded)
        token_data["payload"]["email"] = "hacker@example.com"

        # Re-encode tampered token
        tampered = base64.urlsafe_b64encode(json.dumps(token_data).encode('utf-8')).decode('utf-8')

        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": tampered,
                "new_password": "NewSecure123"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_password_reset_confirm_nonexistent_user(self, client):
        """Test password reset confirmation for non-existent user."""
        # Create token for email that doesn't exist
        token = create_password_reset_token("nonexistent@example.com")

        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": token,
                "new_password": "NewSecure123"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["success"] is False
        error_msg = data["errors"][0]["message"].lower() if "errors" in data else ""
        assert "not found" in error_msg

    @pytest.mark.asyncio
    async def test_password_reset_confirm_inactive_user(self, client, async_test_user, async_test_db):
        """Test password reset confirmation for inactive user."""
        # Deactivate user
        test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            user_in_session = result.scalar_one_or_none()
            user_in_session.is_active = False
            await session.commit()

        token = create_password_reset_token(async_test_user.email)

        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": token,
                "new_password": "NewSecure123"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["success"] is False
        error_msg = data["errors"][0]["message"].lower() if "errors" in data else ""
        assert "inactive" in error_msg

    @pytest.mark.asyncio
    async def test_password_reset_confirm_weak_password(self, client, async_test_user):
        """Test password reset confirmation with weak password."""
        token = create_password_reset_token(async_test_user.email)

        # Test various weak passwords
        weak_passwords = [
            "short1",  # Too short
            "NoDigitsHere",  # No digits
            "no_uppercase123",  # No uppercase
        ]

        for weak_password in weak_passwords:
            response = await client.post(
                "/api/v1/auth/password-reset/confirm",
                json={
                    "token": token,
                    "new_password": weak_password
                }
            )

            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_password_reset_confirm_missing_fields(self, client):
        """Test password reset confirmation with missing fields."""
        # Missing token
        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"new_password": "NewSecure123"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Missing password
        token = create_password_reset_token("test@example.com")
        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_password_reset_confirm_database_error(self, client, async_test_user):
        """Test password reset confirmation with database error."""
        token = create_password_reset_token(async_test_user.email)

        # Mock the password update to raise an exception
        with patch('app.api.routes.auth.user_crud.update') as mock_update:
            mock_update.side_effect = Exception("Database error")

            response = await client.post(
                "/api/v1/auth/password-reset/confirm",
                json={
                    "token": token,
                    "new_password": "NewSecure123"
                }
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            data = response.json()
            assert data["success"] is False
            error_msg = data["errors"][0]["message"].lower() if "errors" in data else ""
            assert "error" in error_msg or "resetting" in error_msg

    @pytest.mark.asyncio
    async def test_password_reset_full_flow(self, client, async_test_user, async_test_db):
        """Test complete password reset flow."""
        original_password = async_test_user.password_hash
        new_password = "BrandNew123"

        # Step 1: Request password reset
        with patch('app.api.routes.auth.email_service.send_password_reset_email') as mock_send:
            mock_send.return_value = True

            response = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": async_test_user.email}
            )

            assert response.status_code == status.HTTP_200_OK

            # Extract token from mock call
            call_args = mock_send.call_args
            reset_token = call_args.kwargs["reset_token"]

        # Step 2: Confirm password reset
        response = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={
                "token": reset_token,
                "new_password": new_password
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Step 3: Verify old password doesn't work
        test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == async_test_user.id))
            updated_user = result.scalar_one_or_none()
            from app.core.auth import verify_password
            assert updated_user.password_hash != original_password

        # Step 4: Verify new password works
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": async_test_user.email,
                "password": new_password
            }
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
