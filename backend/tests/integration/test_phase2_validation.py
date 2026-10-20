"""Integration test for Exit Validation of Phase 2 — Hard Blocker de Dependências (Card #95) e Orquestração de Fases."""
import json
import sys
import pytest
from datetime import datetime
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app

AGENCIA_DIR = None
for parent in Path(__file__).resolve().parents:
    ag = parent / "AgenciaIA"
    if ag.exists() and (ag / "tools" / "office.py").exists():
        AGENCIA_DIR = ag
        break

if AGENCIA_DIR and str(AGENCIA_DIR) not in sys.path:
    sys.path.insert(0, str(AGENCIA_DIR))
from tools import office


@pytest.mark.asyncio
async def test_phase2_exit_validation():
    ts = int(datetime.now().timestamp())
    title_a = f"Card A Dep Pred - {ts}"
    title_b = f"Card B Dep Succ - {ts}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Criar o Card A (pendente)
        resp_a = await client.post("/api/v1/tasks/", json={
            "project_id": "tavir-core",
            "title": title_a,
            "description": "Tarefa A precedente",
            "priority": "high",
            "sector": "Engenharia",
            "assignee_agent_id": "pm-projetos",
            "status": "pending",
        })
        assert resp_a.status_code == 201, f"Failed to create Task A: {resp_a.text}"
        task_a = resp_a.json()
        task_a_id = task_a["id"]
        seq_a = task_a.get("seq")

        # Step 2: Criar o Card B com depends_on: [A]
        dep_ref = seq_a if seq_a else task_a_id
        resp_b = await client.post("/api/v1/tasks/", json={
            "project_id": "tavir-core",
            "title": title_b,
            "description": f"Tarefa B dependente de #{dep_ref}",
            "priority": "high",
            "sector": "Engenharia",
            "assignee_agent_id": "pm-projetos",
            "status": "pending",
            "depends_on": [dep_ref],
        })
        assert resp_b.status_code == 201, f"Failed to create Task B: {resp_b.text}"
        task_b = resp_b.json()
        task_b_id = task_b["id"]
        seq_b = task_b.get("seq")

        # Step 3: Verificar persistência de depends_on no SQLite office.db e no PENDENTES.md
        conn = office.get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM kanban_cards WHERE title = ?", (title_b,))
        row_b = cur.fetchone()
        assert row_b is not None, "Card B not found in SQLite kanban_cards"
        deps_saved = json.loads(row_b["depends_on_json"])
        assert str(dep_ref) in [str(d).lstrip("#") for d in deps_saved] or dep_ref in deps_saved, f"depends_on not saved in SQLite: {deps_saved}"
        conn.close()

        pendentes_text = office.PENDENTES.read_text(encoding="utf-8")
        assert f"depends_on: #{dep_ref}" in pendentes_text or f"depends_on: {dep_ref}" in pendentes_text, "depends_on metadata missing in PENDENTES.md"

        # Step 4: Tentar iniciar execução de B via kan_iniciar_execucao e confirmar bloqueio
        job_cli, erro_cli, _ = office.kan_iniciar_execucao(row_b["slug"])
        assert job_cli is None, "kan_iniciar_execucao should have aborted"
        assert "bloqueado por dependências" in erro_cli, f"Expected dependency block error, got: {erro_cli}"

        # Step 5: Tentar iniciar o Card B via POST /api/v1/jobs/ e confirmar o bloqueio HTTP 409 Conflict
        job_payload_b = {
            "task_id": task_b_id,
            "project_id": "tavir-core",
            "agent_id": "pm-projetos",
            "command": f"echo 'Planejando Task B #{seq_b}'",
            "timeout": 60,
        }
        resp_job_blocked = await client.post("/api/v1/jobs/", json=job_payload_b)
        assert resp_job_blocked.status_code == 409, f"Expected HTTP 409 Conflict, got {resp_job_blocked.status_code}: {resp_job_blocked.text}"
        assert "bloqueada por dependências" in resp_job_blocked.json()["detail"]

        # Step 6: Concluir o Card A
        cur_cols = office.kan_load()
        _, item_a = office.kan_achar_numero(cur_cols, seq_a) if seq_a else office.kan_achar(cur_cols, task_a_id)
        assert item_a is not None, "Card A item not found in kanban"
        office.kan_done(item_a["slug"], obs="Conclusão validada em teste de integração")

        # Confirmar que Card A agora está concluído
        cur_cols_after = office.kan_load()
        col_a_after, _ = office.kan_achar(cur_cols_after, item_a["slug"])
        assert col_a_after == "concluido", f"Expected Card A to be in concluido, got {col_a_after}"

        # Step 7: Acionar novamente o Card B via POST /api/v1/jobs/ e confirmar sucesso HTTP 201 sem erro 500
        resp_job_success = await client.post("/api/v1/jobs/", json=job_payload_b)
        assert resp_job_success.status_code == 201, f"Expected HTTP 201 Created after unblock, got {resp_job_success.status_code}: {resp_job_success.text}"
        job_created = resp_job_success.json()
        assert job_created["task_id"] == task_b_id
        assert job_created["status"] == "queued"

        # Step 8: Confirmar gravação correta nas tabelas jobs e job_attempts (tavir.db e office.db)
        # Em office.db:
        conn = office.get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM jobs WHERE id = ?", (job_created["id"],))
        office_job_row = cur.fetchone()
        assert office_job_row is not None, f"Job {job_created['id']} not found in office.db jobs table"
        assert office_job_row["task_id"] == task_b_id

        cur.execute("SELECT * FROM job_attempts WHERE job_id = ?", (job_created["id"],))
        office_att_rows = cur.fetchall()
        assert len(office_att_rows) >= 1, "No attempt record in office.db job_attempts"
        conn.close()


@pytest.mark.asyncio
async def test_job_payload_task68_handling():
    """Valida o diagnóstico e tratamento sem erro 500 para o payload da Task #68."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload_68 = {
            "task_id": "task-68",
            "project_id": "tavir-core",
            "agent_id": "pm-projetos",
            "command": "echo '[Paula PM · Fable] Planejando e orquestrando Task #68 (Esforço: Máximo)'",
            "timeout": 600,
        }
        res = await client.post("/api/v1/jobs/", json=payload_68)
        # Se a Task #68 estiver bloqueada por gate ou dependência, deve retornar HTTP 409; se desimpedida, 201.
        # Sob nenhuma hipótese deve retornar 500 Internal Server Error.
        assert res.status_code in (201, 409), f"Expected 201 or 409, got 500 or other: {res.status_code}: {res.text}"
        if res.status_code == 409:
            assert "bloqueada" in res.json()["detail"].lower()
        elif res.status_code == 201:
            data = res.json()
            assert data["task_id"] == "task-68"
            assert data["model_name"] == "Fable"
            assert data["effort"] == "max"
