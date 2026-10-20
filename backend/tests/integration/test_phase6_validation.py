"""Phase 6 Exit Validation Tests:
- Automated Closure & Alterações Approval Gate:
  1. PATCH /api/v1/tasks/{id}/status to "done" fails with HTTP 409 Conflict if task has open or blocked phases.
  2. PATCH /api/v1/tasks/{id}/status to "done" succeeds when phases are clear:
     - Task status moves to "done".
     - Approval gate of type "alteracao" is registered for human sign-off.
     - Never merges or commits directly into main.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_phase6_task_done_blocked_if_phases_open():
    """Verify that concluding a task with incomplete/blocked phases returns HTTP 409."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Cria nova tarefa
        task_res = await client.post("/api/v1/tasks/", json={
            "title": "Migração de Banco de Dados Crítico",
            "description": "Executar migração de esquema",
            "priority": "high",
            "sector": "Engenharia",
        })
        assert task_res.status_code == 201
        task_data = task_res.json()
        task_id = task_data["id"]

        # 2. Configura escalação com fase aberta no office kanban
        import sys
        from pathlib import Path
        for parent in Path(__file__).resolve().parents:
            ag = parent / "AgenciaIA"
            if ag.exists() and (ag / "tools" / "office.py").exists():
                if str(ag) not in sys.path:
                    sys.path.insert(0, str(ag))
                break
        from tools import office
        cols = office.kan_load()
        k, card = office.kan_achar(cols, task_data["title"])
        if not card and task_data.get("seq"):
            k, card = office.kan_achar_numero(cols, task_data["seq"])

        if card:
            office.kan_escalacao_set(card["slug"], ["1. [ ] dev — migracao-schema", "2. [ ] qa — validacao-dados"])

        # 3. Tenta concluir a tarefa via API
        done_res = await client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "done"})
        assert done_res.status_code == 409, f"Expected 409 Conflict, got {done_res.status_code}: {done_res.text}"
        detail = done_res.json().get("detail", "")
        assert "ainda está" in detail or "fase" in detail


@pytest.mark.asyncio
async def test_phase6_task_done_creates_alteracao_and_approval_gate():
    """Verify that completing a task creates an Alteração and registers an Approval human gate."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Cria nova tarefa sem fases pendentes
        task_res = await client.post("/api/v1/tasks/", json={
            "title": "Implementação do Endpoint de Healthcheck",
            "description": "Endpoint leve para monitoramento",
            "priority": "normal",
            "sector": "Operação",
        })
        assert task_res.status_code == 201
        task_data = task_res.json()
        task_id = task_data["id"]

        # 2. Conclui a tarefa
        done_res = await client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "done"})
        assert done_res.status_code == 200, f"Expected 200 OK, got {done_res.status_code}: {done_res.text}"
        updated_task = done_res.json()
        assert updated_task["status"] == "done"

        # 3. Verifica se o Approval do tipo 'alteracao' foi criado
        appr_res = await client.get("/api/v1/approvals/")
        assert appr_res.status_code == 200, f"Failed to list approvals: {appr_res.text}"
        approvals = appr_res.json()
        task_approvals = [a for a in approvals if a.get("task_id") == task_id]
        assert len(task_approvals) >= 1, f"Expected approval created for task {task_id}, found: {approvals}"
        alteracao_app = next((a for a in task_approvals if a.get("type") == "alteracao"), None)
        assert alteracao_app is not None, "Expected an Approval of type 'alteracao'"
        assert alteracao_app["status"] == "pending"
        assert alteracao_app["impact"] == "high"
