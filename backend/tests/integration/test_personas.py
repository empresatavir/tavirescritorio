"""Criar persona grava o nome no SQLite e nome vazio não cria linha."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.persona import Persona
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_criar_persona_grava_nome_e_vazio_nao_cria(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'personas.db').as_posix()}")
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
            empty = await client.post("/api/v1/studio/personas", json={"name": "  "})
            assert empty.status_code == 400
            assert empty.json()["detail"] == "Informe o nome da persona."

            created = await client.post(
                "/api/v1/studio/personas",
                json={
                    "name": "Dono de negócio local",
                    "demographics": "loja, padaria, oficina",
                    "pain_points": "Perde cliente fora de hora",
                    "goals": "Resposta rápida e preço claro",
                },
            )
            assert created.status_code == 201
            body = created.json()
            assert body["name"] == "Dono de negócio local"
            assert body["status"] == "active"

            listed = await client.get("/api/v1/studio/personas")
            assert listed.status_code == 200
            assert [row["name"] for row in listed.json()] == ["Dono de negócio local"]

        async with maker() as session:
            count = await session.scalar(select(func.count()).select_from(Persona))
            stored = await session.scalar(select(Persona).where(Persona.name == "Dono de negócio local"))
            assert count == 1
            assert stored is not None
            assert stored.pain_points == "Perde cliente fora de hora"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
