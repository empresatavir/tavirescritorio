"""Integration tests for Factory and Studio REST API."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_factory_api_templates_and_projects():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List templates
        resp = await client.get("/api/v1/factory/templates")
        assert resp.status_code == 200
        templates = resp.json()
        assert len(templates) >= 6

        codes = {t["id"] for t in templates}
        assert "lp-c" in codes
        assert "sy-c" in codes
        assert "of-c" in codes

        # 2. Get specific template
        tpl_resp = await client.get("/api/v1/factory/templates/lp-c")
        assert tpl_resp.status_code == 200
        tpl = tpl_resp.json()
        assert tpl["category"] == "lp"
        assert len(tpl["stages"]) >= 10
        assert len(tpl["mesas"]) >= 5

        # 3. List factory projects
        p_resp = await client.get("/api/v1/factory/projects")
        assert p_resp.status_code == 200
        projects = p_resp.json()
        assert len(projects) >= 3

        fp1 = next((p for p in projects if p["id"] == "fp-1"), projects[0])
        fp1_id = fp1["id"]

        # 4. Update stage
        stage_resp = await client.patch(
            f"/api/v1/factory/projects/{fp1_id}/stage",
            json={"stages_done": 5}
        )
        assert stage_resp.status_code == 200
        assert stage_resp.json()["stages_done"] == 5

        # 5. Create new factory project
        create_resp = await client.post(
            "/api/v1/factory/projects",
            json={
                "name": "Novo Portal B2B",
                "company": "Cliente Alfa",
                "template_code": "sy-c",
                "total_stages": 10,
                "stack": "Next.js + FastAPI",
                "scope_items": ["Autenticação", "Catálogo"],
            }
        )
        assert create_resp.status_code == 201
        created_p = create_resp.json()
        assert created_p["name"] == "Novo Portal B2B"
        assert created_p["template_code"] == "sy-c"


@pytest.mark.asyncio
async def test_studio_api_profiles_and_pieces():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List profiles
        resp = await client.get("/api/v1/studio/profiles")
        assert resp.status_code == 200
        profiles = resp.json()
        assert len(profiles) >= 3

        names = {p["name"] for p in profiles}
        assert "Datavir" in names
        assert "Canal IA na Prática" in names
        assert "TAVIR" in names

        # 2. List pieces
        pieces_resp = await client.get("/api/v1/studio/pieces")
        assert pieces_resp.status_code == 200
        pieces = pieces_resp.json()
        assert len(pieces) >= 6

        p0 = pieces[0]
        p0_id = p0["id"]

        # 3. Move stage
        move_resp = await client.patch(
            f"/api/v1/studio/pieces/{p0_id}/stage",
            json={"stage": "pub"}
        )
        assert move_resp.status_code == 200
        assert move_resp.json()["stage"] == "pub"

        # 4. Update content
        content_resp = await client.patch(
            f"/api/v1/studio/pieces/{p0_id}",
            json={
                "title": "Título Atualizado via API",
                "script": "Script atualizado",
                "caption": "Legenda atualizada",
                "tags": "#ia #tavir"
            }
        )
        assert content_resp.status_code == 200
        assert content_resp.json()["title"] == "Título Atualizado via API"

        # 5. Create piece
        create_resp = await client.post(
            "/api/v1/studio/pieces",
            json={
                "profile_id": "pf-datavir",
                "title": "Nova peça de conteúdo sobre dashboards",
                "net": "li",
                "stage": "idea",
                "caption": "Você ainda perde tempo com planilhas?",
            }
        )
        assert create_resp.status_code == 201
        new_piece = create_resp.json()
        assert new_piece["num"].startswith("ST-")
        assert new_piece["title"] == "Nova peça de conteúdo sobre dashboards"
