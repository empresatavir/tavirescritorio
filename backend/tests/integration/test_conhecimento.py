"""Guardar uma nota grava o escopo, a lista e o nó do grafo."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.knowledge_entry import KnowledgeEntry
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_guardar_nota_entra_na_lista_e_no_grafo(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'conhecimento.db').as_posix()}")
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
            blank = await client.post("/api/v1/knowledge", json={"title": "  ", "content": "x", "scope": "comercial"})
            assert blank.status_code == 400
            assert blank.json()["detail"] == "Informe a nota."

            no_scope = await client.post("/api/v1/knowledge", json={"title": "Fila", "scope": " "})
            assert no_scope.status_code == 400
            assert no_scope.json()["detail"] == "Informe o escopo."

            created = await client.post(
                "/api/v1/knowledge",
                json={"title": " Fila na padaria ", "content": "O cliente espera do lado de fora.", "scope": " Comercial "},
            )
            assert created.status_code == 200
            body = created.json()
            assert body["title"] == "Fila na padaria"
            assert body["extra_metadata"]["domain"] == "comercial"

            listed = await client.get("/api/v1/knowledge")
            match = [row for row in listed.json() if row["id"] == body["id"]]
            assert len(match) == 1
            assert match[0]["title"] == "Fila na padaria"

            graph = await client.get("/api/v1/knowledge/graph")
            assert graph.status_code == 200
            nodes = {node["id"]: node for node in graph.json()["nodes"]}
            assert nodes[body["id"]]["type"] == "note"
            assert nodes[body["id"]]["label"] == "Fila na padaria"
            assert nodes[body["id"]]["scope"] == "comercial"
            assert nodes["scope:comercial"]["type"] == "scope"
            edges = graph.json()["edges"]
            assert {"from": "scope:comercial", "to": body["id"]} in edges

        async with maker() as session:
            count = await session.scalar(select(func.count()).select_from(KnowledgeEntry))
            row = await session.get(KnowledgeEntry, body["id"])
            assert count == 1
            assert row is not None
            assert row.title == "Fila na padaria"
            assert (row.extra_metadata or {})["domain"] == "comercial"
            assert row.source_type == "manual"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
