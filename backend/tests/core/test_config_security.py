"""
Security tests for configuration validation (app/core/config.py).

Critical security tests covering:
- SECRET_KEY minimum length validation (prevents weak JWT signing keys)

These tests prevent security misconfigurations.
"""
import pytest
import os
from pydantic import ValidationError


class TestSecretKeySecurityValidation:
    """
    Test SECRET_KEY security validation (config.py line 109).

    Attack Prevention:
    Short SECRET_KEYs can be brute-forced, compromising JWT token security.
    System must enforce minimum 32-character requirement.

    Covers: config.py:109
    """

    def test_secret_key_too_short_rejected(self):
        """
        Test that SECRET_KEY shorter than 32 characters is rejected.

        Security Risk:
        Short keys (e.g., "password123") can be brute-forced, allowing
        attackers to forge JWT tokens.

        Covers line 109.
        """
        # Save original SECRET_KEY
        original_secret = os.environ.get("SECRET_KEY")

        try:
            # Try to set a short SECRET_KEY (only 20 characters)
            short_key = "a" * 20  # Too short!
            os.environ["SECRET_KEY"] = short_key

            # Import Settings class fresh (to pick up new env var)
            # The ValidationError should be raised during reload when Settings() is instantiated
            import importlib
            from app.core import config

            # Reload will raise ValidationError because Settings() is instantiated at module level
            with pytest.raises(ValidationError, match="at least 32 characters"):
                importlib.reload(config)

        finally:
            # Restore original SECRET_KEY
            if original_secret:
                os.environ["SECRET_KEY"] = original_secret
            else:
                os.environ.pop("SECRET_KEY", None)

            # Reload config to restore original settings
            import importlib
            from app.core import config
            importlib.reload(config)

    def test_secret_key_exactly_32_characters_accepted(self):
        """
        Test that SECRET_KEY with exactly 32 characters is accepted.

        Minimum secure length.
        """
        original_secret = os.environ.get("SECRET_KEY")

        try:
            # Set exactly 32-character key
            key_32 = "a" * 32
            os.environ["SECRET_KEY"] = key_32

            import importlib
            from app.core import config
            importlib.reload(config)

            # Should work
            settings = config.Settings()
            assert len(settings.SECRET_KEY) == 32

        finally:
            if original_secret:
                os.environ["SECRET_KEY"] = original_secret
            else:
                os.environ.pop("SECRET_KEY", None)

            import importlib
            from app.core import config
            importlib.reload(config)

    def test_secret_key_long_enough_accepted(self):
        """
        Test that SECRET_KEY with 32+ characters is accepted.

        Sanity check that valid keys work.
        """
        original_secret = os.environ.get("SECRET_KEY")

        try:
            # Set long key (64 characters)
            key_64 = "a" * 64
            os.environ["SECRET_KEY"] = key_64

            import importlib
            from app.core import config
            importlib.reload(config)

            # Should work
            settings = config.Settings()
            assert len(settings.SECRET_KEY) >= 32

        finally:
            if original_secret:
                os.environ["SECRET_KEY"] = original_secret
            else:
                os.environ.pop("SECRET_KEY", None)

            import importlib
            from app.core import config
            importlib.reload(config)

    def test_default_secret_key_meets_requirements(self):
        """
        Test that the default SECRET_KEY (if no env var) meets requirements.

        Ensures our defaults are secure.
        """
        from app.core.config import settings

        # Current settings should have valid SECRET_KEY
        assert len(settings.SECRET_KEY) >= 32, "Default SECRET_KEY must be at least 32 chars"
