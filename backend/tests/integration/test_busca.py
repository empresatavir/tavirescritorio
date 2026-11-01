"""A busca lê o SQLite: task, agente, job, caso e proposta. Termo sem hit volta vazio."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.agent import Agent
from app.models.job import Job
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase
from app.models.task import Task
from app.shared.database import Base, get_session

TOKEN = "token-busca-9f3"


@pytest.mark.asyncio
async def test_busca_le_sqlite_e_termo_sem_hit_volta_vazio(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'busca.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Project(id="proj-busca", slug="proj-busca", name="Projeto da busca"))
            session.add(Task(id="task-busca", project_id="proj-busca", title=f"Hero {TOKEN}"))
            session.add(Agent(id="ag-busca", name="Marina Marca", role="Marca", sector="conteudo"))
            session.add(Job(id="job-busca", origin="manual", status="failed", error_message=f"parou {TOKEN}"))
            session.add(
                RaioxCase(
                    id="caso-busca",
                    company_name="Loja da Rua",
                    objective="Ler a presença",
                    decision_needed="Seguir ou não",
                )
            )
            session.add(Proposal(id="prop-busca", num="PRO-9", client="Padaria Central"))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            found = await client.get("/api/v1/search", params={"q": TOKEN})
            assert found.status_code == 200
            kinds = {item["kind"]: item for item in found.json()["items"]}
            assert kinds["task"]["id"] == "task-busca"
            assert kinds["job"]["id"] == "job-busca"
            assert "proposal" not in kinds

            agent = await client.get("/api/v1/search", params={"q": "marina"})
            assert {item["id"] for item in agent.json()["items"]} == {"ag-busca"}

            case = await client.get("/api/v1/search", params={"q": "loja da rua"})
            assert case.json()["items"][0]["href"] == "/raiox/caso-busca"

            proposal = await client.get("/api/v1/search", params={"q": "padaria"})
            assert proposal.json()["items"][0]["id"] == "prop-busca"

            screen = await client.get("/api/v1/search", params={"q": "decis"})
            labels = [item["label"] for item in screen.json()["items"] if item["kind"] == "screen"]
            assert "Decisões" in labels

            empty = await client.get("/api/v1/search", params={"q": "zzzz-nada"})
            assert empty.json()["items"] == []
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
