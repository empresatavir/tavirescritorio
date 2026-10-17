"""Integration tests for Cockpit, Tasks and Approvals REST API."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_cockpit_summary_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/cockpit/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "kpis" in data
        assert "running_jobs" in data
        assert "active_tasks" in data
        assert "escalated_tasks" in data
        assert "needs" in data


@pytest.mark.asyncio
async def test_tasks_flow_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List tasks
        resp = await client.get("/api/v1/tasks/")
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) > 0

        first_task = tasks[0]
        task_id = first_task["id"]

        # 2. Update status to in_progress
        patch_resp = await client.patch(
            f"/api/v1/tasks/{task_id}/status",
            json={"status": "in_progress"}
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_approvals_flow_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List approvals
        resp = await client.get("/api/v1/approvals/")
        assert resp.status_code == 200
        approvals = resp.json()
        assert len(approvals) > 0

        first_appr = approvals[0]
        appr_id = first_appr["id"]

        # 2. Decide approval
        decide_resp = await client.post(
            f"/api/v1/approvals/{appr_id}/decide",
            json={
                "decision": "approve",
                "decided_by": "CEO",
                "justification": "Aprovado em teste de integração"
            }
        )
        assert decide_resp.status_code == 200
        data = decide_resp.json()
        assert data["status"] == "approved"
        assert data["decided_by"] == "CEO"
