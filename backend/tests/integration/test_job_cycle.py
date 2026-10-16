"""Integration test for G4 — job lifecycle (create → run → succeed/fail)."""
import asyncio
import pytest
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.shared.database import Base
from app.models.job import Job
from app.models.event import Event
from app.models.artifact import Artifact
from app.modules.jobs.runner import JobRunner


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_job_succeeds_with_echo(session):
    runner = JobRunner(session)
    job = await runner.create_job(command="echo hello-tavir")
    assert job.status == "queued"

    await runner.run(job.id, "echo hello-tavir", timeout=10)
    await session.commit()

    # Refresh job state
    refreshed = await session.get(Job, job.id)
    assert refreshed.status == "succeeded", f"Expected succeeded, got {refreshed.status}: {refreshed.error_message}"

    # Verify artifact was created
    from sqlalchemy import select
    result = await session.execute(select(Artifact).where(Artifact.job_id == job.id))
    artifacts = list(result.scalars().all())
    assert len(artifacts) >= 1, "Expected at least one artifact"
    assert artifacts[0].name == "output.txt"
    assert Path(artifacts[0].path).exists()
    content = Path(artifacts[0].path).read_text(encoding="utf-8")
    assert "hello-tavir" in content

    # Verify events were logged in order
    result = await session.execute(
        select(Event).where(Event.job_id == job.id).order_by(Event.created_at)
    )
    events = list(result.scalars().all())
    states = [e.new_state for e in events]
    assert "queued" in states
    assert "preflight" in states
    assert "running" in states
    assert "succeeded" in states


@pytest.mark.asyncio
async def test_job_fails_on_disallowed_command(session):
    runner = JobRunner(session)
    job = await runner.create_job(command="rm -rf /")
    await runner.run(job.id, "rm -rf /", timeout=10)
    await session.commit()

    refreshed = await session.get(Job, job.id)
    assert refreshed.status == "failed"
    assert "not in allowlist" in (refreshed.error_message or "")


@pytest.mark.asyncio
async def test_job_fails_on_timeout(session):
    runner = JobRunner(session)
    job = await runner.create_job(command="python -c \"import time; time.sleep(60)\"")
    await runner.run(job.id, "python -c \"import time; time.sleep(60)\"", timeout=2)
    await session.commit()

    refreshed = await session.get(Job, job.id)
    assert refreshed.status == "failed"
    assert "Timeout" in (refreshed.error_message or "")