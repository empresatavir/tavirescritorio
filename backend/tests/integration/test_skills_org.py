"""Skills e organograma leem o catálogo e o reports_to gravado no agente."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.agent import Agent
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_skills_e_organograma_leem_o_sqlite(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'org.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Agent(id="ag-marina", name="Marina", role="Marca", sector="Comercial", status="active"))
            session.add(Agent(
                id="ag-yuri",
                name="Yuri",
                role="Experiência",
                sector="Engenharia",
                status="active",
                reports_to="Marina",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            skills = await client.get("/api/v1/skills")
            assert skills.status_code == 200
            catalog = skills.json()
            assert len(catalog) >= 1
            assert catalog[0]["name"]

            listed = await client.get("/api/v1/agents/")
            by_id = {row["id"]: row for row in listed.json()}
            assert by_id["ag-marina"]["reports_to"] is None
            assert by_id["ag-yuri"]["reports_to"] == "Marina"

        async with maker() as session:
            yuri = await session.get(Agent, "ag-yuri")
            assert yuri is not None
            assert yuri.reports_to == "Marina"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
