"""QA reprovada devolve a esteira para a implementação e abre uma issue."""

import pytest
from httpx import ASGITransport, AsyncClient
from pathlib import Path

from app.main import app


async def _walk_to_qa(client: AsyncClient, project_id: str, local_path: str):
    await client.post(f"/api/v1/factory/projects/{project_id}/stages/brief/authorize", json={})
    for stage_id in ("requirements", "architecture", "paula_plan"):
        done = await client.post(
            f"/api/v1/factory/projects/{project_id}/stages/{stage_id}/complete",
            json={"artifact_hash": stage_id},
        )
        assert done.status_code == 200, done.text
    await client.post(f"/api/v1/factory/projects/{project_id}/stages/plan_gate/authorize", json={})
    proof = await client.post(
        f"/api/v1/factory/projects/{project_id}/stages/visual_proof/complete",
        json={"artifact_hash": "proof"},
    )
    assert proof.status_code == 200, proof.text
    await client.post(f"/api/v1/factory/projects/{project_id}/stages/visual_gate/authorize", json={})
    evidence = Path(local_path) / "qa" / "evidence" / "build.log"
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(
        "fase teste: falhou\ncodigo_saida: 1\n---\nfalhou\n\n"
        "fase codigo: passou\ncodigo_saida: 0\n---\nok\n",
        encoding="utf-8",
    )
    build = await client.post(
        f"/api/v1/factory/projects/{project_id}/stages/build/complete",
        json={"artifact_hash": "build"},
    )
    assert build.status_code == 200, build.text
    assert build.json()["current_stage_id"] == "qa"


@pytest.mark.asyncio
async def test_qa_rejection_opens_issue_and_returns_to_build():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "QA Loop LP",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        project_id = create.json()["id"]
        await _walk_to_qa(client, project_id, create.json()["local_path"])

        rejected = await client.post(
            f"/api/v1/factory/projects/{project_id}/stages/qa/complete",
            json={"artifact_hash": "qa-reprovado"},
        )
        assert rejected.status_code == 200, rejected.text
        body = rejected.json()
        assert body["current_stage_id"] == "build"
        assert body["quality_loop"] == "rework"
        qa = next(stage for stage in body["stages"] if stage["stage_def_id"] == "qa")
        assert qa["status"] == "queued"
        assert any(entry["action"] == "rework" for entry in body["ledger"])
        assert (body.get("issue") or "").endswith("QA-001.md")
