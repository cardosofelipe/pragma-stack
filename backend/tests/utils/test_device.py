# tests/utils/test_device.py
"""
Comprehensive tests for device utility functions.
"""

from unittest.mock import Mock

from fastapi import Request

from app.utils.device import (
    extract_browser,
    extract_device_info,
    get_client_ip,
    get_device_type,
    is_mobile_device,
    parse_device_name,
)


class TestParseDeviceName:
    """Tests for parse_device_name function."""

    def test_parse_device_name_empty_string(self):
        """Test parsing empty user agent."""
        result = parse_device_name("")
        assert result == "Unknown device"

    def test_parse_device_name_iphone(self):
        """Test parsing iPhone user agent."""
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
        result = parse_device_name(ua)
        assert result == "iPhone"

    def test_parse_device_name_ipad(self):
        """Test parsing iPad user agent."""
        ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)"
        result = parse_device_name(ua)
        assert result == "iPad"

    def test_parse_device_name_android_with_model(self):
        """Test parsing Android user agent with device model."""
        ua = "Mozilla/5.0 (Linux; Android 11; SM-G991B Build/RP1A)"
        result = parse_device_name(ua)
        assert result == "Android (Sm-G991B)"

    def test_parse_device_name_android_without_model(self):
        """Test parsing Android user agent without model."""
        ua = "Mozilla/5.0 (Linux; Android)"
        result = parse_device_name(ua)
        assert result == "Android device"

    def test_parse_device_name_windows_phone(self):
        """Test parsing Windows Phone user agent."""
        ua = "Mozilla/5.0 (Windows Phone 10.0)"
        result = parse_device_name(ua)
        assert result == "Windows Phone"

    def test_parse_device_name_mac(self):
        """Test parsing Mac user agent."""
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        result = parse_device_name(ua)
        assert result == "Chrome on Mac"

    def test_parse_device_name_windows(self):
        """Test parsing Windows user agent."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        result = parse_device_name(ua)
        assert result == "Chrome on Windows"

    def test_parse_device_name_linux(self):
        """Test parsing Linux user agent."""
        ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        result = parse_device_name(ua)
        assert result == "Chrome on Linux"

    def test_parse_device_name_chromebook(self):
        """Test parsing Chromebook user agent."""
        ua = "Mozilla/5.0 (X11; CrOS x86_64 14092.0.0) AppleWebKit/537.36"
        result = parse_device_name(ua)
        assert result == "Chromebook"

    def test_parse_device_name_tablet(self):
        """Test parsing generic tablet user agent."""
        ua = "Mozilla/5.0 (Linux; Android 9; Tablet) AppleWebKit/537.36"
        result = parse_device_name(ua)
        # Should match tablet first since it's in the string
        assert "Tablet" in result or "Android" in result

    def test_parse_device_name_smart_tv(self):
        """Test parsing Smart TV user agent."""
        ua = "Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3)"
        result = parse_device_name(ua)
        assert result == "Smart TV"

    def test_parse_device_name_playstation(self):
        """Test parsing PlayStation user agent."""
        ua = "Mozilla/5.0 (PlayStation 4 5.50)"
        result = parse_device_name(ua)
        assert result == "PlayStation"

    def test_parse_device_name_xbox(self):
        """Test parsing Xbox user agent."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One)"
        result = parse_device_name(ua)
        assert result == "Xbox"

    def test_parse_device_name_nintendo(self):
        """Test parsing Nintendo user agent."""
        ua = "Mozilla/5.0 (Nintendo Switch)"
        result = parse_device_name(ua)
        assert result == "Nintendo"

    def test_parse_device_name_unknown(self):
        """Test parsing completely unknown user agent."""
        ua = "SomeRandomBot/1.0"
        result = parse_device_name(ua)
        assert result == "Unknown device"


