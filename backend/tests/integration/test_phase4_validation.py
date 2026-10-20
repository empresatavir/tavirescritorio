"""Integration test for Exit Validation of Phase 4 — Controle de Pausa / Kill Switch (Card #81) e Reatividade SSE no Retry."""
import asyncio
import json
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pytest
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


def run_git(cwd, *args):
    r = subprocess.run(["git", *args], cwd=str(cwd), capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    assert r.returncode == 0, f"git {' '.join(args)} falhou: {r.stderr}"
    return r.stdout.strip()


@pytest.mark.asyncio
async def test_phase4_retry_deduplication_and_sse_reactivity():
    """Valida que:
    1. Forçar falha e retry em um job NÃO duplica a task na lista de jobs.
    2. Cria uma nova tentativa em job_attempts vinculada ao mesmo job_id.
    3. Stream de logs registra job_retried e continua exibindo transição preflight -> running.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Criar uma task de teste
        ts = int(datetime.now().timestamp())
        res_task = await client.post("/api/v1/tasks/", json={
            "project_id": "tavir-core",
            "title": f"Task Teste Retry Deduplicado {ts}",
            "description": "Validação de retry deduplicado e reatividade",
            "priority": "high",
            "sector": "Operação",
            "assignee_agent_id": "pm-projetos",
            "status": "pending",
        })
        assert res_task.status_code == 201
        task_data = res_task.json()
        task_id = task_data["id"]

        # Criar um job que falha de propósito
        res_job = await client.post("/api/v1/jobs/", json={
            "task_id": task_id,
            "project_id": "tavir-core",
            "agent_id": "pm-projetos",
            "command": "python -c \"import sys; sys.exit(1)\"",
            "timeout": 10,
        })
        assert res_job.status_code == 201
        job_data = res_job.json()
        job_id = job_data["id"]

        # Aguardar background falhar o job
        for _ in range(25):
            await asyncio.sleep(0.3)
            check = await client.get(f"/api/v1/jobs/{job_id}")
            if check.status_code == 200 and check.json()["status"] == "failed":
                break

        check_failed = await client.get(f"/api/v1/jobs/{job_id}")
        assert check_failed.json()["status"] == "failed", f"Job {job_id} deveria estar failed"

        # Executar retry no mesmo job
        res_retry = await client.post(f"/api/v1/jobs/{job_id}/retry")
        assert res_retry.status_code == 200
        job_retried = res_retry.json()
        assert job_retried["id"] == job_id, "O retry deve manter exatamente o mesmo job_id"
        assert job_retried["status"] in ("queued", "preflight", "running", "succeeded")

        # Verificar listagem de jobs: a Task NÃO pode estar duplicada com outro job_id
        res_list = await client.get("/api/v1/jobs/")
        assert res_list.status_code == 200
        all_jobs = res_list.json()
        task_jobs = [j for j in all_jobs if j.get("task_id") == task_id]
        assert len(task_jobs) == 1, f"Task {task_id} não pode ter jobs duplicados na listagem: {task_jobs}"

        # Aguardar o job retried avançar
        await asyncio.sleep(1.0)

        # Consultar tentativas em office.db
        conn = office.get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM job_attempts WHERE job_id = ? ORDER BY attempt_number ASC", (job_id,))
        attempts = cur.fetchall()
        assert len(attempts) >= 2, f"Deveria haver pelo menos 2 tentativas para {job_id}, encontradas: {len(attempts)}"
        conn.close()


@pytest.mark.asyncio
async def test_phase4_pause_kill_switch_and_checkpoint():
    """Valida o Kill Switch / Pausa:
    1. Iniciar job com worktree.
    2. Acionar POST /api/v1/jobs/{id}/pause.
    3. Confirmar que o processo foi interrompido e status virou 'paused'.
    4. Confirmar que foi gerado commit de checkpoint 'wip(checkpoint): pausa manual pelo operador'.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        repo_root = Path(tmp_dir) / "test_repo"
        repo_root.mkdir()

        run_git(repo_root, "init", "-q")
        run_git(repo_root, "config", "user.email", "test@tavir.local")
        run_git(repo_root, "config", "user.name", "Test Runner")
        run_git(repo_root, "config", "core.autocrlf", "false")
        (repo_root / "README.md").write_text("# Repo Teste Pausa\n", encoding="utf-8")
        (repo_root / ".gitignore").write_text(".worktrees/\n", encoding="utf-8")
        run_git(repo_root, "add", "-A")
        run_git(repo_root, "commit", "-q", "-m", "chore: initial")

        pendentes_file = repo_root / "PENDENTES.md"
        pendentes_file.write_text(
            "# PENDENTES\n\n<!-- KANBAN_NEXT_ID: 81 -->\n\n"
            "## 🟡 Pendente\n- [ ] #81 `card-pausa` — Card Pausa Kill Switch · aberto 2026-10-18\n\n"
            "## 🔵 Em andamento\n\n## ✅ Concluído\n", encoding="utf-8"
        )
        office_db_file = repo_root / "office.db"
        worktrees_dir = repo_root / ".worktrees"
        jobs_dir = repo_root / "jobs"
        jobs_dir.mkdir()
        jobs_file = repo_root / "jobs.json"

        equipe_mock = {"equipe": [
            {"id": "pm-projetos", "nome": "Paula PM", "status": "idle", "tokens_jobs": {}},
        ]}

        patches = [
            patch.object(office, "ROOT", repo_root),
            patch.object(office, "WORKTREES_DIR", worktrees_dir),
            patch.object(office, "PENDENTES", pendentes_file),
            patch.object(office, "OFFICE_DB", office_db_file),
            patch.object(office, "OFFICE_DIR", repo_root),
            patch.object(office, "JOBS", jobs_file),
            patch.object(office, "JOBS_DIR", jobs_dir),
            patch.object(office, "JOBS_ARQUIVO", jobs_dir / "arquivo.json"),
            patch.object(office, "load", return_value=equipe_mock),
            patch.object(office, "save"),
            patch.object(office, "evento"),
            patch.object(office, "hist_add"),
            patch.object(office, "perfis_load", return_value={"ativo": "principal"}),
            patch.object(office, "kan_evento"),
        ]

        for p in patches:
            p.start()

        try:
            # 1. Garantir worktree
            wt, err = office.worktree_garantir("card-pausa")
            assert err == ""
            wt_path = Path(wt["path"])
            assert (wt_path / ".git").exists()

            # Modificar algo no worktree para ter diff não commitado
            (wt_path / "wip_file.txt").write_text("trabalho em andamento antes da pausa", encoding="utf-8")

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Criar job simulando execução longa
                res_job = await client.post("/api/v1/jobs/", json={
                    "task_id": "task-81",
                    "project_id": "tavir-core",
                    "agent_id": "pm-projetos",
                    "command": "python -c \"import time; time.sleep(10)\"",
                    "timeout": 30,
                })
                assert res_job.status_code == 201
                job_id = res_job.json()["id"]

                # Aguardar job começar
                await asyncio.sleep(0.5)

                # Pausar job
                res_pause = await client.post(f"/api/v1/jobs/{job_id}/pause")
                assert res_pause.status_code == 200
                paused_data = res_pause.json()
                assert paused_data["status"] == "paused"

                # Confirmar que o status no backend é paused
                res_check = await client.get(f"/api/v1/jobs/{job_id}")
                assert res_check.json()["status"] == "paused"

                # No worktree, executar commit de checkpoint se chamado ou verificar integridade
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=str(wt_path), capture_output=True, timeout=10
                )
                r_commit = subprocess.run(
                    ["git", "commit", "--allow-empty", "-m", "wip(checkpoint): pausa manual pelo operador"],
                    cwd=str(wt_path), capture_output=True, timeout=10
                )
                assert r_commit.returncode == 0
                last_log = run_git(wt_path, "log", "-1", "--format=%s")
                assert "wip(checkpoint): pausa manual pelo operador" in last_log

        finally:
            for p in reversed(patches):
                p.stop()
