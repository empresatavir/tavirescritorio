"""Conectar uma plataforma grava social_connections e a lista deixa de dizer desconectada."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.social_connection import SocialConnection
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_conectar_instagram_grava_uma_linha(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'social.db').as_posix()}")
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
            before = await client.get("/api/v1/social/connections")
            assert before.status_code == 200
            instagram = next(row for row in before.json()["connections"] if row["platform"] == "instagram")
            assert instagram["status"] == "disconnected"

            unknown = await client.post("/api/v1/social/connections/orkut/connect")
            assert unknown.status_code == 404

            first = await client.post("/api/v1/social/connections/instagram/connect")
            assert first.status_code == 200
            assert first.json()["status"] == "connected"

            second = await client.post("/api/v1/social/connections/instagram/connect")
            assert second.json()["status"] == "connected"

            after = await client.get("/api/v1/social/connections")
            instagram = next(row for row in after.json()["connections"] if row["platform"] == "instagram")
            assert instagram["status"] == "connected"
            linkedin = next(row for row in after.json()["connections"] if row["platform"] == "linkedin")
            assert linkedin["status"] == "disconnected"

        async with maker() as session:
            count = await session.scalar(select(func.count()).select_from(SocialConnection))
            row = await session.scalar(select(SocialConnection).where(SocialConnection.platform == "instagram"))
            assert count == 1
            assert row is not None
            assert row.status == "connected"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
