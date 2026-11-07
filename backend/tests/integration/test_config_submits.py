"""Criar projeto, gravar controle, plugar motor sem chave no ledger e aprovar memória."""
import json
import shutil
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.event import Event
from app.models.project import Project
from app.shared.database import Base, get_session

KEY = "sk-cfg003-padaria"


@pytest.mark.asyncio
async def test_submits_de_configuracao(tmp_path, monkeypatch):
    secrets = tmp_path / "secrets.json"
    monkeypatch.setenv("TAVIR_SECRETS_PATH", str(secrets))
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'cfg.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    local_path = None

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            blank = await client.post("/api/v1/settings/projects", json={"name": "  "})
            assert blank.status_code == 400

            created = await client.post("/api/v1/settings/projects", json={"name": "Padaria Nova"})
            assert created.status_code == 201
            project_id = created.json()["id"]
            local_path = created.json()["local_path"]
            assert local_path

            saved = await client.put(
                f"/api/v1/settings/projects/{project_id}/control",
                json={"build_command": "npm run build", "bases": ["negocios"]},
            )
            assert saved.status_code == 200
            assert saved.json()["control"]["build_command"] == "npm run build"
            assert saved.json()["control"]["bases"] == ["negocios"]

            candidate = Path(local_path) / "memory" / "agente"
            candidate.mkdir(parents=True, exist_ok=True)
            (candidate / "fila.md").write_text("# Fila\n\nO cliente espera.\n", encoding="utf-8")
            approved = await client.post(
                f"/api/v1/settings/projects/{project_id}/memory/approve",
                json={"name": "fila.md"},
            )
            assert approved.status_code == 200
            memory = await client.get(f"/api/v1/settings/projects/{project_id}/memory")
            assert [row["name"] for row in memory.json()["projeto"]] == ["fila.md"]
            assert memory.json()["agente"] == []

            plugged = await client.post(
                "/api/v1/integrations/motors/claude/plug",
                json={"api_key": KEY},
            )
            assert plugged.status_code == 200
            claude = next(row for row in plugged.json()["motors"] if row["id"] == "claude")
            assert claude["has_key"] is True

        stored = json.loads(secrets.read_text(encoding="utf-8"))
        assert stored["claude"]["api_key"] == KEY
        async with maker() as session:
            project = await session.get(Project, project_id)
            events = list((await session.scalars(select(Event))).all())
            assert project is not None
            assert project.control["build_command"] == "npm run build"
            assert events
            blob = " ".join((row.details or "") + row.action for row in events)
            assert KEY not in blob
            assert "api_key" not in blob
            assert any(row.action == "motor.plug" for row in events)
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
        if local_path:
            shutil.rmtree(local_path, ignore_errors=True)
