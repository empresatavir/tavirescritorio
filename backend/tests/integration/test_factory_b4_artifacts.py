"""B4 — list/read/write artifacts no workspace."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_b4_write_list_read_artifact():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B4 Artefatos Maça",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        body = create.json()
        proj_id = body["id"]
        assert "maca" in (body.get("slug") or "") or "maca" in (body.get("local_path") or "").lower()

        put = await client.put(
            f"/api/v1/factory/projects/{proj_id}/artifacts",
            json={
                "path": "brief.md",
                "content": "# Brief\n\nDemanda B4.\n",
                "overwrite": True,
            },
        )
        assert put.status_code == 200, put.text
        written = put.json()["file"]
        assert written["path"] == "brief.md"
        assert written["sha256"]
        assert put.json().get("ledger")

        listed = await client.get(f"/api/v1/factory/projects/{proj_id}/artifacts")
        assert listed.status_code == 200
        files = listed.json()["files"]
        assert any(f["path"] == "brief.md" for f in files)
        expected = listed.json().get("expected") or []
        assert any(e["path"] == "brief.md" and e["present"] for e in expected)

        read = await client.get(
            f"/api/v1/factory/projects/{proj_id}/artifacts/content",
            params={"path": "brief.md"},
        )
        assert read.status_code == 200
        assert "Demanda B4" in (read.json().get("content") or "")

        bad = await client.get(
            f"/api/v1/factory/projects/{proj_id}/artifacts/content",
            params={"path": "../secret.txt"},
        )
        assert bad.status_code == 400
