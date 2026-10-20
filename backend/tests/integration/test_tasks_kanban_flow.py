"""Integração — fluxo kanban Tasks (Fase 5): create → plan → exec → done, depends_on, anexo."""
import asyncio
import io
from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.shared.database import ensure_schema_patches


@pytest.fixture(autouse=True)
async def _ensure_task_schema():
    """ASGITransport não dispara lifespan — garante coluna depends_on no SQLite."""
    await ensure_schema_patches()
    yield


async def _wait_job(client: AsyncClient, job_id: str, want: set[str], attempts: int = 40) -> dict:
    last = {}
    for _ in range(attempts):
        await asyncio.sleep(0.25)
        res = await client.get(f"/api/v1/jobs/{job_id}")
        assert res.status_code == 200
        last = res.json()
        if last.get("status") in want:
            return last
    raise AssertionError(f"Job {job_id} não chegou a {want}; último={last}")


async def _get_task(client: AsyncClient, task_id: str) -> dict:
    res = await client.get(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 200
    return res.json()


@pytest.mark.asyncio
async def test_create_task_assigns_seq_and_to_plan_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())
        res = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Kanban create {ts}",
                "description": "Fase 5 create",
                "priority": "high",
                "sector": "Operação",
                "assignee_agent_id": "pm-projetos",
                "status": "pending",  # legado → to_plan
            },
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["status"] == "to_plan"
        assert data.get("seq") is not None and int(data["seq"]) > 0


@pytest.mark.asyncio
async def test_create_with_depends_on_persisted():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())
        # Task bloqueante
        a = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Dep A {ts}",
                "priority": "normal",
                "assignee_agent_id": "pm-projetos",
            },
        )
        assert a.status_code == 201, a.text
        seq_a = str(a.json()["seq"])

        b = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Dep B {ts}",
                "priority": "normal",
                "assignee_agent_id": "pm-projetos",
                "depends_on": [f"#{seq_a}", seq_a],
            },
        )
        assert b.status_code == 201, b.text
        data = b.json()
        deps = [str(d).lstrip("#") for d in (data.get("depends_on") or [])]
        assert seq_a in deps
        tags = data.get("tags") or []
        assert any(str(t) == f"depends:#{seq_a}" for t in tags)


@pytest.mark.asyncio
async def test_upload_attachment_on_task():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())
        created = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Anexo {ts}",
                "priority": "normal",
                "assignee_agent_id": "pm-projetos",
            },
        )
        assert created.status_code == 201, created.text
        task_id = created.json()["id"]

        files = {
            "file": ("briefing.md", io.BytesIO(b"# Briefing\nconteudo"), "text/markdown"),
        }
        up = await client.post(f"/api/v1/tasks/{task_id}/attachments", files=files)
        assert up.status_code == 200, up.text
        data = up.json()
        tags = [str(t) for t in (data.get("tags") or [])]
        assert any(t.startswith("file:briefing") for t in tags)
        assert any(t.startswith("file_path:") for t in tags)

        # Extensão inválida
        bad = await client.post(
            f"/api/v1/tasks/{task_id}/attachments",
            files={"file": ("x.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        )
        assert bad.status_code == 400


@pytest.mark.asyncio
async def test_planning_then_execution_full_cycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())
        created = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Ciclo completo {ts}",
                "description": "Validar planning → planned → execution → done",
                "priority": "high",
                "sector": "Operação",
                "assignee_agent_id": "pm-projetos",
            },
        )
        assert created.status_code == 201, created.text
        task_id = created.json()["id"]
        assert created.json()["status"] == "to_plan"

        # Planejar
        plan_job = await client.post(
            "/api/v1/jobs/",
            json={
                "task_id": task_id,
                "project_id": "tavir-core",
                "agent_id": "pm-projetos",
                "model_name": "Fable",
                "effort": "Rápido",
                "origin": "planning",
                "command": f'echo "[Paula] plan {ts}"',
                "timeout": 30,
            },
        )
        assert plan_job.status_code == 201, plan_job.text
        plan_id = plan_job.json()["id"]

        mid = await _get_task(client, task_id)
        assert mid["status"] == "planning"

        await _wait_job(client, plan_id, {"succeeded", "failed"})
        after_plan = await _get_task(client, task_id)
        assert after_plan["status"] == "planned", after_plan
        assert "plan:ready" in (after_plan.get("tags") or [])

        # Executar
        exec_job = await client.post(
            "/api/v1/jobs/",
            json={
                "task_id": task_id,
                "project_id": "tavir-core",
                "agent_id": "pm-projetos",
                "model_name": "Fable",
                "effort": "Rápido",
                "origin": "execution",
                "command": f'echo "[Paula] exec {ts}"',
                "timeout": 30,
            },
        )
        assert exec_job.status_code == 201, exec_job.text
        exec_id = exec_job.json()["id"]

        mid2 = await _get_task(client, task_id)
        assert mid2["status"] == "in_progress"

        await _wait_job(client, exec_id, {"succeeded", "failed"})
        done = await _get_task(client, task_id)
        assert done["status"] == "done", done


@pytest.mark.asyncio
async def test_cancel_execution_returns_to_planned():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())
        created = await client.post(
            "/api/v1/tasks/",
            json={
                "project_id": "tavir-core",
                "title": f"Cancel exec {ts}",
                "priority": "normal",
                "assignee_agent_id": "pm-projetos",
            },
        )
        assert created.status_code == 201, created.text
        task_id = created.json()["id"]

        # Força planned via patch (simula plano pronto)
        patched = await client.patch(
            f"/api/v1/tasks/{task_id}",
            json={"status": "planned", "tags": ["plan:ready", "model:Fable"]},
        )
        assert patched.status_code == 200, patched.text

        job = await client.post(
            "/api/v1/jobs/",
            json={
                "task_id": task_id,
                "project_id": "tavir-core",
                "agent_id": "pm-projetos",
                "origin": "execution",
                # Sleep curto o bastante para cancelar enquanto ainda roda
                "command": 'python -c "import time; time.sleep(8)"',
                "timeout": 20,
            },
        )
        assert job.status_code == 201, job.text
        job_id = job.json()["id"]

        # Garante que entrou em execução
        for _ in range(20):
            await asyncio.sleep(0.2)
            t = await _get_task(client, task_id)
            if t["status"] == "in_progress":
                break

        cancel = await client.post(f"/api/v1/jobs/{job_id}/cancel")
        assert cancel.status_code == 200, cancel.text

        after = await _get_task(client, task_id)
        assert after["status"] == "planned", after
        assert after.get("active_job_id") in (None, "")


@pytest.mark.asyncio
async def test_list_normalizes_legacy_pending_to_to_plan():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/tasks/")
        assert res.status_code == 200
        for t in res.json():
            assert t["status"] in {
                "to_plan",
                "planning",
                "planned",
                "in_progress",
                "done",
            }, t
