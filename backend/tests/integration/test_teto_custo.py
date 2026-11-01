"""Estourar o teto pausa o job, abre um gate e a série de custo lê o SQLite."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.approval import Approval
from app.models.job import Job
from app.models.usage_sample import UsageSample
from app.modules.auth.clock import set_fixed
from app.shared.database import Base, get_session

WHEN = datetime(2026, 10, 29, 18, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_teto_pausa_job_abre_gate_e_serie_bate_com_sqlite(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'custo.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    set_fixed(WHEN)
    try:
        async with maker() as session:
            session.add(Job(id="job-arquivo", origin="manual", status="running", budget_ceiling=100))
            session.add(Job(id="job-orcamento", origin="manual", status="running", budget_ceiling=0.5))
            session.add(Job(id="job-diario", origin="manual", status="running", budget_ceiling=10))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            old = await client.post(
                "/api/v1/usage",
                json={"job_id": "job-arquivo", "cost_usd": 9, "tokens": 100, "at": (WHEN - timedelta(days=20)).isoformat()},
            )
            assert old.status_code == 200
            assert old.json()["job_status"] == "running"

            ceilings = await client.put("/api/v1/analytics/ceilings", json={"daily_usd": 1, "monthly_usd": 100})
            assert ceilings.status_code == 200

            budget = await client.post(
                "/api/v1/usage",
                json={"job_id": "job-orcamento", "cost_usd": 0.5, "tokens": 1, "at": WHEN.isoformat()},
            )
            assert budget.status_code == 200
            assert budget.json()["gate_opened"] is True
            assert budget.json()["reason"] == "Teto do job atingido"

            under = await client.post(
                "/api/v1/usage",
                json={"job_id": "job-diario", "cost_usd": 0.25, "tokens": 1, "at": WHEN.isoformat()},
            )
            assert under.json()["job_status"] == "running"
            assert under.json()["gate_opened"] is False

            over = await client.post(
                "/api/v1/usage",
                json={"job_id": "job-diario", "cost_usd": 0.25, "tokens": 1, "at": WHEN.isoformat()},
            )
            assert over.json()["job_status"] == "paused"
            assert over.json()["reason"] == "Teto diário atingido"

            fortnight = await client.get("/api/v1/analytics/cost", params={"range": "14d"})
            assert fortnight.status_code == 200
            assert fortnight.json()["total_usd"] == pytest.approx(1.0)
            assert fortnight.json()["total_tokens"] == 3

            month = await client.get("/api/v1/analytics/cost", params={"range": "30d"})
            assert month.json()["total_usd"] == pytest.approx(10.0)
            assert month.json()["total_tokens"] == 103

            again = await client.post(
                "/api/v1/usage",
                json={"job_id": "job-orcamento", "cost_usd": 0.1, "tokens": 1, "at": WHEN.isoformat()},
            )
            assert again.json()["gate_opened"] is False

        async with maker() as session:
            samples = (await session.scalars(select(UsageSample))).all()
            assert len(samples) == 5
            budget_job = await session.get(Job, "job-orcamento")
            daily_job = await session.get(Job, "job-diario")
            assert budget_job is not None and budget_job.status == "paused"
            assert budget_job.cost_usd == pytest.approx(0.6)
            assert daily_job is not None and daily_job.status == "paused"
            assert daily_job.cost_usd == pytest.approx(0.5)
            assert daily_job.tokens_total == 2
            gates = (
                await session.scalars(select(Approval).where(Approval.type == "ceiling", Approval.status == "pending"))
            ).all()
            assert {gate.job_id for gate in gates} == {"job-orcamento", "job-diario"}
            assert all("cofre" not in (gate.reason or "") for gate in gates)
            count = await session.scalar(
                select(func.count()).select_from(Approval).where(Approval.job_id == "job-orcamento", Approval.type == "ceiling")
            )
            assert count == 1
    finally:
        set_fixed(None)
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
