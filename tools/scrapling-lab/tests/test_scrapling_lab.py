from __future__ import annotations

import socket
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

import scrapling_lab as lab  # noqa: E402


PUBLIC_DNS = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]


class FakeResponse:
    def __init__(self, status=200, url="https://example.com/", headers=None, content="ok"):
        self.status = status
        self.url = url
        self.headers = headers or {}
        self._content = content

    def markdown(self, main_content_only=True):
        return self._content


class FakeFetcher:
    responses = []
    calls = []

    @classmethod
    def get(cls, url, **kwargs):
        cls.calls.append((url, kwargs))
        return cls.responses.pop(0)


class FakeRoute:
    class Request:
        def __init__(self, url):
            self.url = url

    def __init__(self, url):
        self.request = self.Request(url)
        self.action = None

    def fallback(self):
        self.action = "fallback"

    def abort(self, reason):
        self.action = f"abort:{reason}"


class ScraplingLabPolicyTests(unittest.TestCase):
    @patch("scrapling_lab.socket.getaddrinfo", return_value=PUBLIC_DNS)
    def test_public_allowlisted_url_is_accepted(self, _dns):
        host, ips = lab.validate_network_url("https://www.example.com/path", ("example.com",))
        self.assertEqual(host, "www.example.com")
        self.assertEqual(ips, ("93.184.216.34",))

    @patch("scrapling_lab.socket.getaddrinfo", return_value=PUBLIC_DNS)
    def test_suffix_trick_is_rejected(self, _dns):
        with self.assertRaises(lab.LabError) as caught:
            lab.validate_network_url("https://example.com.attacker.test", ("example.com",))
        self.assertEqual(caught.exception.code, "STL-URL-002")

    def test_private_and_metadata_ips_are_rejected(self):
        for url, domain in (
            ("http://127.0.0.1", "127.0.0.1"),
            ("http://10.10.0.2", "10.10.0.2"),
            ("http://169.254.169.254", "169.254.169.254"),
            ("http://[::1]", "::1"),
        ):
            with self.subTest(url=url), self.assertRaises(lab.LabError) as caught:
                lab.validate_network_url(url, (domain,))
            self.assertEqual(caught.exception.code, "STL-URL-003")

    def test_credentials_and_non_http_schemes_are_rejected(self):
        with self.assertRaises(lab.LabError) as credentials:
            lab.validate_network_url("https://user:pass@example.com", ("example.com",))
        self.assertEqual(credentials.exception.code, "STL-URL-004")
        with self.assertRaises(lab.LabError) as file_url:
            lab.validate_network_url("file:///windows/system.ini", ("example.com",))
        self.assertEqual(file_url.exception.code, "STL-URL-001")

    def test_stealthy_requires_yellow_ack(self):
        with self.assertRaises(lab.LabError) as caught:
            lab.validate_execution_policy("stealthy", False)
        self.assertEqual(caught.exception.code, "STL-POLICY-001")
        lab.validate_execution_policy("stealthy", True)

    def test_output_name_cannot_escape_data_directory(self):
        with self.assertRaises(lab.LabError) as caught:
            lab.validate_output_name("../escape.md", "https://example.com")
        self.assertEqual(caught.exception.code, "STL-OUTPUT-001")

    def test_redacted_url_removes_query_and_fragment(self):
        self.assertEqual(
            lab.redact_url("https://example.com/path?token=secret#fragment"),
            "https://example.com/path",
        )

    def test_redacted_url_handles_invalid_port_without_leaking_input(self):
        self.assertEqual(lab.redact_url("https://example.com:not-a-port/?token=secret"), "<invalid-url>")

    @patch("scrapling_lab.socket.getaddrinfo", return_value=PUBLIC_DNS)
    def test_static_redirect_to_private_is_blocked_before_second_request(self, _dns):
        FakeFetcher.calls = []
        FakeFetcher.responses = [
            FakeResponse(status=302, headers={"location": "http://127.0.0.1/admin"})
        ]
        with self.assertRaises(lab.LabError) as caught:
            lab.fetch_static(
                "https://example.com/start",
                ("example.com", "127.0.0.1"),
                timeout_seconds=10,
                max_redirects=3,
                fetcher=FakeFetcher,
            )
        self.assertEqual(caught.exception.code, "STL-URL-003")
        self.assertEqual(len(FakeFetcher.calls), 1)

    @patch("scrapling_lab.socket.getaddrinfo", return_value=PUBLIC_DNS)
    def test_browser_route_blocks_unallowlisted_subresource(self, _dns):
        blocked = []
        guard = lab._route_request_guard(("example.com",), blocked)
        allowed_route = FakeRoute("https://cdn.example.com/app.js")
        guard(allowed_route)
        self.assertEqual(allowed_route.action, "fallback")

        denied_route = FakeRoute("https://tracker.invalid/pixel")
        guard(denied_route)
        self.assertEqual(denied_route.action, "abort:blockedbyclient")
        self.assertEqual(blocked[0]["code"], "STL-URL-002")

    def test_oversized_content_is_discarded(self):
        with self.assertRaises(lab.LabError) as caught:
            lab.response_to_markdown(FakeResponse(content="x" * 20), max_bytes=10)
        self.assertEqual(caught.exception.code, "STL-SIZE-001")

    def test_write_is_confined_and_atomic(self):
        original = lab.DATA_DIR
        with tempfile.TemporaryDirectory() as directory:
            lab.DATA_DIR = Path(directory)
            try:
                output = lab.write_output("result.md", "conteúdo")
                self.assertEqual(output.parent, Path(directory))
                self.assertEqual(output.read_text(encoding="utf-8"), "conteúdo")
            finally:
                lab.DATA_DIR = original


if __name__ == "__main__":
    unittest.main(verbosity=2)
