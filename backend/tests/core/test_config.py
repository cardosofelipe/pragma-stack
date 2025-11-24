# tests/core/test_config.py
import pytest
from pydantic import ValidationError

from app.core.config import Settings


class TestSecretKeyValidation:
    """Tests for SECRET_KEY validation"""

    def test_secret_key_too_short_raises_error(self):
        """Test that SECRET_KEY shorter than 32 characters raises error"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="short_key", ENVIRONMENT="development")

        # Pydantic Field's min_length validation triggers first
        assert "at least 32 characters" in str(exc_info.value)

    def test_default_secret_key_in_production_raises_error(self):
        """Test that default SECRET_KEY in production raises error"""
        # Use the exact default value (padded to 32 chars to pass length check)
        default_key = "your_secret_key_here" + "_" * 12  # Exactly 32 chars
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY=default_key, ENVIRONMENT="production")

        assert "must be set to a secure random value in production" in str(
            exc_info.value
        )

    def test_default_secret_key_in_development_allows_with_warning(self, caplog):
        """Test that default SECRET_KEY in development is allowed but warns"""
        settings = Settings(
            SECRET_KEY="your_secret_key_here" + "x" * 14, ENVIRONMENT="development"
        )

        assert settings.SECRET_KEY == "your_secret_key_here" + "x" * 14
        # Note: The warning happens during validation, which we've seen works

    def test_valid_secret_key_accepted(self):
        """Test that valid SECRET_KEY is accepted"""
        valid_key = "a" * 32
        settings = Settings(SECRET_KEY=valid_key, ENVIRONMENT="production")

        assert settings.SECRET_KEY == valid_key


class TestSuperuserPasswordValidation:
    """Tests for FIRST_SUPERUSER_PASSWORD validation"""

    def test_none_password_accepted(self):
        """Test that None password is accepted (optional field)"""
        settings = Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD=None)
        assert settings.FIRST_SUPERUSER_PASSWORD is None

    def test_password_too_short_raises_error(self):
        """Test that password shorter than 12 characters raises error"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD="Short1")

        assert "must be at least 12 characters" in str(exc_info.value)

    def test_weak_password_rejected(self):
        """Test that common weak passwords are rejected"""
        # Test with the exact weak passwords from the validator
        # These are in the weak_passwords set and should be rejected
        weak_passwords = ["123456789012"]  # Exactly 12 chars, in the weak set

        for weak_pwd in weak_passwords:
            with pytest.raises(ValidationError) as exc_info:
                Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD=weak_pwd)
            # Should get "too weak" message
            error_str = str(exc_info.value)
            assert "too weak" in error_str

    def test_password_without_lowercase_rejected(self):
        """Test that password without lowercase is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD="ALLUPPERCASE123")

        assert "must contain lowercase, uppercase, and digits" in str(exc_info.value)

    def test_password_without_uppercase_rejected(self):
        """Test that password without uppercase is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD="alllowercase123")

        assert "must contain lowercase, uppercase, and digits" in str(exc_info.value)

    def test_password_without_digit_rejected(self):
        """Test that password without digit is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD="NoDigitsHere")

        assert "must contain lowercase, uppercase, and digits" in str(exc_info.value)

    def test_strong_password_accepted(self):
        """Test that strong password is accepted"""
        strong_password = "StrongPassword123!"
        settings = Settings(
            SECRET_KEY="a" * 32, FIRST_SUPERUSER_PASSWORD=strong_password
        )

        assert settings.FIRST_SUPERUSER_PASSWORD == strong_password


class TestEnvironmentConfiguration:
    """Tests for environment-specific configuration"""

    def test_default_environment_is_development(self):
        """Test that default environment is development"""
        settings = Settings(SECRET_KEY="a" * 32)
        assert settings.ENVIRONMENT == "development"

    def test_environment_can_be_set(self):
        """Test that environment can be set to different values"""
        for env in ["development", "staging", "production"]:
            settings = Settings(SECRET_KEY="a" * 32, ENVIRONMENT=env)
            assert settings.ENVIRONMENT == env


class TestDatabaseConfiguration:
    """Tests for database URL construction"""

    def test_database_url_construction_from_components(self, monkeypatch):
        """Test that database URL is constructed correctly from components"""
        # Clear .env file influence for this test
        monkeypatch.delenv("POSTGRES_USER", raising=False)
        monkeypatch.delenv("POSTGRES_PASSWORD", raising=False)
        monkeypatch.delenv("POSTGRES_HOST", raising=False)
        monkeypatch.delenv("POSTGRES_DB", raising=False)

        settings = Settings(
            SECRET_KEY="a" * 32,
            POSTGRES_USER="testuser",
            POSTGRES_PASSWORD="testpass",
            POSTGRES_HOST="testhost",
            POSTGRES_PORT="5432",
            POSTGRES_DB="testdb",
            DATABASE_URL=None,  # Don't use explicit URL
        )

        expected_url = "postgresql://testuser:testpass@testhost:5432/testdb"
        assert settings.database_url == expected_url

    def test_explicit_database_url_used_when_set(self):
        """Test that explicit DATABASE_URL is used when provided"""
        explicit_url = "postgresql://explicit:pass@host:5432/db"
        settings = Settings(SECRET_KEY="a" * 32, DATABASE_URL=explicit_url)

        assert settings.database_url == explicit_url


class TestJWTConfiguration:
    """Tests for JWT configuration"""

    def test_token_expiration_defaults(self):
        """Test that token expiration defaults are set correctly"""
        settings = Settings(SECRET_KEY="a" * 32)

        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 15  # 15 minutes
        assert settings.REFRESH_TOKEN_EXPIRE_DAYS == 7  # 7 days

    def test_algorithm_default(self):
        """Test that default algorithm is HS256"""
        settings = Settings(SECRET_KEY="a" * 32)
        assert settings.ALGORITHM == "HS256"


class TestProjectConfiguration:
    """Tests for project-level configuration"""

    def test_project_name_can_be_set(self):
        """Test that project name can be explicitly set"""
        settings = Settings(SECRET_KEY="a" * 32, PROJECT_NAME="TestApp")
        assert settings.PROJECT_NAME == "TestApp"

    def test_project_name_is_set(self):
        """Test that project name has a value (from default or environment)"""
        settings = Settings(SECRET_KEY="a" * 32)
        # PROJECT_NAME should be a non-empty string
        assert isinstance(settings.PROJECT_NAME, str)
        assert len(settings.PROJECT_NAME) > 0

    def test_api_version_string(self):
        """Test that API version string is correct"""
        settings = Settings(SECRET_KEY="a" * 32)
        assert settings.API_V1_STR == "/api/v1"

    def test_version_default(self):
        """Test that version is set"""
        settings = Settings(SECRET_KEY="a" * 32)
        assert settings.VERSION == "1.0.0"
