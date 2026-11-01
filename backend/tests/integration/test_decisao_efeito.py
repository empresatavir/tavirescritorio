"""Aprovar uma decisão pausada retoma o job, solta o gate e grava o livro."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.approval import Approval
from app.models.job import Job
from app.models.project import Project
from app.models.task import Task
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_decisao_retoma_job_e_solta_gate(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'decisao.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Project(id="proj-dec", slug="proj-dec", name="Meridian"))
            session.add(Task(
                id="task-dec",
                project_id="proj-dec",
                title="Publicar a revisão",
                status="in_progress",
                gate_held=True,
            ))
            session.add(Job(
                id="job-dec",
                task_id="task-dec",
                origin="manual",
                status="paused",
                error_message="Teto diário atingido",
            ))
            session.add(Job(
                id="job-recusa",
                task_id="task-dec",
                origin="manual",
                status="paused",
                error_message="Teto do job atingido",
            ))
            session.add(Approval(
                id="ap-teto",
                title="Teto diário",
                type="ceiling",
                job_id="job-dec",
                task_id="task-dec",
                status="pending",
                group="block",
                kind="ceiling",
                question="Liberar o teto de hoje?",
                yes_steps="retomar o job",
                no_steps="manter pausado",
                sla_hours=4,
            ))
            session.add(Approval(
                id="ap-recusa",
                title="Teto do job",
                type="ceiling",
                job_id="job-recusa",
                task_id="task-dec",
                status="pending",
                group="block",
                kind="ceiling",
                question="Seguir mesmo no teto do job?",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            approved = await client.post(
                "/api/v1/approvals/ap-teto/decide",
                json={"decision": "approve", "decided_by": "Carlos"},
            )
            assert approved.status_code == 200
            body = approved.json()
            assert body["status"] == "approved"
            assert body["kind"] == "ceiling"
            assert body["group"] == "block"
            assert body["question"] == "Liberar o teto de hoje?"

            refused = await client.post(
                "/api/v1/approvals/ap-recusa/decide",
                json={"decision": "reject", "decided_by": "Carlos"},
            )
            assert refused.status_code == 200
            assert refused.json()["status"] == "rejected"

        async with maker() as session:
            jobs = {
                row[0]: row[1]
                for row in (await session.execute(text("SELECT id, status FROM jobs"))).all()
            }
            assert jobs["job-dec"] == "running"
            assert jobs["job-recusa"] == "paused"
            held = (await session.execute(text(
                "SELECT gate_held FROM tasks WHERE id = 'task-dec'"
            ))).scalar_one()
            assert held in (0, False)
            actions = {
                row[0]
                for row in (await session.execute(text(
                    "SELECT action FROM events WHERE event_type = 'decisao'"
                ))).all()
            }
            assert actions == {"decisao.aprovada", "decisao.recusada"}
            details = (await session.execute(text(
                "SELECT details FROM events WHERE action = 'decisao.aprovada'"
            ))).scalar_one()
            assert "Liberar o teto de hoje?" in details
            assert "cofre" not in details
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