class TestExtractBrowser:
    """Tests for extract_browser function."""

    def test_extract_browser_empty_string(self):
        """Test extracting browser from empty user agent."""
        result = extract_browser("")
        assert result is None

    def test_extract_browser_none(self):
        """Test extracting browser from None."""
        result = extract_browser(None)
        assert result is None

    def test_extract_browser_edge(self):
        """Test extracting Edge browser."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62"
        result = extract_browser(ua)
        assert result == "Edge"

    def test_extract_browser_edge_legacy(self):
        """Test extracting legacy Edge browser."""
        ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/18.19582"
        )
        result = extract_browser(ua)
        assert result == "Edge"

    def test_extract_browser_opera(self):
        """Test extracting Opera browser."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 OPR/82.0.4227.50"
        result = extract_browser(ua)
        assert result == "Opera"

    def test_extract_browser_chrome(self):
        """Test extracting Chrome browser."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        result = extract_browser(ua)
        assert result == "Chrome"

    def test_extract_browser_safari(self):
        """Test extracting Safari browser."""
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        result = extract_browser(ua)
        assert result == "Safari"

    def test_extract_browser_firefox(self):
        """Test extracting Firefox browser."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0"
        result = extract_browser(ua)
        assert result == "Firefox"

    def test_extract_browser_internet_explorer_msie(self):
        """Test extracting Internet Explorer (MSIE)."""
        ua = "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0)"
        result = extract_browser(ua)
        assert result == "Internet Explorer"

    def test_extract_browser_internet_explorer_trident(self):
        """Test extracting Internet Explorer (Trident)."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko"
        result = extract_browser(ua)
        assert result == "Internet Explorer"

    def test_extract_browser_unknown(self):
        """Test extracting from unknown browser."""
        ua = "SomeRandomBot/1.0"
        result = extract_browser(ua)
        assert result is None


class TestGetClientIp:
    """Tests for get_client_ip function."""

    def test_get_client_ip_x_forwarded_for_single(self):
        """Test getting IP from X-Forwarded-For with single IP."""
        request = Mock(spec=Request)
        request.headers = {"x-forwarded-for": "192.168.1.100"}
        request.client = None

        result = get_client_ip(request)
        assert result == "192.168.1.100"

    def test_get_client_ip_x_forwarded_for_multiple(self):
        """Test getting IP from X-Forwarded-For with multiple IPs."""
        request = Mock(spec=Request)
        request.headers = {"x-forwarded-for": "192.168.1.100, 10.0.0.1, 172.16.0.1"}
        request.client = None

        result = get_client_ip(request)
        assert result == "192.168.1.100"

    def test_get_client_ip_x_real_ip(self):
        """Test getting IP from X-Real-IP."""
        request = Mock(spec=Request)
        request.headers = {"x-real-ip": "192.168.1.200"}
        request.client = None

        result = get_client_ip(request)
        assert result == "192.168.1.200"

    def test_get_client_ip_direct_connection(self):
        """Test getting IP from direct connection."""
        request = Mock(spec=Request)
        request.headers = {}
        request.client = Mock()
        request.client.host = "192.168.1.50"

        result = get_client_ip(request)
        assert result == "192.168.1.50"

    def test_get_client_ip_no_client(self):
        """Test getting IP when no client info available."""
        request = Mock(spec=Request)
        request.headers = {}
        request.client = None

        result = get_client_ip(request)
        assert result is None

    def test_get_client_ip_client_no_host(self):
        """Test getting IP when client exists but no host."""
        request = Mock(spec=Request)
        request.headers = {}
        request.client = Mock()
        request.client.host = None

        result = get_client_ip(request)
        assert result is None

    def test_get_client_ip_priority_x_forwarded_for(self):
        """Test that X-Forwarded-For has priority over X-Real-IP."""
        request = Mock(spec=Request)
        request.headers = {
            "x-forwarded-for": "192.168.1.100",
            "x-real-ip": "192.168.1.200",
        }
        request.client = Mock()
        request.client.host = "192.168.1.50"

        result = get_client_ip(request)
        assert result == "192.168.1.100"

    def test_get_client_ip_priority_x_real_ip_over_client(self):
        """Test that X-Real-IP has priority over client.host."""
        request = Mock(spec=Request)
        request.headers = {"x-real-ip": "192.168.1.200"}
        request.client = Mock()
        request.client.host = "192.168.1.50"

        result = get_client_ip(request)
        assert result == "192.168.1.200"


class TestIsMobileDevice:
    """Tests for is_mobile_device function."""

    def test_is_mobile_device_empty_string(self):
        """Test with empty string."""
        result = is_mobile_device("")
        assert result is False

    def test_is_mobile_device_iphone(self):
        """Test iPhone user agent."""
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
        result = is_mobile_device(ua)
        assert result is True

    def test_is_mobile_device_android(self):
        """Test Android user agent."""
        ua = "Mozilla/5.0 (Linux; Android 11)"
        result = is_mobile_device(ua)
        assert result is True

    def test_is_mobile_device_ipad(self):
        """Test iPad user agent."""
        ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)"
        result = is_mobile_device(ua)
        assert result is True

    def test_is_mobile_device_desktop(self):
        """Test desktop user agent."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        result = is_mobile_device(ua)
        assert result is False

    def test_is_mobile_device_blackberry(self):
        """Test BlackBerry user agent."""
        ua = "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)"
        result = is_mobile_device(ua)
        assert result is True

    def test_is_mobile_device_windows_phone(self):
        """Test Windows Phone user agent."""
        ua = "Mozilla/5.0 (Windows Phone 10.0)"
        result = is_mobile_device(ua)
        assert result is True


