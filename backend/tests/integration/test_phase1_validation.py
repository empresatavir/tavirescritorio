"""Integration test for Exit Validation of Phase 1 — Hybrid Persistence (SQLite WAL + PENDENTES.md mirror) and Delta API."""
import os
import sys
import pytest
from datetime import datetime, timezone, timedelta
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
async def test_phase1_exit_validation():
    # 1. Capture current timestamp to test delta filtering
    before_creation = (datetime.now(timezone.utc) - timedelta(seconds=2)).isoformat()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step A: Create card via API
        card_title = f"Card Validacao Fase 1 - {int(datetime.now().timestamp())}"
        card_desc = "Contexto da validacao de saida Fase 1: SQLite WAL e PENDENTES mirror."
        create_payload = {
            "project_id": "tavir-core",
            "title": card_title,
            "description": card_desc,
            "priority": "high",
            "sector": "Engenharia",
            "assignee_agent_id": "pm-projetos",
            "status": "pending",
        }
        resp = await client.post("/api/v1/tasks/", json=create_payload)
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"
        task_data = resp.json()
        assert task_data["title"] == card_title
        task_id = task_data["id"]

        # Step B: Verificar o registro no SQLite (office.db, kanban_cards)
        conn = office.get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM kanban_cards WHERE title = ?", (card_title,))
        card_row = cur.fetchone()
        assert card_row is not None, f"Card with title '{card_title}' not found in SQLite kanban_cards"
        assert card_row["status"] == "pendente"
        assert card_row["context"] == card_desc
        card_slug = card_row["slug"]
        conn.close()

        # Step C: Confirmar que PENDENTES.md foi atualizado identicamente ao padrão canônico
        pendentes_text = office.PENDENTES.read_text(encoding="utf-8")
        assert f"`{card_slug}` — {card_title}" in pendentes_text, "Card line not found in PENDENTES.md"
        assert card_desc in pendentes_text, "Card context not found in PENDENTES.md"

        # Step D: Testar GET /api/v1/tasks/?since=... validando que retorna vazio se nada mudou
        future_timestamp = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        resp_future = await client.get(f"/api/v1/tasks/?since={future_timestamp}")
        assert resp_future.status_code == 200
        assert resp_future.json() == [], f"Expected empty list for future since query, got {resp_future.json()}"

        # Testar que com since no passado (before_creation), a tarefa recém-criada é retornada
        resp_delta = await client.get(f"/api/v1/tasks/?since={before_creation}")
        assert resp_delta.status_code == 200
        delta_tasks = resp_delta.json()
        assert any(t["id"] == task_id for t in delta_tasks), f"Task {task_id} not returned in delta query since {before_creation}"
