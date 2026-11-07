"""O double de reinício responde sem agendar o encerramento da porta."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import services as services_api
from app.main import app


@pytest.mark.asyncio
async def test_double_nao_agenda_reinicio(monkeypatch):
    scheduled: list[str] = []
    monkeypatch.setenv("TAVIR_SERVICE_DOUBLE", "1")
    monkeypatch.setattr(services_api, "_schedule_port_restart", lambda service_id: scheduled.append(service_id))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unknown = await client.post("/api/v1/services/inexistente/restart")
        assert unknown.status_code == 404

        backend = await client.post("/api/v1/services/backend/restart")
        frontend = await client.post("/api/v1/services/frontend/restart")
        assert backend.status_code == 200
        assert frontend.status_code == 200
        assert backend.json()["double"] is True
        assert backend.json()["scheduled"] is False
        assert backend.json()["message"] == "Double: backend reiniciado sem encerrar a porta."
        assert frontend.json()["message"] == "Double: frontend reiniciado sem encerrar a porta."

    assert scheduled == []


@pytest.mark.asyncio
async def test_sem_double_apenas_agenda(monkeypatch):
    scheduled: list[str] = []
    monkeypatch.delenv("TAVIR_SERVICE_DOUBLE", raising=False)
    monkeypatch.setattr(services_api, "_schedule_port_restart", lambda service_id: scheduled.append(service_id))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/services/backend/restart")
        assert response.status_code == 200
        assert response.json()["scheduled"] is True
        assert response.json()["double"] is False

    assert scheduled == ["backend"]
