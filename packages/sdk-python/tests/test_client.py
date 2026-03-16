"""Basic unit tests for the Shadow Python SDK client initialization."""

from shadowob_sdk import ShadowClient, ShadowSocket


def test_client_creation():
    client = ShadowClient("https://example.com", "test-token")
    assert client._base_url == "https://example.com"
    assert client._token == "test-token"
    client.close()


def test_client_strips_trailing_api():
    client = ShadowClient("https://example.com/api", "test-token")
    assert client._base_url == "https://example.com"
    client.close()


def test_client_strips_trailing_api_slash():
    client = ShadowClient("https://example.com/api/", "test-token")
    assert client._base_url == "https://example.com"
    client.close()


def test_client_context_manager():
    with ShadowClient("https://example.com", "test-token") as client:
        assert client._base_url == "https://example.com"


def test_socket_creation():
    sock = ShadowSocket("https://example.com", "test-token")
    assert sock.connected is False
    assert sock._server_url == "https://example.com"
