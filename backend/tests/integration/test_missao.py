"""Concluir um marco da missão Q4 muda o progresso gravado."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.mission import Milestone, Mission
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_concluir_marco_muda_progresso(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'missao.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Mission(id="missao-q4", title="Missão Q4", period="Q4"))
            session.add(Milestone(id="marco-cap", mission_id="missao-q4", title="Capítulo 4", done=False, position=0))
            session.add(Milestone(id="marco-lp", mission_id="missao-q4", title="Landing", done=False, position=1))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            missing = await client.patch(
                "/api/v1/missions/missao-q4/milestones/nao-existe",
                json={"done": True},
            )
            assert missing.status_code == 404

            updated = await client.patch(
                "/api/v1/missions/missao-q4/milestones/marco-cap",
                json={"done": True},
            )
            assert updated.status_code == 200
            assert updated.json()["progress"] == "1/2"
            by_id = {row["id"]: row for row in updated.json()["milestones"]}
            assert by_id["marco-cap"]["done"] is True
            assert by_id["marco-lp"]["done"] is False

            listed = await client.get("/api/v1/missions")
            mission = listed.json()["missions"][0]
            assert mission["title"] == "Missão Q4"
            assert mission["progress"] == "1/2"

        async with maker() as session:
            done = await session.get(Milestone, "marco-cap")
            open_row = await session.get(Milestone, "marco-lp")
            assert done is not None and done.done is True
            assert open_row is not None and open_row.done is False
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
