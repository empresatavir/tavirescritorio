"""As checagens do Doctor leem a contagem real de jobs com erro."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.job import Job
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_doctor_conta_jobs_com_erro(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'doctor.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(Job(id="job-ok", origin="manual", status="done"))
            session.add(Job(id="job-falha-1", origin="manual", status="failed"))
            session.add(Job(id="job-falha-2", origin="manual", status="failed"))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            report = await client.get("/api/v1/doctor/checks")
            assert report.status_code == 200
            body = report.json()
            assert len(body["dimensions"]) == 6
            engineering = next(row for row in body["dimensions"] if row["dimension"] == "Engenharia")
            assert "3 jobs registrados" in engineering["signal"]
            assert "2 com erro" in engineering["signal"]
            assert engineering["score"] == 75
            assert engineering["status"] == "warning"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
