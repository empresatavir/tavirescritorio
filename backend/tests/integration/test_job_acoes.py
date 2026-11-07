"""Retomar, iniciar e refazer mudam o status no SQLite e deixam o evento do job."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.job import Job
from app.models.project import Project
from app.models.task import Task
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_retomar_iniciar_e_refazer_job(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'acoes.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Project(id="proj-acoes", slug="proj-acoes", name="Meridian"))
            session.add(Task(
                id="task-acoes",
                project_id="proj-acoes",
                title="Publicar a revisão",
                status="in_progress",
            ))
            session.add(Job(
                id="job-pausa",
                task_id="task-acoes",
                project_id="proj-acoes",
                origin="manual",
                status="paused",
                model_provider="cursor",
                model_name="composer",
                effort="alto",
                budget_ceiling=1,
                cost_usd=0.5,
                tokens_total=2,
                error_message="Teto diário atingido",
            ))
            session.add(Job(id="job-fila", origin="manual", status="queued", model_provider="cursor"))
            session.add(Job(
                id="job-fim",
                origin="manual",
                status="failed",
                error_message="o motor parou",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resumed = await client.post("/api/v1/jobs/job-pausa/resume")
            assert resumed.status_code == 200
            body = resumed.json()
            assert body["status"] == "running"
            assert body["progress"] == 50
            assert body["motor"] == "cursor"
            assert body["model_name"] == "composer"
            assert body["effort"] == "alto"
            assert body["cost_usd"] == 0.5
            assert body["tokens_total"] == 2
            assert body["budget_ceiling"] == 1
            assert body["task_title"] == "Publicar a revisão"
            assert body["error_message"] == "Teto diário atingido"

            blocked = await client.post("/api/v1/jobs/job-pausa/start")
            assert blocked.status_code == 409

            started = await client.post("/api/v1/jobs/job-fila/start")
            assert started.status_code == 200
            assert started.json()["status"] == "running"
            assert started.json()["progress"] == 50

            refused = await client.post("/api/v1/jobs/job-fila/redo")
            assert refused.status_code == 409

            redone = await client.post("/api/v1/jobs/job-fim/redo")
            assert redone.status_code == 200
            assert redone.json()["status"] == "queued"
            assert redone.json()["progress"] == 0
            assert redone.json()["error_message"] is None

        async with maker() as session:
            jobs = {
                row[0]: row[1]
                for row in (await session.execute(text("SELECT id, status FROM jobs"))).all()
            }
            assert jobs["job-pausa"] == "running"
            assert jobs["job-fila"] == "running"
            assert jobs["job-fim"] == "queued"
            actions = {
                row[0]
                for row in (await session.execute(text(
                    "SELECT action FROM events WHERE job_id IN ('job-pausa', 'job-fila', 'job-fim')"
                ))).all()
            }
            assert actions == {"job_resumed", "job_started", "job_redone"}
            attempts = (await session.execute(text(
                "SELECT status, log_stream FROM job_attempts WHERE job_id = 'job-fim'"
            ))).all()
            assert len(attempts) == 1
            assert attempts[0][0] == "queued"
            assert attempts[0][1] == "Job refeito pelo operador"
            error = (await session.execute(text(
                "SELECT error_message FROM jobs WHERE id = 'job-fim'"
            ))).scalar_one()
            assert error is None
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
