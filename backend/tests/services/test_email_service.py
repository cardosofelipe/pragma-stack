# tests/services/test_email_service.py
"""
Tests for email service functionality.
"""

from unittest.mock import AsyncMock

import pytest

from app.services.email_service import (
    ConsoleEmailBackend,
    EmailService,
    SMTPEmailBackend,
)


class TestConsoleEmailBackend:
    """Tests for ConsoleEmailBackend."""

    @pytest.mark.asyncio
    async def test_send_email_basic(self):
        """Test basic email sending with console backend."""
        backend = ConsoleEmailBackend()

        result = await backend.send_email(
            to=["user@example.com"],
            subject="Test Subject",
            html_content="<p>Test HTML</p>",
            text_content="Test Text",
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_email_without_text_content(self):
        """Test sending email without plain text version."""
        backend = ConsoleEmailBackend()

        result = await backend.send_email(
            to=["user@example.com"],
            subject="Test Subject",
            html_content="<p>Test HTML</p>",
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_email_multiple_recipients(self):
        """Test sending email to multiple recipients."""
        backend = ConsoleEmailBackend()

        result = await backend.send_email(
            to=["user1@example.com", "user2@example.com"],
            subject="Test Subject",
            html_content="<p>Test HTML</p>",
        )

        assert result is True


class TestSMTPEmailBackend:
    """Tests for SMTPEmailBackend."""

    @pytest.mark.asyncio
    async def test_smtp_backend_initialization(self):
        """Test SMTP backend initialization."""
        backend = SMTPEmailBackend(
            host="smtp.example.com",
            port=587,
            username="test@example.com",
            password="password",
        )

        assert backend.host == "smtp.example.com"
        assert backend.port == 587
        assert backend.username == "test@example.com"
        assert backend.password == "password"

    @pytest.mark.asyncio
    async def test_smtp_backend_fallback_to_console(self):
        """Test that SMTP backend falls back to console when not implemented."""
        backend = SMTPEmailBackend(
            host="smtp.example.com",
            port=587,
            username="test@example.com",
            password="password",
        )

        # Should fall back to console backend since SMTP is not implemented
        result = await backend.send_email(
            to=["user@example.com"],
            subject="Test Subject",
            html_content="<p>Test HTML</p>",
        )

        assert result is True


class TestEmailService:
    """Tests for EmailService."""

    def test_email_service_default_backend(self):
        """Test that EmailService uses ConsoleEmailBackend by default."""
        service = EmailService()
        assert isinstance(service.backend, ConsoleEmailBackend)

    def test_email_service_custom_backend(self):
        """Test EmailService with custom backend."""
        custom_backend = ConsoleEmailBackend()
        service = EmailService(backend=custom_backend)
        assert service.backend is custom_backend

    @pytest.mark.asyncio
    async def test_send_password_reset_email(self):
        """Test sending password reset email."""
        service = EmailService()

        result = await service.send_password_reset_email(
            to_email="user@example.com", reset_token="test_token_123", user_name="John"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_password_reset_email_without_name(self):
        """Test sending password reset email without user name."""
        service = EmailService()

        result = await service.send_password_reset_email(
            to_email="user@example.com", reset_token="test_token_123"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_password_reset_email_includes_token_in_url(self):
        """Test that password reset email includes token in URL."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(return_value=True)
        service = EmailService(backend=backend_mock)

        token = "test_reset_token_xyz"
        await service.send_password_reset_email(
            to_email="user@example.com", reset_token=token
        )

        # Verify send_email was called
        backend_mock.send_email.assert_called_once()
        call_args = backend_mock.send_email.call_args

        # Check that token is in the HTML content
        html_content = call_args.kwargs["html_content"]
        assert token in html_content

    @pytest.mark.asyncio
    async def test_send_password_reset_email_error_handling(self):
        """Test error handling in password reset email."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(side_effect=Exception("SMTP Error"))
        service = EmailService(backend=backend_mock)

        result = await service.send_password_reset_email(
            to_email="user@example.com", reset_token="test_token"
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_send_email_verification(self):
        """Test sending email verification email."""
        service = EmailService()

        result = await service.send_email_verification(
            to_email="user@example.com",
            verification_token="verification_token_123",
            user_name="Jane",
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_email_verification_without_name(self):
        """Test sending email verification without user name."""
        service = EmailService()

        result = await service.send_email_verification(
            to_email="user@example.com", verification_token="verification_token_123"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_email_verification_includes_token(self):
        """Test that email verification includes token in URL."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(return_value=True)
        service = EmailService(backend=backend_mock)

        token = "test_verification_token_xyz"
        await service.send_email_verification(
            to_email="user@example.com", verification_token=token
        )

        # Verify send_email was called
        backend_mock.send_email.assert_called_once()
        call_args = backend_mock.send_email.call_args

        # Check that token is in the HTML content
        html_content = call_args.kwargs["html_content"]
        assert token in html_content

    @pytest.mark.asyncio
    async def test_send_email_verification_error_handling(self):
        """Test error handling in email verification."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(side_effect=Exception("Email Error"))
        service = EmailService(backend=backend_mock)

        result = await service.send_email_verification(
            to_email="user@example.com", verification_token="test_token"
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_password_reset_email_contains_required_elements(self):
        """Test that password reset email has all required elements."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(return_value=True)
        service = EmailService(backend=backend_mock)

        await service.send_password_reset_email(
            to_email="user@example.com", reset_token="token123", user_name="Test User"
        )

        call_args = backend_mock.send_email.call_args
        html_content = call_args.kwargs["html_content"]
        text_content = call_args.kwargs["text_content"]

        # Check HTML content
        assert "Password Reset" in html_content
        assert "token123" in html_content
        assert "Test User" in html_content

        # Check text content
        assert (
            "Password Reset" in text_content or "password reset" in text_content.lower()
        )
        assert "token123" in text_content

    @pytest.mark.asyncio
    async def test_verification_email_contains_required_elements(self):
        """Test that verification email has all required elements."""
        backend_mock = AsyncMock(spec=ConsoleEmailBackend)
        backend_mock.send_email = AsyncMock(return_value=True)
        service = EmailService(backend=backend_mock)

        await service.send_email_verification(
            to_email="user@example.com",
            verification_token="verify123",
            user_name="Test User",
        )

        call_args = backend_mock.send_email.call_args
        html_content = call_args.kwargs["html_content"]
        text_content = call_args.kwargs["text_content"]

        # Check HTML content
        assert "Verify" in html_content
        assert "verify123" in html_content
        assert "Test User" in html_content

        # Check text content
        assert "verify" in text_content.lower()
        assert "verify123" in text_content