class TestGetDeviceType:
    """Tests for get_device_type function."""

    def test_get_device_type_empty_string(self):
        """Test with empty string."""
        result = get_device_type("")
        assert result == "other"

    def test_get_device_type_ipad(self):
        """Test iPad returns tablet."""
        ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)"
        result = get_device_type(ua)
        assert result == "tablet"

    def test_get_device_type_tablet(self):
        """Test generic tablet."""
        ua = "Mozilla/5.0 (Linux; Android 9; Tablet)"
        result = get_device_type(ua)
        assert result == "tablet"

    def test_get_device_type_iphone(self):
        """Test iPhone returns mobile."""
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
        result = get_device_type(ua)
        assert result == "mobile"

    def test_get_device_type_android_mobile(self):
        """Test Android mobile."""
        ua = "Mozilla/5.0 (Linux; Android 11; SM-G991B) Mobile"
        result = get_device_type(ua)
        assert result == "mobile"

    def test_get_device_type_windows_desktop(self):
        """Test Windows desktop."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        result = get_device_type(ua)
        assert result == "desktop"

    def test_get_device_type_mac_desktop(self):
        """Test Mac desktop."""
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        result = get_device_type(ua)
        assert result == "desktop"

    def test_get_device_type_linux_desktop(self):
        """Test Linux desktop."""
        ua = "Mozilla/5.0 (X11; Linux x86_64)"
        result = get_device_type(ua)
        assert result == "desktop"

    def test_get_device_type_chromebook(self):
        """Test Chromebook."""
        ua = "Mozilla/5.0 (X11; CrOS x86_64 14092.0.0)"
        result = get_device_type(ua)
        assert result == "desktop"

    def test_get_device_type_unknown(self):
        """Test unknown device."""
        ua = "SomeRandomBot/1.0"
        result = get_device_type(ua)
        assert result == "other"


class TestExtractDeviceInfo:
    """Tests for extract_device_info function."""

    def test_extract_device_info_complete(self):
        """Test extracting device info with all headers."""
        request = Mock(spec=Request)
        request.headers = {
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
            "x-device-id": "device-123-456",
            "x-forwarded-for": "192.168.1.100",
        }
        request.client = None

        result = extract_device_info(request)

        assert result.device_name == "iPhone"
        assert result.device_id == "device-123-456"
        assert result.ip_address == "192.168.1.100"
        assert "iPhone" in result.user_agent
        assert result.location_city is None
        assert result.location_country is None

    def test_extract_device_info_minimal(self):
        """Test extracting device info with minimal headers."""
        request = Mock(spec=Request)
        request.headers = {}
        request.client = Mock()
        request.client.host = "127.0.0.1"

        result = extract_device_info(request)

        assert result.device_name == "Unknown device"
        assert result.device_id is None
        assert result.ip_address == "127.0.0.1"
        assert result.user_agent is None

    def test_extract_device_info_long_user_agent(self):
        """Test that user agent is truncated to 500 chars."""
        long_ua = "A" * 600
        request = Mock(spec=Request)
        request.headers = {"user-agent": long_ua}
        request.client = None

        result = extract_device_info(request)

        assert len(result.user_agent) == 500
        assert result.user_agent == "A" * 500
