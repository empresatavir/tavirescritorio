"""B3 — resume pós-fail, pause suave, pendências derivadas."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_b3_fail_resume_and_pendencies():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B3 Resume LP",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj_id = create.json()["id"]

        run0 = (await client.get(f"/api/v1/factory/projects/{proj_id}/run")).json()
        assert any(p["kind"] == "auth" for p in run0.get("pendencies") or [])

        await client.post(f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize", json={})

        fail = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/fail",
            json={"note": "Parser quebrou"},
        )
        assert fail.status_code == 200, fail.text
        body = fail.json()
        assert body["status"] == "paused"
        pendencies = body.get("pendencies") or []
        assert any(p["kind"] == "error" and p.get("action") == "resume" for p in pendencies)
        assert any(p.get("cause") == "Parser quebrou" for p in pendencies)

        # complete enquanto failed deve falhar
        bad = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/complete",
            json={},
        )
        assert bad.status_code == 409

        resume = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/resume",
            json={"note": "Corrigido", "actor": "CEO local"},
        )
        assert resume.status_code == 200, resume.text
        body2 = resume.json()
        assert body2["status"] == "running"
        req = next(s for s in body2["stages"] if s["stage_def_id"] == "requirements")
        assert req["status"] == "running"
        assert any(e["action"] == "resumed" for e in body2["ledger"])
        assert not any(p["kind"] == "error" for p in body2.get("pendencies") or [])

        done = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/requirements/complete",
            json={"artifact_hash": "req-apos-resume"},
        )
        assert done.status_code == 200, done.text


@pytest.mark.asyncio
async def test_b3_soft_pause_and_run_resume():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B3 Pause LP",
                "company": "TAVIR",
                "ownership": "externo",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201
        proj_id = create.json()["id"]

        pause = await client.post(
            f"/api/v1/factory/projects/{proj_id}/run/pause",
            json={"note": "Almoço"},
        )
        assert pause.status_code == 200, pause.text
        assert pause.json()["status"] == "paused"
        assert any(e["action"] == "paused" for e in pause.json()["ledger"])

        # gate ainda autorizável enquanto pausado (soft)
        auth = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={},
        )
        assert auth.status_code == 200, auth.text

        # pausa de novo na etapa running
        pause2 = await client.post(f"/api/v1/factory/projects/{proj_id}/run/pause", json={})
        assert pause2.status_code == 200
        assert pause2.json()["status"] == "paused"

        resume = await client.post(
            f"/api/v1/factory/projects/{proj_id}/run/resume",
            json={},
        )
        assert resume.status_code == 200, resume.text
        assert resume.json()["status"] == "running"
        assert any(e["action"] == "resumed" for e in resume.json()["ledger"])
