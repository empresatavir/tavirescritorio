"""B0 — esteiras canônicas, materialização de run e ownership."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.modules.factory.esteiras import ESTEIRAS, resolve_template_code


@pytest.mark.asyncio
async def test_esteira_definitions_counts():
    assert len(ESTEIRAS["lp-c"]["stages"]) == 12
    assert len(ESTEIRAS["lp-m"]["stages"]) == 8
    assert len(ESTEIRAS["of-c"]["stages"]) == 12
    assert len(ESTEIRAS["sy-c"]["stages"]) == 15
    assert len(ESTEIRAS["sy-m"]["stages"]) == 12
    sy_m = {s["id"]: s for s in ESTEIRAS["sy-m"]["stages"]}
    assert sy_m["m_code_be"]["agent"] == "Diego Sistemas"
    assert sy_m["m_code_fe"]["agent"] == "Dev Frontend"
    assert sy_m["m_qa_be"]["agent"] == "Tester Automatizado"
    assert sy_m["m_qa_fe"]["agent"] == "Validador Visual"
    assert sy_m["m_qa_jornada"]["agent"] == "Validador Visual"
    assert sy_m["m_apk"]["agent"] == "Dev Frontend"
    sy_c = {s["id"]: s for s in ESTEIRAS["sy-c"]["stages"]}
    assert sy_c["build_be"]["agent"] == "Diego Sistemas"
    assert sy_c["build_fe"]["agent"] == "Dev Frontend"
    assert sy_c["qa_be"]["agent"] == "Tester Automatizado"
    assert sy_c["qa_fe"]["agent"] == "Validador Visual"
    assert sy_c["qa_jornada"]["agent"] == "Validador Visual"
    assert sy_c["build_apk"]["agent"] == "Dev Frontend"
    assert ESTEIRAS["lp-c"]["stages"][7]["agent"] == "Dev Frontend"
    # Ordem canônica: Dora → Marina/Yuri → Ari → Paula → plan_gate
    ids = [s["id"] for s in ESTEIRAS["lp-c"]["stages"][:5]]
    assert ids == ["brief", "requirements", "architecture", "paula_plan", "plan_gate"]
    assert ESTEIRAS["lp-c"]["stages"][3]["agent"] == "Paula PM"
    assert resolve_template_code("lp", "zero") == "lp-c"
    assert resolve_template_code("lp", "pronto") == "lp-m"
    assert resolve_template_code("sy", "zero") == "sy-c"
    assert resolve_template_code("sy", "especificado") == "sy-c"
    assert resolve_template_code("sy", "manutencao") == "sy-m"
    assert resolve_template_code("of", "especificado") == "of-c"


@pytest.mark.asyncio
async def test_create_project_materializes_run_and_workspace():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Garante templates no DB de teste / real
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded neste ambiente")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B0 Smoke LP Interno",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj = create.json()
        assert proj["template_code"] == "lp-c"
        assert proj["total_stages"] == 12
        assert proj["local_path"]
        assert "tavir-interno" in proj["local_path"].replace("/", "\\")

        run_resp = await client.get(f"/api/v1/factory/projects/{proj['id']}/run")
        assert run_resp.status_code == 200, run_resp.text
        run = run_resp.json()
        assert run["template_code"] == "lp-c"
        assert len(run["stages"]) == 12
        assert run["current_stage_id"] == "brief"
        assert run["meta"].get("model") == "claude-opus-5-5"
        assert run["meta"].get("effort") == "xhigh"
        first = run["stages"][0]
        assert first["stage_def_id"] == "brief"
        assert first["is_gate"] is True
        assert first["status"] == "awaiting_gate"
        assert run["stages"][1]["status"] == "queued"


@pytest.mark.asyncio
async def test_factory_templates_structured_stages():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/factory/templates/lp-c")
        if resp.status_code != 200:
            pytest.skip("templates não seeded")
        tpl = resp.json()
        assert len(tpl["stages"]) >= 10
        assert len(tpl["mesas"]) >= 5
        # B0: stages são dicts com id
        first = tpl["stages"][0]
        assert isinstance(first, dict)
        assert first["id"] == "brief"
        assert first["gate"] is True
