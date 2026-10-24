"""B1 — authorize gate, complete stage, fail, ledger, stages_done."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_b1_authorize_complete_and_ledger():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B1 Flow LP",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj_id = create.json()["id"]

        run0 = (await client.get(f"/api/v1/factory/projects/{proj_id}/run")).json()
        assert run0["current_stage_id"] == "brief"
        assert run0["stages"][0]["status"] == "awaiting_gate"

        # complete em gate deve falhar
        bad = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/complete",
            json={},
        )
        assert bad.status_code == 409

        auth = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={"note": "Brief ok", "actor": "CEO local"},
        )
        assert auth.status_code == 200, auth.text
        body = auth.json()
        assert body["stages_done"] == 1
        assert body["current_stage_id"] == "requirements"
        req_stage = next(s for s in body["stages"] if s["stage_def_id"] == "requirements")
        assert req_stage["status"] == "running"
        assert any(e["action"] == "authorized" for e in body["ledger"])

        done = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/complete",
            json={"note": "Requisitos gerados", "artifact_hash": "abc123"},
        )
        assert done.status_code == 200, done.text
        body2 = done.json()
        assert body2["stages_done"] == 2
        assert body2["current_stage_id"] == "architecture"
        arch = next(s for s in body2["stages"] if s["stage_def_id"] == "architecture")
        assert arch["status"] == "running"
        assert arch["agent"] == "Ari Arquiteto"
        req_done = next(s for s in body2["stages"] if s["stage_def_id"] == "requirements")
        assert req_done["artifact_hash"] == "abc123"
        paula = next(s for s in body2["stages"] if s["stage_def_id"] == "paula_plan")
        assert paula["agent"] == "Paula PM"
        assert "roadmap.md" in (paula.get("expected_artifacts") or [])

        ledger = await client.get(f"/api/v1/factory/projects/{proj_id}/ledger")
        assert ledger.status_code == 200
        entries = ledger.json()["ledger"]
        assert len(entries) >= 3  # run_started + authorized + completed
        actions = {e["action"] for e in entries}
        assert "authorized" in actions
        assert "completed" in actions


@pytest.mark.asyncio
async def test_b1_redo_gate_and_restart():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B1 Redo LP",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj_id = create.json()["id"]

        early = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/plan_gate/redo",
            json={"note": "cedo demais"},
        )
        assert early.status_code == 409

        auth = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={"note": "Brief ok", "actor": "CEO local"},
        )
        assert auth.status_code == 200, auth.text

        redo = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/redo",
            json={
                "note": "Brief curto demais, detalhar o público",
                "model": "claude-sonnet-5",
                "effort": "high",
                "actor": "CEO local",
            },
        )
        assert redo.status_code == 200, redo.text
        body = redo.json()
        assert body["status"] == "running"
        assert body["current_stage_id"] == "brief"
        brief = next(s for s in body["stages"] if s["stage_def_id"] == "brief")
        assert brief["status"] == "awaiting_gate"
        req = next(s for s in body["stages"] if s["stage_def_id"] == "requirements")
        assert req["status"] == "queued"
        assert body["meta"]["model"] == "claude-sonnet-5"
        assert body["meta"]["effort"] == "high"
        assert body["meta"]["redo"]["gate_id"] == "brief"
        assert "brief" in body["meta"]["redo"]["force_ids"]
        assert any(e["action"] == "redo" for e in body["ledger"])

        auth2 = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={"actor": "CEO local"},
        )
        assert auth2.status_code == 200, auth2.text
        for stage_id, nxt in (
            ("requirements", "architecture"),
            ("architecture", "paula_plan"),
            ("paula_plan", "plan_gate"),
        ):
            step = await client.post(
                f"/api/v1/factory/projects/{proj_id}/stages/{stage_id}/complete",
                json={"artifact_hash": stage_id},
            )
            assert step.status_code == 200, step.text
            assert step.json()["current_stage_id"] == nxt

        redo_plan = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/plan_gate/redo",
            json={"note": "plano sem kanban", "effort": "xhigh"},
        )
        assert redo_plan.status_code == 200, redo_plan.text
        planned = redo_plan.json()
        assert planned["current_stage_id"] == "requirements"
        assert next(s for s in planned["stages"] if s["stage_def_id"] == "requirements")["status"] == "running"
        assert next(s for s in planned["stages"] if s["stage_def_id"] == "plan_gate")["status"] == "queued"
        assert next(s for s in planned["stages"] if s["stage_def_id"] == "visual_proof")["status"] == "queued"
        assert planned["meta"]["redo"]["force_ids"][:3] == ["requirements", "architecture", "paula_plan"]
        assert "plan_ready" not in planned["meta"]

        restart = await client.post(
            f"/api/v1/factory/projects/{proj_id}/run/restart",
            json={"note": "começar de novo", "model": "claude-opus-5-5", "effort": "xhigh"},
        )
        assert restart.status_code == 200, restart.text
        again = restart.json()
        assert again["current_stage_id"] == "brief"
        assert again["stages_done"] == 0
        assert again["stages"][0]["status"] == "awaiting_gate"
        assert all(s["status"] == "queued" for s in again["stages"][1:])
        assert again["meta"]["model"] == "claude-opus-5-5"
        assert "plan_ready" not in again["meta"]
        force_ids = again["meta"]["redo"]["force_ids"]
        assert "brief" in force_ids
        assert "requirements" in force_ids
        assert "paula_plan" in force_ids
        assert "build" in force_ids
        assert any(e["action"] == "restarted" for e in again["ledger"])


@pytest.mark.asyncio
async def test_b1_fail_pauses_run():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B1 Fail LP",
                "company": "TAVIR",
                "ownership": "externo",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201
        proj_id = create.json()["id"]

        await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={},
        )
        fail = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/fail",
            json={"note": "Parser quebrou"},
        )
        assert fail.status_code == 200, fail.text
        body = fail.json()
        assert body["status"] == "paused"
        failed = next(s for s in body["stages"] if s["stage_def_id"] == "requirements")
        assert failed["status"] == "failed"
        assert any(e["action"] == "failed" for e in body["ledger"])
