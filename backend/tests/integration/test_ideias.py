"""Criar uma ideia grava a linha e a lista devolve o mesmo título."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.idea import Idea
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_criar_ideia_grava_e_lista(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'ideias.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            blank = await client.post("/api/v1/ideas", json={"title": "   "})
            assert blank.status_code == 400
            assert blank.json()["detail"] == "Informe a ideia."

            created = await client.post("/api/v1/ideas", json={"title": " Fila vira cardápio "})
            assert created.status_code == 201
            body = created.json()
            assert body["title"] == "Fila vira cardápio"
            assert body["status"] == "inbox"

            listed = await client.get("/api/v1/ideas")
            match = [row for row in listed.json() if row["id"] == body["id"]]
            assert len(match) == 1
            assert match[0]["title"] == "Fila vira cardápio"

        async with maker() as session:
            count = await session.scalar(select(func.count()).select_from(Idea))
            row = await session.get(Idea, body["id"])
            assert count == 1
            assert row is not None
            assert row.title == "Fila vira cardápio"
            assert row.status == "inbox"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
