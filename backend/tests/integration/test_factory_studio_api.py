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
                "ownership": "externo",
                "template_code": "sy-c",
                "total_stages": 13,
                "stack": "Next.js + FastAPI",
                "scope_items": ["Autenticação", "Catálogo"],
            }
        )
        assert create_resp.status_code == 201
        created_p = create_resp.json()
        assert created_p["name"] == "Novo Portal B2B"
        assert created_p["template_code"] == "sy-c"
        assert created_p["total_stages"] == 13
        assert created_p.get("local_path")
        run_resp = await client.get(f"/api/v1/factory/projects/{created_p['id']}/run")
        assert run_resp.status_code == 200
        body = run_resp.json()
        assert len(body["stages"]) == 13
        agents = {stage["stage_def_id"]: stage["agent"] for stage in body["stages"]}
        assert agents["build_be"] == "Diego Sistemas"
        assert agents["build_fe"] == "Dev Frontend"
        assert agents["qa_be"] == "Tester Automatizado"
        assert agents["qa_fe"] == "Validador Visual"


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
        assert "Carlos Junior" in names
        assert "IA na Prática" in names
        carlos = next(p for p in profiles if p["id"] == "pf-carlos")
        assert carlos.get("handle") == "@carlosjunior"
        assert carlos.get("design_system")
        assert carlos.get("cycle_goal") == 24

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
                "tags": "#ia #tavir",
                "cta": "Salve este post",
                "slides": ["Slide 1", "Slide 2"],
            }
        )
        assert content_resp.status_code == 200
        body = content_resp.json()
        assert body["title"] == "Título Atualizado via API"
        assert body.get("cta") == "Salve este post"
        assert body.get("slides") == ["Slide 1", "Slide 2"]

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

        # 6. Oracle run (fallback sem GHOSTCLI_API_KEY)
        oracle_resp = await client.post(
            "/api/v1/studio/profiles/pf-carlos/oracle/runs",
            json={"net": "ig", "start_point_id": "autonoma"},
        )
        assert oracle_resp.status_code == 201
        decision = oracle_resp.json()
        assert decision["kind"] == "pauta"
        assert decision["status"] == "pending"
        assert len(decision["options"]) == 3
        assert decision["options"][0]["id"]

        # 7. Select option → visual squad produces package + revisao
        opt_id = decision["options"][1]["id"]
        select_resp = await client.post(
            f"/api/v1/studio/decisions/{decision['id']}/select",
            json={"option_id": opt_id, "squad_id": "ig-studio"},
        )
        assert select_resp.status_code == 200
        selected = select_resp.json()
        assert selected["status"] == "resolved"
        assert selected["selected_option_id"] == opt_id
        assert selected["piece_id"]

        piece_after = await client.get(f"/api/v1/studio/pieces/{selected['piece_id']}")
        assert piece_after.status_code == 200
        pkg = piece_after.json()
        assert pkg["stage"] == "review"
        assert pkg.get("slides") and len(pkg["slides"]) >= 5
        assert pkg.get("caption")
        assert pkg.get("cta")

        pending_after_select = await client.get(
            "/api/v1/studio/decisions?profile_id=pf-carlos&status=pending"
        )
        assert pending_after_select.status_code == 200
        reviews = [d for d in pending_after_select.json() if d["kind"] == "revisao"]
        assert any(d.get("piece_id") == selected["piece_id"] for d in reviews)

        # 7b. Re-produce (ajuste fino)
        produce_resp = await client.post(
            f"/api/v1/studio/pieces/{selected['piece_id']}/produce",
            json={"squad_id": "ig-studio", "guidance": "gancho mais curto"},
        )
        assert produce_resp.status_code == 200
        assert produce_resp.json()["stage"] == "review"

        # 8. Create production with oracle
        prod_resp = await client.post(
            "/api/v1/studio/productions",
            json={
                "profile_id": "pf-carlos",
                "platform": "li",
                "squad_id": "oraculo",
                "start_point_id": "manual",
                "theme": "Ritual de abertura de sprint",
            },
        )
        assert prod_resp.status_code == 201
        prod = prod_resp.json()
        assert prod["piece"]["profile_id"] == "pf-carlos"
        assert prod["decision"] is not None
        assert len(prod["decision"]["options"]) == 3
        assert prod["decision"].get("piece_id") == prod["piece"]["id"]

        # 8b. Direct visual squad (YT) skips oracle and opens review
        yt_prod = await client.post(
            "/api/v1/studio/productions",
            json={
                "profile_id": "pf-carlos",
                "platform": "yt",
                "squad_id": "yt-roteirista",
                "start_point_id": "manual",
                "theme": "Ritual de abertura no YouTube",
            },
        )
        assert yt_prod.status_code == 201
        yt_body = yt_prod.json()
        assert yt_body["piece"]["stage"] == "review"
        assert yt_body["piece"].get("script")
        assert yt_body["decision"] is not None
        assert yt_body["decision"]["kind"] == "revisao"

        # 8c. Ads squad
        ads_prod = await client.post(
            "/api/v1/studio/productions",
            json={
                "profile_id": "pf-carlos",
                "platform": "ig",
                "squad_id": "ads",
                "start_point_id": "manual",
                "theme": "Campanha ritual semanal",
            },
        )
        assert ads_prod.status_code == 201
        assert ads_prod.json()["piece"]["stage"] == "review"
        assert len(ads_prod.json()["piece"].get("slides") or []) == 3

        # 9. Pending decisions list
        dec_list = await client.get("/api/v1/studio/decisions?profile_id=pf-carlos&status=pending")
        assert dec_list.status_code == 200
        assert isinstance(dec_list.json(), list)
