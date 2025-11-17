# app/api/dependencies/locale.py
"""
Locale detection dependency for internationalization (i18n).

Implements a three-tier fallback system:
1. User's saved preference (if authenticated and user.locale is set)
2. Accept-Language header (for unauthenticated users or no saved preference)
3. Default to English ("en")
"""

from fastapi import Depends, Request

from app.api.dependencies.auth import get_optional_current_user
from app.models.user import User

# Supported locales (BCP 47 format)
# Template showcases English and Italian
# Users can extend by adding more locales here
# Note: Stored in lowercase for case-insensitive matching
SUPPORTED_LOCALES = {"en", "it", "en-us", "en-gb", "it-it"}
DEFAULT_LOCALE = "en"


def parse_accept_language(accept_language: str) -> str | None:
    """
    Parse the Accept-Language header and return the best matching supported locale.

    The Accept-Language header format is:
    "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7"

    This function extracts locales in priority order (by quality value) and returns
    the first one that matches our supported locales.

    Args:
        accept_language: The Accept-Language header value

    Returns:
        The best matching locale code, or None if no match found

    Examples:
        >>> parse_accept_language("it-IT,it;q=0.9,en;q=0.8")
        "it-IT"  # or "it" if it-IT is not supported
        >>> parse_accept_language("fr-FR,fr;q=0.9")
        None  # French not supported
    """
    if not accept_language:
        return None

    # Split by comma to get individual locale entries
    # Format: "locale;q=weight" or just "locale"
    locales = []
    for entry in accept_language.split(","):
        # Remove quality value (;q=0.9) if present
        locale = entry.split(";")[0].strip()
        if locale:
            locales.append(locale)

    # Check each locale in priority order
    for locale in locales:
        locale_lower = locale.lower()

        # Try exact match first (e.g., "it-IT")
        if locale_lower in SUPPORTED_LOCALES:
            return locale_lower

        # Try language code only (e.g., "it" from "it-IT")
        lang_code = locale_lower.split("-")[0]
        if lang_code in SUPPORTED_LOCALES:
            return lang_code

    return None


async def get_locale(
    request: Request,
    current_user: User | None = Depends(get_optional_current_user),
) -> str:
    """
    Detect and return the appropriate locale for the current request.

    Three-tier fallback system:
    1. **User Preference** (highest priority)
       - If user is authenticated and has a saved locale preference, use it
       - This persists across sessions and devices

    2. **Accept-Language Header** (second priority)
       - Parse the Accept-Language header from the request
       - Match against supported locales
       - Common for browser requests

    3. **Default Locale** (fallback)
       - Return "en" (English) if no user preference and no header match

    Args:
        request: The FastAPI request object (for accessing headers)
        current_user: The current authenticated user (optional)

    Returns:
        A valid locale code from SUPPORTED_LOCALES (guaranteed to be supported)

    Examples:
        >>> # Authenticated user with saved preference
        >>> await get_locale(request, user_with_locale_it)
        "it"

        >>> # Unauthenticated user with Italian browser
        >>> # (request has Accept-Language: it-IT,it;q=0.9)
        >>> await get_locale(request, None)
        "it"

        >>> # Unauthenticated user with unsupported language
        >>> # (request has Accept-Language: fr-FR,fr;q=0.9)
        >>> await get_locale(request, None)
        "en"
    """
    # Priority 1: User's saved preference
    if current_user and current_user.locale:
        # Validate that saved locale is still supported
        # (in case SUPPORTED_LOCALES changed after user set preference)
        if current_user.locale in SUPPORTED_LOCALES:
            return current_user.locale

    # Priority 2: Accept-Language header
    accept_language = request.headers.get("accept-language", "")
    if accept_language:
        detected_locale = parse_accept_language(accept_language)
        if detected_locale:
            return detected_locale

    # Priority 3: Default fallback
    return DEFAULT_LOCALE
