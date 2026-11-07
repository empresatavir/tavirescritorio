"""Um filtro sem acerto não apaga a nota já gravada."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.knowledge_entry import KnowledgeEntry
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_filtro_sem_acerto_mantem_a_nota(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'memoria.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(KnowledgeEntry(
                id="nota-fila",
                title="Fila na padaria",
                content="O cliente espera do lado de fora.",
                source_type="manual",
                extra_metadata={"domain": "comercial"},
                status="indexed",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            missed = await client.get("/api/v1/knowledge", params={"q": "zzz"})
            assert missed.status_code == 200
            assert missed.json() == []

            kept = await client.get("/api/v1/knowledge")
            titles = [row["title"] for row in kept.json()]
            assert titles == ["Fila na padaria"]
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
