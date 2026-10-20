"""Integration test for Exit Validation of Phase 3 — Isolamento de Execução via Git Worktree (Card #96) e Prova por Diff Isolada."""
import json
import os
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
async def test_phase3_worktree_isolation_exit_validation():
    """Validação de saída da Fase 3:
    1. Disparar jobs de dois cards distintos simultaneamente.
    2. Verificar criação e isolamento de .worktrees/task-X e .worktrees/task-Y.
    3. Confirmar que git diff de um não afeta o outro nem a branch principal.
    4. Validar commit intermediário de fase e reuso de worktree no mesmo card.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        repo_root = Path(tmp_dir) / "test_repo"
        repo_root.mkdir()

        # Inicializa git repo de teste
        run_git(repo_root, "init", "-q")
        run_git(repo_root, "config", "user.email", "test@tavir.local")
        run_git(repo_root, "config", "user.name", "Test Runner")
        run_git(repo_root, "config", "core.autocrlf", "false")
        (repo_root / "README.md").write_text("# TAVIR Test Repo\nbase\n", encoding="utf-8")
        (repo_root / "node_modules" / "test-pkg").mkdir(parents=True)
        (repo_root / "node_modules" / "test-pkg" / "index.js").write_text("console.log('test')", encoding="utf-8")
        (repo_root / ".gitignore").write_text("node_modules/\n.worktrees/\n", encoding="utf-8")
        run_git(repo_root, "add", "-A")
        run_git(repo_root, "commit", "-q", "-m", "chore: initial commit")

        pendentes_file = repo_root / "PENDENTES.md"
        pendentes_file.write_text(
            "# PENDENTES — mini kanban de assuntos\n\n<!-- KANBAN_NEXT_ID: 10 -->\n\n"
            "## 🟡 Pendente\n- [ ] #10 `card-alfa` — Card Alfa · aberto 2026-10-18\n"
            "- [ ] #11 `card-beta` — Card Beta · aberto 2026-10-18\n\n"
            "## 🔵 Em andamento\n\n## ✅ Concluído\n", encoding="utf-8"
        )
        office_db_file = repo_root / "office.db"
        worktrees_dir = repo_root / ".worktrees"
        jobs_dir = repo_root / "jobs"
        jobs_dir.mkdir()
        jobs_file = repo_root / "jobs.json"

        equipe_mock = {"equipe": [
            {"id": "pm-projetos", "nome": "Paula PM", "status": "idle", "tokens_jobs": {}},
            {"id": "qa", "nome": "Talita QA", "status": "idle", "tokens_jobs": {}},
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
            # 1. Garantir worktrees para os dois cards distintos
            wt_alfa, err_a = office.worktree_garantir("card-alfa")
            assert err_a == "", f"Erro ao garantir worktree alfa: {err_a}"
            assert wt_alfa is not None
            path_alfa = Path(wt_alfa["path"])

            wt_beta, err_b = office.worktree_garantir("card-beta")
            assert err_b == "", f"Erro ao garantir worktree beta: {err_b}"
            assert wt_beta is not None
            path_beta = Path(wt_beta["path"])

            # Verificar que os diretórios são distintos e estão em .worktrees/
            assert path_alfa != path_beta
            assert path_alfa.name == "task-10"
            assert path_beta.name == "task-11"
            assert (path_alfa / ".git").exists()
            assert (path_beta / ".git").exists()
            assert wt_alfa["branch"] == "task/10-card-alfa"
            assert wt_beta["branch"] == "task/11-card-beta"

            # 2. Verificar junction/symlink de node_modules
            assert (path_alfa / "node_modules" / "test-pkg" / "index.js").exists()

            # 3. Testar Prova por Diff ISOLADA:
            # Modificar arquivos exclusivamente no worktree Alfa
            (path_alfa / "README.md").write_text("# TAVIR Modificado em Alfa\n", encoding="utf-8")
            (path_alfa / "novo_alfa.txt").write_text("conteúdo alfa", encoding="utf-8")

            # Verificar Prova por Diff em Alfa vs Beta
            prova_alfa = office.worktree_prova_diff(path_alfa)
            prova_beta = office.worktree_prova_diff(path_beta)

            assert prova_alfa["mudou"] is True
            assert len(prova_alfa["status"]) >= 1
            assert prova_beta["mudou"] is False
            assert len(prova_beta["status"]) == 0

            # Confirmar que a branch principal e o repo raiz continuam estritamente limpos
            status_raiz = run_git(repo_root, "status", "--porcelain", "--", "README.md", "novo_alfa.txt")
            assert status_raiz == "", "Repo raiz foi contaminado por modificação no worktree!"
            conteudo_raiz = (repo_root / "README.md").read_text(encoding="utf-8")
            assert "base" in conteudo_raiz

            # 4. Commit intermediário da fase em Alfa
            sha_commit, err_c = office.worktree_commit_fase(path_alfa, 10, 1, "pm-projetos")
            assert err_c == ""
            assert sha_commit != ""
            msg_commit = run_git(path_alfa, "log", "-1", "--format=%s")
            assert msg_commit == "feat(task-10): concluída fase 1 por pm-projetos"

            # 5. Reuso do worktree para a fase 2 do mesmo card
            wt_alfa_reuso, err_reuso = office.worktree_garantir("card-alfa")
            assert err_reuso == ""
            assert wt_alfa_reuso["path"] == wt_alfa["path"]
            assert wt_alfa_reuso["criado"] is False  # Reutilizado, não recriado
            assert (path_alfa / "novo_alfa.txt").exists(), "Histórico da fase 1 preservado no worktree reutilizado"

            # 6. Testar paralelismo no claim de jobs
            with office.JOBS_LOCK:
                jd = office.jobs_load()
                j1 = office.job_novo(jd, "kanban", "card-alfa", "Job Alfa", "pm-projetos", "prompt alfa")
                j2 = office.job_novo(jd, "kanban", "card-beta", "Job Beta", "qa", "prompt beta")
                office.jobs_save(jd)

                claim1 = office.jobs_claim({"worker": "sidecar"})
                claim2 = office.jobs_claim({"worker": "sidecar", "jobs": [claim1["job"]["id"]]})

            assert claim1["job"] is not None
            assert claim2["job"] is not None
            assert claim1["job"]["ref"] != claim2["job"]["ref"]
            assert claim1["job"]["worktree_path"] != claim2["job"]["worktree_path"]

        finally:
            for p in reversed(patches):
                p.stop()
            # Desmonta junctions de node_modules antes do cleanup do tempdir no Windows
            for wt in (worktrees_dir).glob("task-*"):
                nm = wt / "node_modules"
                if nm.exists():
                    try:
                        nm.rmdir()
                    except OSError:
                        pass
