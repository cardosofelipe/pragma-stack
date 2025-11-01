# app/services/email_service.py
"""
Email service with placeholder implementation.

This service provides email sending functionality with a simple console/log-based
placeholder that can be easily replaced with a real email provider (SendGrid, SES, etc.)
"""
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailBackend(ABC):
    """Abstract base class for email backends."""

    @abstractmethod
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email."""
        pass


class ConsoleEmailBackend(EmailBackend):
    """
    Console/log-based email backend for development and testing.

    This backend logs email content instead of actually sending emails.
    Replace this with a real backend (SMTP, SendGrid, SES) for production.
    """

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Log email content to console/logs.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_content: HTML version of the email
            text_content: Plain text version of the email

        Returns:
            True if "sent" successfully
        """
        logger.info("=" * 80)
        logger.info("EMAIL SENT (Console Backend)")
        logger.info("=" * 80)
        logger.info(f"To: {', '.join(to)}")
        logger.info(f"Subject: {subject}")
        logger.info("-" * 80)
        if text_content:
            logger.info("Plain Text Content:")
            logger.info(text_content)
            logger.info("-" * 80)
        logger.info("HTML Content:")
        logger.info(html_content)
        logger.info("=" * 80)
        return True


class SMTPEmailBackend(EmailBackend):
    """
    SMTP email backend for production use.

    TODO: Implement SMTP sending with proper error handling.
    This is a placeholder for future implementation.
    """

    def __init__(self, host: str, port: int, username: str, password: str):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via SMTP."""
        # TODO: Implement SMTP sending
        logger.warning("SMTP backend not yet implemented, falling back to console")
        console_backend = ConsoleEmailBackend()
        return await console_backend.send_email(to, subject, html_content, text_content)


class EmailService:
    """
    High-level email service that uses different backends.

    This service provides a clean interface for sending various types of emails
    and can be configured to use different backends (console, SMTP, SendGrid, etc.)
    """

    def __init__(self, backend: Optional[EmailBackend] = None):
        """
        Initialize email service with a backend.

        Args:
            backend: Email backend to use. Defaults to ConsoleEmailBackend.
        """
        self.backend = backend or ConsoleEmailBackend()

    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send password reset email.

        Args:
            to_email: Recipient email address
            reset_token: Password reset token
            user_name: User's name for personalization

        Returns:
            True if email sent successfully
        """
        # Generate reset URL
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        # Prepare email content
        subject = "Password Reset Request"

        # Plain text version
        text_content = f"""
Hello{' ' + user_name if user_name else ''},

You requested a password reset for your account. Click the link below to reset your password:

{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The {settings.PROJECT_NAME} Team
"""

        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4CAF50;
                   color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .footer {{ padding: 20px; text-align: center; color: #777; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p>Hello{' ' + user_name if user_name else ''},</p>
            <p>You requested a password reset for your account. Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4CAF50;">{reset_url}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>The {settings.PROJECT_NAME} Team</p>
        </div>
    </div>
</body>
</html>
"""

        try:
            return await self.backend.send_email(
                to=[to_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
            return False

    async def send_email_verification(
        self,
        to_email: str,
        verification_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send email verification email.

        Args:
            to_email: Recipient email address
            verification_token: Email verification token
            user_name: User's name for personalization

        Returns:
            True if email sent successfully
        """
        # Generate verification URL
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

        # Prepare email content
        subject = "Verify Your Email Address"

        # Plain text version
        text_content = f"""
Hello{' ' + user_name if user_name else ''},

Thank you for signing up! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
The {settings.PROJECT_NAME} Team
"""

        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #2196F3;
                   color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .footer {{ padding: 20px; text-align: center; color: #777; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email</h1>
        </div>
        <div class="content">
            <p>Hello{' ' + user_name if user_name else ''},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2196F3;">{verification_url}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>The {settings.PROJECT_NAME} Team</p>
        </div>
    </div>
</body>
</html>
"""

        try:
            return await self.backend.send_email(
                to=[to_email],
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()
