"""Unit tests for Agents and Chat repositories and service."""
import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.shared.database import Base
from app.models.agent import Agent
from app.models.chat_conversation import ChatConversation
from app.models.chat_message import ChatMessage
from app.modules.agents.repository import AgentRepository
from app.modules.chat.repository import ChatRepository
from app.modules.chat.service import ChatService


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        # Create test agent
        agent = Agent(
            id="ag-test-1",
            name="Tester",
            role="QA Automation",
            sector="Qualidade",
            status="active",
            soul_text="# Alma de Teste",
        )
        s.add(agent)
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_agent_soul_update(session):
    repo = AgentRepository(session)
    updated = await repo.update_soul("ag-test-1", "# Nova Alma de Operação")
    await session.commit()

    assert updated is not None
    assert updated.soul_text == "# Nova Alma de Operação"

    # Search
    found = await repo.list_all(sector="Qualidade", search="tester")
    assert len(found) == 1
    assert found[0].name == "Tester"


@pytest.mark.asyncio
async def test_chat_flow_service(session, monkeypatch):
    monkeypatch.setattr("app.modules.ghostcli.client.api_key", lambda: "")
    monkeypatch.setattr("app.modules.chat.service.is_configured", lambda: False)
    chat_repo = ChatRepository(session)
    conv = await chat_repo.create_conversation(
        agent_id="ag-test-1",
        title="Dúvida de Teste",
        settings={"model": "gpt-4o", "effort": "alto", "insp": 40},
    )
    await session.commit()
    assert conv.id.startswith("cv-")

    service = ChatService(session)
    user_msg, assistant_msg = await service.process_user_message(conv.id, "Como validar o build?")
    await session.commit()

    assert user_msg.role == "user"
    assert user_msg.text == "Como validar o build?"
    assert assistant_msg.role == "assistant"
    assert "Tester" in assistant_msg.text or "QA Automation" in assistant_msg.text
    assert "gpt-4o" in assistant_msg.meta

    # Check conversation messages list
    messages = await chat_repo.get_messages(conv.id)
    assert len(messages) == 2
