# tests/api/test_auth_error_handlers.py
"""
Tests for auth route exception handlers and error paths.
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import status


class TestLoginSessionCreationFailure:
    """Test login when session creation fails."""

    @pytest.mark.asyncio
    async def test_login_succeeds_despite_session_creation_failure(self, client, async_test_user):
        """Test that login succeeds even if session creation fails."""
        # Mock session creation to fail
        with patch('app.api.routes.auth.session_crud.create_session', side_effect=Exception("Session creation failed")):
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "testuser@example.com",
                    "password": "TestPassword123!"
                }
            )

            # Login should still succeed, just without session record
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data


class TestOAuthLoginSessionCreationFailure:
    """Test OAuth login when session creation fails."""

    @pytest.mark.asyncio
    async def test_oauth_login_succeeds_despite_session_failure(self, client, async_test_user):
        """Test OAuth login succeeds even if session creation fails."""
        with patch('app.api.routes.auth.session_crud.create_session', side_effect=Exception("Session failed")):
            response = await client.post(
                "/api/v1/auth/login/oauth",
                data={
                    "username": "testuser@example.com",
                    "password": "TestPassword123!"
                }
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data


class TestRefreshTokenSessionUpdateFailure:
    """Test refresh token when session update fails."""

    @pytest.mark.asyncio
    async def test_refresh_token_succeeds_despite_session_update_failure(self, client, async_test_user):
        """Test that token refresh succeeds even if session update fails."""
        # First login to get tokens
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
        )
        tokens = response.json()

        # Mock session update to fail
        with patch('app.api.routes.auth.session_crud.update_refresh_token', side_effect=Exception("Update failed")):
            response = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": tokens["refresh_token"]}
            )

            # Should still succeed - tokens are issued before update
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data


class TestLogoutWithExpiredToken:
    """Test logout with expired/invalid token."""

    @pytest.mark.asyncio
    async def test_logout_with_invalid_token_still_succeeds(self, client, async_test_user):
        """Test logout succeeds even with invalid refresh token."""
        # Login first
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
        )
        access_token = response.json()["access_token"]

        # Try logout with invalid refresh token
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"refresh_token": "invalid.token.here"}
        )

        # Should succeed (idempotent)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True


class TestLogoutWithNonExistentSession:
    """Test logout when session doesn't exist."""

    @pytest.mark.asyncio
    async def test_logout_with_no_session_succeeds(self, client, async_test_user):
        """Test logout succeeds even if session not found."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
        )
        tokens = response.json()

        # Mock session lookup to return None
        with patch('app.api.routes.auth.session_crud.get_by_jti', return_value=None):
            response = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
                json={"refresh_token": tokens["refresh_token"]}
            )

            # Should succeed (idempotent)
            assert response.status_code == status.HTTP_200_OK


class TestLogoutUnexpectedError:
    """Test logout with unexpected errors."""

    @pytest.mark.asyncio
    async def test_logout_with_unexpected_error_returns_success(self, client, async_test_user):
        """Test logout returns success even on unexpected errors."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
        )
        tokens = response.json()

        # Mock to raise unexpected error
        with patch('app.api.routes.auth.session_crud.get_by_jti', side_effect=Exception("Unexpected error")):
            response = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
                json={"refresh_token": tokens["refresh_token"]}
            )

            # Should still return success (don't expose errors)
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True


class TestLogoutAllUnexpectedError:
    """Test logout-all with unexpected errors."""

    @pytest.mark.asyncio
    async def test_logout_all_database_error(self, client, async_test_user):
        """Test logout-all handles database errors."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
        )
        access_token = response.json()["access_token"]

        # Mock to raise database error
        with patch('app.api.routes.auth.session_crud.deactivate_all_user_sessions', side_effect=Exception("DB error")):
            response = await client.post(
                "/api/v1/auth/logout-all",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestPasswordResetConfirmSessionInvalidation:
    """Test password reset invalidates sessions."""

    @pytest.mark.asyncio
    async def test_password_reset_continues_despite_session_invalidation_failure(self, client, async_test_user):
        """Test password reset succeeds even if session invalidation fails."""
        # Create a valid password reset token
        from app.utils.security import create_password_reset_token

        token = create_password_reset_token(async_test_user.email)

        # Mock session invalidation to fail
        with patch('app.api.routes.auth.session_crud.deactivate_all_user_sessions', side_effect=Exception("Invalidation failed")):
            response = await client.post(
                "/api/v1/auth/password-reset/confirm",
                json={
                    "token": token,
                    "new_password": "NewPassword123!"
                }
            )

            # Should still succeed - password was reset
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] is True
