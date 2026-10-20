"""Integração Fase 6 — propagação Tasks ↔ Aprovações ↔ Cockpit (gate de alteração)."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.shared.database import ensure_schema_patches


@pytest.fixture(autouse=True)
async def _schema():
    await ensure_schema_patches()


@pytest.mark.asyncio
async def test_done_creates_alteracao_visible_in_approvals_and_cockpit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/v1/tasks/",
            json={
                "title": f"Cross-screen gate {__import__('time').time()}",
                "description": "Fase 6 propagação",
                "priority": "high",
                "sector": "Operação",
            },
        )
        assert created.status_code == 201, created.text
        task = created.json()
        task_id = task["id"]

        done = await client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "done"})
        assert done.status_code == 200, done.text
        assert done.json()["status"] == "done"

        apprs = await client.get("/api/v1/approvals/")
        assert apprs.status_code == 200
        linked = [a for a in apprs.json() if a.get("task_id") == task_id]
        assert linked, "Expected approval linked to task after done"
        alt = next((a for a in linked if a.get("type") == "alteracao"), linked[0])
        assert alt["status"] == "pending"
        assert alt.get("task_id") == task_id

        cockpit = await client.get("/api/v1/cockpit/summary")
        assert cockpit.status_code == 200, cockpit.text
        data = cockpit.json()
        badges = data.get("badge_counts") or {}
        # Contagens coerentes com a fonte de approvals
        assert badges.get("approvals", 0) >= 1
        assert badges.get("changes", 0) >= 1
        needs = data.get("needs") or []
        labels = " ".join(str(n.get("label", "")).lower() for n in needs)
        assert "aprova" in labels or "altera" in labels


@pytest.mark.asyncio
async def test_cockpit_includes_to_plan_in_active_cards():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/v1/tasks/",
            json={
                "title": f"To plan cockpit {__import__('time').time()}",
                "description": "deve contar como card ativo",
                "priority": "normal",
                "sector": "Operação",
            },
        )
        assert created.status_code == 201
        task = created.json()
        assert task["status"] in ("to_plan", "pending")

        cockpit = await client.get("/api/v1/cockpit/summary")
        assert cockpit.status_code == 200
        active_ids = {t.get("taskId") for t in (cockpit.json().get("active_tasks") or [])}
        assert task["id"] in active_ids
