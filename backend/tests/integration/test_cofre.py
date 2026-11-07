"""O cofre guarda o valor. Lista, livro e chat devolvem só a máscara e o nome."""
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
from app.modules.auth.service import secret_leaked
from app.shared.database import Base, get_session

SECRET = "https://cofre-meridian.supabase.co"


@pytest.mark.asyncio
async def test_cofre_fica_fora_do_ledger_e_do_chat(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'cofre.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Project(id="proj-cofre", slug="proj-cofre", name="Meridian"))
            session.add(Task(
                id="task-cofre",
                project_id="proj-cofre",
                title="Publicar a revisão",
                status="in_progress",
                gate_held=True,
            ))
            session.add(Job(id="job-cofre", task_id="task-cofre", origin="manual", status="paused"))
            session.add(Approval(
                id="ap-02",
                title="Deploy",
                type="deploy",
                job_id="job-cofre",
                task_id="task-cofre",
                status="pending",
                group="block",
                kind="deploy",
                question="Publicar com a chave do Supabase?",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            decided = await client.post(
                "/api/v1/approvals/ap-02/decide",
                json={
                    "decision": "approve",
                    "decided_by": "Carlos",
                    "justification": "Pode publicar.",
                    "vault_name": "SUPABASE_URL",
                    "vault_value": SECRET,
                },
            )
            assert decided.status_code == 200
            assert decided.json()["status"] == "approved"
            assert SECRET not in decided.text

            listed = await client.get("/api/v1/vault")
            assert listed.status_code == 200
            assert SECRET not in listed.text
            items = listed.json()
            assert len(items) == 1
            assert items[0]["name"] == "SUPABASE_URL"
            assert items[0]["masked"].startswith("http")
            assert SECRET not in items[0]["masked"]

            revealed = await client.post(f"/api/v1/vault/{items[0]['id']}/reveal")
            assert revealed.status_code == 200
            assert revealed.json()["value"] == SECRET

        async with maker() as session:
            stored = (await session.execute(text(
                "SELECT name, value FROM vault_secrets WHERE approval_id = 'ap-02'"
            ))).one()
            assert stored[0] == "SUPABASE_URL"
            assert stored[1] == SECRET
            status = (await session.execute(text(
                "SELECT status FROM jobs WHERE id = 'job-cofre'"
            ))).scalar_one()
            assert status == "running"
            held = (await session.execute(text(
                "SELECT gate_held FROM tasks WHERE id = 'task-cofre'"
            ))).scalar_one()
            assert held in (0, False)
            notes = (await session.execute(text(
                "SELECT action, details FROM events WHERE event_type = 'cofre'"
            ))).all()
            assert {row[0] for row in notes} == {"cofre.gravado", "cofre.revelado"}
            for _action, details in notes:
                assert SECRET not in (details or "")
            assert await secret_leaked(session, SECRET) == []
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
