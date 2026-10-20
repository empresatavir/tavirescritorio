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
        assert body2["current_stage_id"] == "req_gate"
        gate2 = next(s for s in body2["stages"] if s["stage_def_id"] == "req_gate")
        assert gate2["status"] == "awaiting_gate"
        req_done = next(s for s in body2["stages"] if s["stage_def_id"] == "requirements")
        assert req_done["artifact_hash"] == "abc123"

        ledger = await client.get(f"/api/v1/factory/projects/{proj_id}/ledger")
        assert ledger.status_code == 200
        entries = ledger.json()["ledger"]
        assert len(entries) >= 3  # run_started + authorized + completed
        actions = {e["action"] for e in entries}
        assert "authorized" in actions
        assert "completed" in actions


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
