"""
Utility functions for extracting and parsing device information from HTTP requests.
"""
import re
from typing import Optional

from fastapi import Request

from app.schemas.sessions import DeviceInfo


def extract_device_info(request: Request) -> DeviceInfo:
    """
    Extract device information from the HTTP request.

    Args:
        request: FastAPI Request object

    Returns:
        DeviceInfo object with parsed device information
    """
    user_agent = request.headers.get('user-agent', '')

    device_info = DeviceInfo(
        device_name=parse_device_name(user_agent),
        device_id=request.headers.get('x-device-id'),  # Client must send this header
        ip_address=get_client_ip(request),
        user_agent=user_agent[:500] if user_agent else None,  # Truncate to max length
        location_city=None,  # Can be populated via IP geolocation service
        location_country=None,  # Can be populated via IP geolocation service
    )

    return device_info


def parse_device_name(user_agent: str) -> Optional[str]:
    """
    Parse user agent string to extract a friendly device name.

    Args:
        user_agent: User-Agent header string

    Returns:
        Friendly device name string or None

    Examples:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)" -> "iPhone"
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -> "Mac"
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -> "Windows PC"
    """
    if not user_agent:
        return "Unknown device"

    user_agent_lower = user_agent.lower()

    # Mobile devices (check first, as they can contain desktop patterns too)
    if 'iphone' in user_agent_lower:
        return "iPhone"
    elif 'ipad' in user_agent_lower:
        return "iPad"
    elif 'android' in user_agent_lower:
        # Try to extract device model
        android_match = re.search(r'android.*;\s*([^)]+)\s*build', user_agent_lower)
        if android_match:
            device_model = android_match.group(1).strip()
            return f"Android ({device_model.title()})"
        return "Android device"
    elif 'windows phone' in user_agent_lower:
        return "Windows Phone"

    # Desktop operating systems
    elif 'macintosh' in user_agent_lower or 'mac os x' in user_agent_lower:
        # Try to extract browser
        browser = extract_browser(user_agent)
        return f"{browser} on Mac" if browser else "Mac"
    elif 'windows' in user_agent_lower:
        browser = extract_browser(user_agent)
        return f"{browser} on Windows" if browser else "Windows PC"
    elif 'linux' in user_agent_lower and 'android' not in user_agent_lower:
        browser = extract_browser(user_agent)
        return f"{browser} on Linux" if browser else "Linux"
    elif 'cros' in user_agent_lower:
        return "Chromebook"

    # Tablets (not already caught)
    elif 'tablet' in user_agent_lower:
        return "Tablet"

    # Smart TVs
    elif any(tv in user_agent_lower for tv in ['smart-tv', 'smarttv', 'tv']):
        return "Smart TV"

    # Game consoles
    elif 'playstation' in user_agent_lower:
        return "PlayStation"
    elif 'xbox' in user_agent_lower:
        return "Xbox"
    elif 'nintendo' in user_agent_lower:
        return "Nintendo"

    # Fallback: just return browser name if detected
    browser = extract_browser(user_agent)
    if browser:
        return browser

    return "Unknown device"


def extract_browser(user_agent: str) -> Optional[str]:
    """
    Extract browser name from user agent string.

    Args:
        user_agent: User-Agent header string

    Returns:
        Browser name or None

    Examples:
        "Mozilla/5.0 ... Chrome/96.0" -> "Chrome"
        "Mozilla/5.0 ... Firefox/94.0" -> "Firefox"
    """
    if not user_agent:
        return None

    user_agent_lower = user_agent.lower()

    # Check specific browsers (order matters - check Edge before Chrome!)
    if 'edg/' in user_agent_lower or 'edge/' in user_agent_lower:
        return "Edge"
    elif 'opr/' in user_agent_lower or 'opera' in user_agent_lower:
        return "Opera"
    elif 'chrome/' in user_agent_lower:
        return "Chrome"
    elif 'safari/' in user_agent_lower:
        # Make sure it's actually Safari, not Chrome (which also contains "Safari")
        if 'chrome' not in user_agent_lower:
            return "Safari"
        return None
    elif 'firefox/' in user_agent_lower:
        return "Firefox"
    elif 'msie' in user_agent_lower or 'trident/' in user_agent_lower:
        return "Internet Explorer"

    return None


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request, considering proxy headers.

    Checks X-Forwarded-For and X-Real-IP headers for proxy scenarios.

    Args:
        request: FastAPI Request object

    Returns:
        Client IP address string or None

    Notes:
        - In production behind a proxy/load balancer, X-Forwarded-For is often set
        - The first IP in X-Forwarded-For is typically the real client IP
        - request.client.host is fallback for direct connections
    """
    # Check X-Forwarded-For (common in proxied environments)
    x_forwarded_for = request.headers.get('x-forwarded-for')
    if x_forwarded_for:
        # Get the first IP (original client)
        client_ip = x_forwarded_for.split(',')[0].strip()
        return client_ip

    # Check X-Real-IP (used by some proxies like nginx)
    x_real_ip = request.headers.get('x-real-ip')
    if x_real_ip:
        return x_real_ip.strip()

    # Fallback to direct connection IP
    if request.client and request.client.host:
        return request.client.host

    return None


def is_mobile_device(user_agent: str) -> bool:
    """
    Check if the device is a mobile device based on user agent.

    Args:
        user_agent: User-Agent header string

    Returns:
        True if mobile device, False otherwise
    """
    if not user_agent:
        return False

    mobile_patterns = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod',
        'blackberry', 'windows phone', 'webos', 'opera mini',
        'iemobile', 'mobile safari'
    ]

    user_agent_lower = user_agent.lower()
    return any(pattern in user_agent_lower for pattern in mobile_patterns)


def get_device_type(user_agent: str) -> str:
    """
    Determine the general device type.

    Args:
        user_agent: User-Agent header string

    Returns:
        Device type: "mobile", "tablet", "desktop", or "other"
    """
    if not user_agent:
        return "other"

    user_agent_lower = user_agent.lower()

    # Check for tablets first (they can contain "mobile" too)
    if 'ipad' in user_agent_lower or 'tablet' in user_agent_lower:
        return "tablet"

    # Check for mobile
    if is_mobile_device(user_agent):
        return "mobile"

    # Check for desktop OS patterns
    if any(os in user_agent_lower for os in ['windows', 'macintosh', 'linux', 'cros']):
        return "desktop"

    return "other"
