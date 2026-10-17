"""Unit tests for Tasks, Approvals repositories and CockpitService."""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.shared.database import Base
from app.models.task import Task
from app.models.approval import Approval
from app.models.job import Job
from app.models.agent import Agent
from app.models.project import Project
from app.models.event import Event
from app.modules.tasks.repository import TaskRepository
from app.modules.approvals.repository import ApprovalRepository
from app.modules.cockpit.service import CockpitService


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        # Seed test project and agent
        proj = Project(id="proj-test", slug="test", name="Test Proj", status="active")
        agent = Agent(id="ag-01", name="Arquiteto", role="Leader", sector="Eng", status="busy")
        s.add_all([proj, agent])
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_task_crud_and_status(session):
    repo = TaskRepository(session)
    task = Task(
        id=str(uuid.uuid4()),
        seq=1,
        project_id="proj-test",
        title="Desenvolver API",
        status="pending",
        priority="high",
        sector="Engenharia",
    )
    await repo.create(task)
    await session.commit()

    # List
    tasks = await repo.list_all(status="pending")
    assert len(tasks) == 1
    assert tasks[0].title == "Desenvolver API"

    # Update status
    updated = await repo.update_status(task.id, "in_progress")
    await session.commit()
    assert updated.status == "in_progress"

    # Delete
    deleted = await repo.delete(task.id)
    await session.commit()
    assert deleted is True


@pytest.mark.asyncio
async def test_approval_decision_and_audit(session):
    repo = ApprovalRepository(session)
    appr = Approval(
        id="ap-test-1",
        title="Deploy em produção",
        type="checkpoint",
        impact="high",
        status="pending",
        reason="Deploy crítico",
    )
    await repo.create(appr)
    await session.commit()

    decided = await repo.decide(
        approval_id="ap-test-1",
        decision="approve",
        decided_by="CEO",
        justification="Autorizado após validação",
    )
    await session.commit()

    assert decided.status == "approved"
    assert decided.decided_by == "CEO"
    assert decided.justification == "Autorizado após validação"

    # Verify audit event was logged
    event_query = await session.execute(select(Event).where(Event.approval_id == "ap-test-1"))
    event_res = event_query.scalars().first()
    assert event_res is not None
    assert event_res.event_type == "approval_approved"


@pytest.mark.asyncio
async def test_cockpit_summary(session):
    # Add a task in progress and a job running
    t = Task(
        id="t-1",
        seq=1,
        project_id="proj-test",
        title="Task Ativa",
        status="in_progress",
        priority="high",
        assignee_agent_id="ag-01",
    )
    j = Job(
        id="j-1",
        project_id="proj-test",
        task_id="t-1",
        agent_id="ag-01",
        status="running",
    )
    session.add_all([t, j])
    await session.commit()

    service = CockpitService(session)
    summary = await service.get_summary()

    assert "kpis" in summary
    assert summary["kpis"]["active_cards_count"] >= 1
    assert summary["kpis"]["running_jobs_count"] >= 1
    assert len(summary["running_jobs"]) >= 1
