"""Unit tests for TAVIR repositories."""
import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.shared.database import Base
from app.models.agent import Agent
from app.models.project import Project
from app.modules.agents.repository import AgentRepository
from app.modules.projects.repository import ProjectRepository


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
async def test_agent_repository_create_and_list(session):
    repo = AgentRepository(session)
    agent = Agent(
        id=str(uuid.uuid4()),
        name="TestAgent",
        role="Tester",
        sector="QA",
        status="active",
    )
    created = await repo.create(agent)
    assert created.id == agent.id

    agents = await repo.list_all()
    assert len(agents) == 1
    assert agents[0].name == "TestAgent"


@pytest.mark.asyncio
async def test_agent_repository_get_by_id(session):
    repo = AgentRepository(session)
    agent_id = str(uuid.uuid4())
    agent = Agent(id=agent_id, name="FetchMe", role="Dev", sector="Eng", status="active")
    await repo.create(agent)

    fetched = await repo.get_by_id(agent_id)
    assert fetched is not None
    assert fetched.name == "FetchMe"

    missing = await repo.get_by_id(str(uuid.uuid4()))
    assert missing is None


@pytest.mark.asyncio
async def test_project_repository_create_and_list(session):
    repo = ProjectRepository(session)
    project = Project(
        id=str(uuid.uuid4()),
        slug="test-project",
        name="Test Project",
        client="TestClient",
        status="active",
    )
    created = await repo.create(project)
    assert created.slug == "test-project"

    projects = await repo.list_all()
    assert len(projects) == 1
    assert projects[0].client == "TestClient"