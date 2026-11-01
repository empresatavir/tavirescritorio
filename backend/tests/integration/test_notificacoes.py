"""Notificação nasce de gate, job falho e SLA estourado. Ler grava no SQLite."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.approval import Approval
from app.models.factory_demand import FactoryDemand
from app.models.job import Job
from app.models.notification_read import NotificationRead
from app.models.project import Project
from app.modules.auth.clock import set_fixed
from app.shared.database import Base, get_session

WHEN = datetime(2026, 10, 29, 18, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_notificacao_de_gate_job_e_sla_marca_lida(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'avisos.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    set_fixed(WHEN)
    try:
        async with maker() as session:
            session.add(Project(id="proj-1", slug="meridian", name="Meridian"))
            session.add(Approval(id="ap-gate", title="Publicar a Meridian", status="pending", reason="Falta a prova"))
            session.add(Approval(id="ap-feita", title="Já decidido", status="approved"))
            session.add(Job(id="job-falhou", origin="manual", status="failed", error_message="Build quebrou no gate"))
            session.add(Job(id="job-roda", origin="manual", status="running"))
            session.add(
                FactoryDemand(
                    id="dem-atraso",
                    project_id="proj-1",
                    code="D1",
                    title="Entrega da home",
                    folder="workspace/meridian",
                    sla_due_at=WHEN - timedelta(hours=2),
                    status="ativa",
                )
            )
            session.add(
                FactoryDemand(
                    id="dem-ok",
                    project_id="proj-1",
                    code="D2",
                    title="Entrega no prazo",
                    folder="workspace/meridian",
                    sla_due_at=WHEN + timedelta(days=1),
                    status="ativa",
                )
            )
            session.add(
                FactoryDemand(
                    id="dem-fim",
                    project_id="proj-1",
                    code="D3",
                    title="Entrega concluída",
                    folder="workspace/meridian",
                    sla_due_at=WHEN - timedelta(days=3),
                    status="concluida",
                )
            )
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            listed = await client.get("/api/v1/notifications")
            assert listed.status_code == 200
            body = listed.json()
            ids = {item["id"] for item in body["items"]}
            assert ids == {"gate_ap-gate", "job_job-falhou", "sla_dem-atraso"}
            assert body["unread_count"] == 3
            assert "Já decidido" not in listed.text
            assert "Entrega no prazo" not in listed.text
            assert "Entrega concluída" not in listed.text

            read = await client.post("/api/v1/notifications/gate_ap-gate/read")
            assert read.status_code == 200
            after = read.json()
            assert after["unread_count"] == 2
            gate = next(item for item in after["items"] if item["id"] == "gate_ap-gate")
            assert gate["read"] is True

        async with maker() as session:
            row = await session.get(NotificationRead, "gate_ap-gate")
            assert row is not None
            assert row.read_at is not None
    finally:
        set_fixed(None)
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
