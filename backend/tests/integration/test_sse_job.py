"""O SSE do job omite evento cuja data não dá para ler. A linha continua no SQLite."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.job import Job
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_sse_ignora_evento_sem_data_valida(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'sse.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Job(id="job-sse", origin="manual", status="paused"))
            await session.execute(
                text(
                    "INSERT INTO events (id, job_id, event_type, action, details, created_at) "
                    "VALUES ('evt-ok', 'job-sse', 'log', 'linha válida', 'passo 1', '2026-10-29T18:00:00+00:00')"
                )
            )
            await session.execute(
                text(
                    "INSERT INTO events (id, job_id, event_type, action, details, created_at) "
                    "VALUES ('evt-ruim', 'job-sse', 'log', 'linha inválida', 'sem hora', 'nao-e-data')"
                )
            )
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/jobs/job-sse/stream")
            assert response.status_code == 200
            body = response.text
            assert "evt-ok" in body
            assert "linha válida" in body
            assert "2026-10-29T18:00:00" in body
            assert "evt-ruim" not in body
            assert "nao-e-data" not in body

        async with maker() as session:
            stored = (await session.execute(text("SELECT id, created_at FROM events ORDER BY id"))).all()
            assert {row[0] for row in stored} == {"evt-ok", "evt-ruim"}
            bad = next(row for row in stored if row[0] == "evt-ruim")
            assert bad[1] == "nao-e-data"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
