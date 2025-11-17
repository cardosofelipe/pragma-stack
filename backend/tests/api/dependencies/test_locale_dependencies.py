# tests/api/dependencies/test_locale_dependencies.py
import uuid
from unittest.mock import MagicMock

import pytest
import pytest_asyncio

from app.api.dependencies.locale import (
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    get_locale,
    parse_accept_language,
)
from app.core.auth import get_password_hash
from app.models.user import User


class TestParseAcceptLanguage:
    """Tests for parse_accept_language helper function"""

    def test_parse_empty_header(self):
        """Test with empty Accept-Language header"""
        result = parse_accept_language("")
        assert result is None

    def test_parse_none_header(self):
        """Test with None Accept-Language header"""
        result = parse_accept_language(None)
        assert result is None

    def test_parse_italian_exact_match(self):
        """Test parsing Italian with exact match"""
        result = parse_accept_language("it-IT,it;q=0.9,en;q=0.8")
        assert result == "it-it"

    def test_parse_italian_language_code_only(self):
        """Test parsing Italian with only language code"""
        result = parse_accept_language("it,en;q=0.8")
        assert result == "it"

    def test_parse_english_us(self):
        """Test parsing English (US)"""
        result = parse_accept_language("en-US,en;q=0.9")
        assert result == "en-us"

    def test_parse_english_language_code(self):
        """Test parsing English with only language code"""
        result = parse_accept_language("en")
        assert result == "en"

    def test_parse_unsupported_language(self):
        """Test parsing unsupported language (French)"""
        result = parse_accept_language("fr-FR,fr;q=0.9,de;q=0.8")
        assert result is None

    def test_parse_mixed_supported_unsupported(self):
        """Test with mix of supported and unsupported, should pick first supported"""
        # French first (unsupported), then Italian (supported)
        result = parse_accept_language("fr-FR,fr;q=0.9,it;q=0.8")
        assert result == "it"

    def test_parse_quality_values(self):
        """Test that quality values are respected (first = highest priority)"""
        # English has higher implicit priority (no q value means q=1.0)
        result = parse_accept_language("en,it;q=0.9")
        assert result == "en"

    def test_parse_complex_header(self):
        """Test complex Accept-Language header with multiple locales"""
        result = parse_accept_language(
            "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7,fr;q=0.6"
        )
        assert result == "it-it"

    def test_parse_whitespace_handling(self):
        """Test that whitespace is handled correctly"""
        result = parse_accept_language(" it-IT , it ; q=0.9 , en ; q=0.8 ")
        assert result == "it-it"

    def test_parse_case_insensitive(self):
        """Test that locale matching is case-insensitive"""
        result = parse_accept_language("IT-it,EN-us;q=0.9")
        # Should normalize to lowercase
        assert result == "it-it"

    def test_parse_fallback_to_language_code(self):
        """Test fallback from region-specific to language code"""
        # it-CH (Switzerland) not supported, but "it" is
        result = parse_accept_language("it-CH,en;q=0.8")
        assert result == "it"


