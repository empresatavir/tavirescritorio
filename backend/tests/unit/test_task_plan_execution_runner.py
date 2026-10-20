"""Unit tests — JobRunner avança status da task conforme origin (planning/execution/cancel)."""
import uuid
import pytest
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.shared.database import Base
from app.models.task import Task
from app.models.project import Project
from app.models.agent import Agent
from app.models.artifact import Artifact
from app.modules.jobs.runner import JobRunner
from sqlalchemy import select


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        s.add_all(
            [
                Project(id="proj-test", slug="test", name="Test", status="active"),
                Agent(id="pm-projetos", name="Paula PM", role="PM", sector="Operação", status="idle"),
            ]
        )
        await s.commit()
        yield s
    await engine.dispose()


async def _make_task(session: AsyncSession, status: str = "to_plan") -> Task:
    task = Task(
        id=str(uuid.uuid4()),
        seq=101,
        project_id="proj-test",
        title="Task fluxo kanban",
        description="Contexto de teste Fase 5",
        status=status,
        priority="high",
        assignee_agent_id="pm-projetos",
        sector="Operação",
        tags=[],
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@pytest.mark.asyncio
async def test_planning_job_moves_task_to_planned_and_writes_plano(session):
    task = await _make_task(session, "to_plan")
    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=task.id,
        project_id="proj-test",
        agent_id="pm-projetos",
        command='echo "plan-ok"',
        model_name="Fable",
        effort="Máximo",
        origin="planning",
    )
    task.status = "planning"
    task.active_job_id = job.id
    await session.commit()

    await runner.run(job.id, 'echo "plan-ok"', timeout=15)
    await session.commit()

    refreshed_job = await session.get(type(job), job.id)
    refreshed_task = await session.get(Task, task.id)
    assert refreshed_job.status == "succeeded"
    assert refreshed_task.status == "planned"

    arts = list(
        (
            await session.execute(select(Artifact).where(Artifact.job_id == job.id))
        ).scalars().all()
    )
    plan = next((a for a in arts if a.name == "plano.md"), None)
    assert plan is not None, f"Expected plano.md, got {[a.name for a in arts]}"
    assert Path(plan.path).exists()
    body = Path(plan.path).read_text(encoding="utf-8")
    assert "Plano operacional" in body
    assert "Fable" in body
    assert "plan:ready" in (refreshed_task.tags or [])


@pytest.mark.asyncio
async def test_execution_job_moves_task_to_done(session):
    task = await _make_task(session, "planned")
    task.tags = ["plan:ready", "model:Fable", "effort:Máximo"]
    await session.commit()

    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=task.id,
        project_id="proj-test",
        agent_id="pm-projetos",
        command='echo "exec-ok"',
        model_name="Fable",
        effort="Máximo",
        origin="execution",
    )
    task.status = "in_progress"
    task.active_job_id = job.id
    await session.commit()

    await runner.run(job.id, 'echo "exec-ok"', timeout=15)
    await session.commit()

    refreshed_task = await session.get(Task, task.id)
    refreshed_job = await session.get(type(job), job.id)
    assert refreshed_job.status == "succeeded"
    assert refreshed_task.status == "done"

    arts = list(
        (
            await session.execute(select(Artifact).where(Artifact.job_id == job.id))
        ).scalars().all()
    )
    assert any(a.name == "execucao.md" for a in arts)


@pytest.mark.asyncio
async def test_cancel_planning_rolls_back_to_to_plan(session):
    task = await _make_task(session, "planning")
    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=task.id,
        project_id="proj-test",
        agent_id="pm-projetos",
        command='echo "x"',
        origin="planning",
    )
    task.active_job_id = job.id
    await session.commit()

    await runner.cancel_job(job.id)
    await session.commit()

    refreshed = await session.get(Task, task.id)
    assert refreshed.status == "to_plan"
    assert refreshed.active_job_id is None


@pytest.mark.asyncio
async def test_cancel_execution_rolls_back_to_planned(session):
    task = await _make_task(session, "in_progress")
    task.tags = ["plan:ready"]
    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=task.id,
        project_id="proj-test",
        agent_id="pm-projetos",
        command='echo "x"',
        origin="execution",
    )
    task.active_job_id = job.id
    await session.commit()

    await runner.cancel_job(job.id)
    await session.commit()

    refreshed = await session.get(Task, task.id)
    assert refreshed.status == "planned"
    assert refreshed.active_job_id is None
