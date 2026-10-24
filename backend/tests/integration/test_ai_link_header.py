"""Falha do motor de IA sai no cabeçalho que o escritório lê."""

from urllib.parse import unquote

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_ai_link_header_when_ghostcli_has_no_key(monkeypatch):
    monkeypatch.setattr("app.api.v1.integrations.is_configured", lambda: False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/integrations/ghostcli/status")
    assert response.status_code == 200
    assert response.json()["status"] == "unavailable"
    raw = response.headers.get("x-tavir-ai-link")
    assert raw
    assert "GHOSTCLI_API_KEY" in unquote(raw)