@pytest_asyncio.fixture
async def async_user_with_locale_en(async_test_db):
    """Async fixture to create a user with 'en' locale preference"""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="user_en@example.com",
            password_hash=get_password_hash("password123"),
            first_name="English",
            last_name="User",
            is_active=True,
            is_superuser=False,
            locale="en",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def async_user_with_locale_it(async_test_db):
    """Async fixture to create a user with 'it' locale preference"""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="user_it@example.com",
            password_hash=get_password_hash("password123"),
            first_name="Italian",
            last_name="User",
            is_active=True,
            is_superuser=False,
            locale="it",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def async_user_without_locale(async_test_db):
    """Async fixture to create a user without locale preference"""
    _test_engine, AsyncTestingSessionLocal = async_test_db
    async with AsyncTestingSessionLocal() as session:
        user = User(
            id=uuid.uuid4(),
            email="user_no_locale@example.com",
            password_hash=get_password_hash("password123"),
            first_name="No",
            last_name="Locale",
            is_active=True,
            is_superuser=False,
            locale=None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


class TestGetLocale:
    """Tests for get_locale dependency"""

    @pytest.mark.asyncio
    async def test_locale_from_user_preference_en(self, async_user_with_locale_en):
        """Test locale detection from authenticated user's saved preference (en)"""
        # Mock request with no Accept-Language header
        mock_request = MagicMock()
        mock_request.headers = {}

        result = await get_locale(
            request=mock_request, current_user=async_user_with_locale_en
        )

        assert result == "en"

    @pytest.mark.asyncio
    async def test_locale_from_user_preference_it(self, async_user_with_locale_it):
        """Test locale detection from authenticated user's saved preference (it)"""
        # Mock request with no Accept-Language header
        mock_request = MagicMock()
        mock_request.headers = {}

        result = await get_locale(
            request=mock_request, current_user=async_user_with_locale_it
        )

        assert result == "it"

    @pytest.mark.asyncio
    async def test_user_preference_overrides_accept_language(
        self, async_user_with_locale_en
    ):
        """Test that user preference takes precedence over Accept-Language header"""
        # Mock request with Italian Accept-Language, but user has English preference
        mock_request = MagicMock()
        mock_request.headers = {"accept-language": "it-IT,it;q=0.9"}

        result = await get_locale(
            request=mock_request, current_user=async_user_with_locale_en
        )

        # Should return user preference, not Accept-Language
        assert result == "en"

    @pytest.mark.asyncio
    async def test_locale_from_accept_language_header(
        self, async_user_without_locale
    ):
        """Test locale detection from Accept-Language header when user has no preference"""
        # Mock request with Italian Accept-Language (it-IT has highest priority)
        mock_request = MagicMock()
        mock_request.headers = {"accept-language": "it-IT,it;q=0.9,en;q=0.8"}

        result = await get_locale(
            request=mock_request, current_user=async_user_without_locale
        )

        # Should return "it-it" (normalized from "it-IT", the first/highest priority locale)
        assert result == "it-it"

    @pytest.mark.asyncio
    async def test_locale_from_accept_language_unauthenticated(self):
        """Test locale detection from Accept-Language header for unauthenticated user"""
        # Mock request with Italian Accept-Language (it-IT has highest priority)
        mock_request = MagicMock()
        mock_request.headers = {"accept-language": "it-IT,it;q=0.9,en;q=0.8"}

        result = await get_locale(request=mock_request, current_user=None)

        # Should return "it-it" (normalized from "it-IT", the first/highest priority locale)
        assert result == "it-it"

    @pytest.mark.asyncio
    async def test_default_locale_no_user_no_header(self):
        """Test fallback to default locale when no user and no Accept-Language header"""
        # Mock request with no Accept-Language header
        mock_request = MagicMock()
        mock_request.headers = {}

        result = await get_locale(request=mock_request, current_user=None)

        assert result == DEFAULT_LOCALE
        assert result == "en"

    @pytest.mark.asyncio
    async def test_default_locale_unsupported_language(self):
        """Test fallback to default when Accept-Language has only unsupported languages"""
        # Mock request with French (unsupported)
        mock_request = MagicMock()
        mock_request.headers = {"accept-language": "fr-FR,fr;q=0.9,de;q=0.8"}

        result = await get_locale(request=mock_request, current_user=None)

        assert result == DEFAULT_LOCALE
        assert result == "en"

    @pytest.mark.asyncio
    async def test_validate_supported_locale_in_db(self, async_user_with_locale_it):
        """Test that saved locale is validated against SUPPORTED_LOCALES"""
        # This test verifies the locale in DB is actually supported
        assert async_user_with_locale_it.locale in SUPPORTED_LOCALES

        mock_request = MagicMock()
        mock_request.headers = {}

        result = await get_locale(
            request=mock_request, current_user=async_user_with_locale_it
        )

        assert result == "it"
        assert result in SUPPORTED_LOCALES

    @pytest.mark.asyncio
    async def test_accept_language_case_variations(self):
        """Test different case variations in Accept-Language header"""
        # All return values are lowercase for consistency
        test_cases = [
            ("it-IT,en;q=0.8", "it-it"),
            ("IT-it,en;q=0.8", "it-it"),
            ("en-US,it;q=0.8", "en-us"),
            ("EN,it;q=0.8", "en"),
        ]

        for accept_lang, expected in test_cases:
            mock_request = MagicMock()
            mock_request.headers = {"accept-language": accept_lang}

            result = await get_locale(request=mock_request, current_user=None)

            assert result == expected

    @pytest.mark.asyncio
    async def test_accept_language_with_quality_values(self):
        """Test Accept-Language parsing respects quality values (priority)"""
        # English has implicit q=1.0, Italian has q=0.9
        mock_request = MagicMock()
        mock_request.headers = {"accept-language": "en,it;q=0.9"}

        result = await get_locale(request=mock_request, current_user=None)

        # Should return English (higher priority)
        assert result == "en"

    @pytest.mark.asyncio
    async def test_supported_locales_constant(self):
        """Test that SUPPORTED_LOCALES contains expected locales"""
        # Note: SUPPORTED_LOCALES uses lowercase for case-insensitive matching
        assert "en" in SUPPORTED_LOCALES
        assert "it" in SUPPORTED_LOCALES
        assert "en-us" in SUPPORTED_LOCALES
        assert "en-gb" in SUPPORTED_LOCALES
        assert "it-it" in SUPPORTED_LOCALES

        # Verify total count matches implementation plan (5 locales for EN/IT showcase)
        assert len(SUPPORTED_LOCALES) == 5

    @pytest.mark.asyncio
    async def test_default_locale_constant(self):
        """Test that DEFAULT_LOCALE is English"""
        assert DEFAULT_LOCALE == "en"
        assert DEFAULT_LOCALE in SUPPORTED_LOCALES
