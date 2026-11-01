"""Concluir um percurso grava tours_seen no SQLite. Percurso desconhecido devolve 404."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.office_settings import OfficeSettings
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_concluir_ciclo_grava_o_percurso_visto(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'tour.db').as_posix()}")
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
            before = await client.get("/api/v1/tours")
            assert before.status_code == 200
            assert before.json()["seen"] == []

            missing = await client.post("/api/v1/tours/outro/complete")
            assert missing.status_code == 404

            done = await client.post("/api/v1/tours/exec/complete")
            assert done.status_code == 200
            assert done.json()["seen"] == ["exec"]

            again = await client.post("/api/v1/tours/exec/complete")
            assert again.json()["seen"] == ["exec"]

            client_done = await client.post("/api/v1/tours/client/complete")
            assert client_done.json()["seen"] == ["exec", "client"]

        async with maker() as session:
            row = (await session.scalars(select(OfficeSettings))).one()
            assert row.tours_seen == ["exec", "client"]
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()
