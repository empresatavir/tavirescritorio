"""Timeout do GhostCLI repete a chamada antes de avisar o CEO."""

import httpx
import pytest

from app.modules.ghostcli.client import GhostCliError, chat_completion
from app.modules.ghostcli.notice import begin_ai_link_scope, current_ai_link_error, reset_ai_link_scope


class _Response:
    status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": "entrega pronta"}}]}


class _Client:
    calls = 0

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, *args, **kwargs):
        _Client.calls += 1
        if _Client.calls < 3:
            raise httpx.ReadTimeout("lento")
        return _Response()


@pytest.mark.asyncio
async def test_timeout_retries_before_success(monkeypatch):
    _Client.calls = 0
    token = begin_ai_link_scope()
    monkeypatch.setattr("app.modules.ghostcli.client.httpx.AsyncClient", _Client)
    monkeypatch.setattr("app.modules.cursor_link.client.is_enabled", _disabled)

    async def _fast_sleep(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.ghostcli.client.asyncio.sleep", _fast_sleep)
    monkeypatch.setenv("GHOSTCLI_API_KEY", "test-key")
    try:
        text = await chat_completion(messages=[{"role": "user", "content": "oi"}])
    finally:
        reset_ai_link_scope(token)
    assert text == "entrega pronta"
    assert _Client.calls == 3
    assert current_ai_link_error() is None


async def _disabled() -> bool:
    return False


@pytest.mark.asyncio
async def test_http_524_retries_and_hides_the_html_page(monkeypatch):
    class _Page:
        def __init__(self, status_code: int):
            self.status_code = status_code
            self.text = "<!DOCTYPE html><html>cloudflare</html>"

        def raise_for_status(self):
            request = httpx.Request("POST", "https://ghostcli.cloud/v1/chat/completions")
            response = httpx.Response(self.status_code, request=request, text=self.text)
            raise httpx.HTTPStatusError("524", request=request, response=response)

        def json(self):
            return {"choices": [{"message": {"content": "entrega pronta"}}]}

    class _Client:
        calls = 0

        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            _Client.calls += 1
            if _Client.calls < 3:
                return _Page(524)
            return _Response()

    _Client.calls = 0
    token = begin_ai_link_scope()
    monkeypatch.setattr("app.modules.ghostcli.client.httpx.AsyncClient", _Client)
    monkeypatch.setattr("app.modules.cursor_link.client.is_enabled", _disabled)

    async def _fast_sleep(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.ghostcli.client.asyncio.sleep", _fast_sleep)
    monkeypatch.setenv("GHOSTCLI_API_KEY", "test-key")
    try:
        text = await chat_completion(messages=[{"role": "user", "content": "oi"}])
    finally:
        reset_ai_link_scope(token)
    assert text == "entrega pronta"
    assert _Client.calls == 3
    assert current_ai_link_error() is None


@pytest.mark.asyncio
async def test_timeout_reports_only_after_the_last_attempt(monkeypatch):
    class _AlwaysTimeout(_Client):
        async def post(self, *args, **kwargs):
            raise httpx.ReadTimeout("lento")

    token = begin_ai_link_scope()
    monkeypatch.setattr("app.modules.ghostcli.client.httpx.AsyncClient", _AlwaysTimeout)
    monkeypatch.setattr("app.modules.cursor_link.client.is_enabled", _disabled)

    async def _fast_sleep(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.ghostcli.client.asyncio.sleep", _fast_sleep)
    monkeypatch.setenv("GHOSTCLI_API_KEY", "test-key")
    try:
        with pytest.raises(GhostCliError, match="Timeout na conexão com GhostCLI"):
            await chat_completion(messages=[{"role": "user", "content": "oi"}])
        assert current_ai_link_error()
        assert "Timeout" in (current_ai_link_error() or "")
    finally:
        reset_ai_link_scope(token)
