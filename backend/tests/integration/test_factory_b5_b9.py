"""B5–B9 — QA, roadmap, execute, chat, access."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_b5_to_b9_pipeline():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B5 B9 Pipeline",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj_id = create.json()["id"]

        # B6 roadmap
        rm = await client.get(f"/api/v1/factory/projects/{proj_id}/roadmap")
        assert rm.status_code == 200
        assert rm.json()["total_stages"] >= 8
        assert isinstance(rm.json()["stages"], list)

        # B5 QA (ainda incompleto)
        qa = await client.get(f"/api/v1/factory/projects/{proj_id}/qa")
        assert qa.status_code == 200
        assert qa.json()["total"] >= 1
        assert qa.json()["ready_for_handoff"] is False

        # authorize brief → requirements running
        auth = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={},
        )
        assert auth.status_code == 200

        # B7 execute requirements
        exe = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/execute",
            json={},
        )
        assert exe.status_code == 200, exe.text
        assert exe.json().get("executed_files")
        assert any(e["action"] == "executed" for e in exe.json()["ledger"])

        # B8 chat
        chat = await client.post(
            f"/api/v1/factory/projects/{proj_id}/chat",
            json={"message": "Qual a etapa atual?", "agent_name": "Marina + Yuri"},
        )
        assert chat.status_code == 200, chat.text
        assert len(chat.json()["messages"]) == 2
        hist = await client.get(f"/api/v1/factory/projects/{proj_id}/chat")
        assert hist.status_code == 200
        assert len(hist.json()["messages"]) >= 2
        assert all(m.get("project_id") == proj_id for m in hist.json()["messages"])

        # B9 access
        put = await client.put(
            f"/api/v1/factory/projects/{proj_id}/access",
            json={"key": "SUPABASE_URL", "label": "Supabase", "value": "https://secret.example"},
        )
        assert put.status_code == 200
        acc = await client.get(f"/api/v1/factory/projects/{proj_id}/access")
        assert acc.status_code == 200
        item = next(i for i in acc.json()["items"] if i["key"] == "SUPABASE_URL")
        assert "•" in item["masked"]
        assert "secret.example" not in str(acc.json())
        assert "value_plain" not in item

        reveal = await client.post(
            f"/api/v1/factory/projects/{proj_id}/access/SUPABASE_URL/reveal",
            json={},
        )
        assert reveal.status_code == 200
        assert reveal.json()["revealed"] is False
