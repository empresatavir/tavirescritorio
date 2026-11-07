"""O mapa agrupa agentes reais por setor, sem desenho isométrico."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.agent import Agent
from app.shared.database import Base, get_session


def _agent(agent_id: str, name: str, sector: str) -> Agent:
    return Agent(id=agent_id, name=name, role="Ofício", sector=sector, status="active")


@pytest.mark.asyncio
async def test_setores_listam_agentes_do_sqlite(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'mapa.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(_agent("ag-marina", "Marina", "Comercial"))
            session.add(_agent("ag-yuri", "Yuri", "Engenharia"))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            listed = await client.get("/api/v1/agents/sectors")
            assert listed.status_code == 200
            body = listed.json()
            assert "isometric" not in body
            by_name = {row["name"]: row for row in body["sectors"]}
            assert [agent["name"] for agent in by_name["Comercial"]["agents"]] == ["Marina"]
            assert [agent["name"] for agent in by_name["Engenharia"]["agents"]] == ["Yuri"]
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
