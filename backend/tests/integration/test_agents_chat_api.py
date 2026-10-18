"""Integration tests for Agents and Chat REST API."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_agents_api_roster_and_soul():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List agents - verify 47 agents
        resp = await client.get("/api/v1/agents/")
        assert resp.status_code == 200
        agents = resp.json()
        assert len(agents) >= 47

        # Check sectors presence
        sectors = {a["sector"] for a in agents}
        assert "Estratégia" in sectors
        assert "Engenharia" in sectors
        assert "Conteúdo" in sectors

        # 2. Get specific agent and soul
        first_agent = agents[0]
        ag_id = first_agent["id"]

        soul_resp = await client.get(f"/api/v1/agents/{ag_id}/soul")
        assert soul_resp.status_code == 200
        assert "soul_text" in soul_resp.json()

        # 3. Update soul
        put_resp = await client.put(
            f"/api/v1/agents/{ag_id}/soul",
            json={"soul_text": "# Alma Atualizada em Teste"}
        )
        assert put_resp.status_code == 200
        assert put_resp.json()["soul_text"] == "# Alma Atualizada em Teste"


@pytest.mark.asyncio
async def test_chat_api_conversations_and_messages(monkeypatch):
    monkeypatch.setattr("app.modules.chat.service.GHOSTCLI_API_KEY", "")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List conversations
        resp = await client.get("/api/v1/chat/conversations")
        assert resp.status_code == 200
        conversations = resp.json()
        assert len(conversations) >= 1

        conv_id = conversations[0]["id"]

        # 2. Update settings
        patch_resp = await client.patch(
            f"/api/v1/chat/conversations/{conv_id}/settings",
            json={"settings": {"insp": 45, "effort": "alto"}}
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["settings"]["insp"] == 45

        # 3. Send message
        msg_resp = await client.post(
            f"/api/v1/chat/conversations/{conv_id}/messages",
            json={"text": "Qual o status do deploy atual?"}
        )
        assert msg_resp.status_code == 200
        msg_data = msg_resp.json()
        assert msg_data["user_message"]["text"] == "Qual o status do deploy atual?"

        # 4. Get conversation with messages
        detail_resp = await client.get(f"/api/v1/chat/conversations/{conv_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert "conversation" in detail
        assert "messages" in detail
        assert len(detail["messages"]) >= 1

        # 3. Update settings
        patch_resp = await client.patch(
            f"/api/v1/chat/conversations/{conv_id}/settings",
            json={"settings": {"insp": 45, "effort": "alto"}}
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["settings"]["insp"] == 45

        # 4. Send message
        msg_resp = await client.post(
            f"/api/v1/chat/conversations/{conv_id}/messages",
            json={"text": "Qual o status do deploy atual?"}
        )
        assert msg_resp.status_code == 200
        msg_data = msg_resp.json()
        assert msg_data["user_message"]["text"] == "Qual o status do deploy atual?"
        assert msg_data["assistant_message"]["role"] == "assistant"
        assert len(msg_data["assistant_message"]["text"]) > 10
