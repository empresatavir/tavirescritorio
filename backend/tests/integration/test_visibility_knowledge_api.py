"""Integration tests for Visibility, Knowledge, Workflows, Doctor and Analytics APIs (Goal G8 / Fase 5)."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_workflows_api_canonical_six():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/workflows")
        assert resp.status_code == 200
        workflows = resp.json()
        assert len(workflows) == 6
        # Verify first is Onboarding and sort_order is sequential
        assert workflows[0]["name"] == "Onboarding de Novo Cliente & Setup de Projeto"
        assert workflows[0]["sort_order"] == 1
        assert len(workflows[0]["steps"]) >= 4

        # Verify detail by ID
        wf_id = workflows[0]["id"]
        detail_resp = await client.get(f"/api/v1/workflows/{wf_id}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["id"] == wf_id


@pytest.mark.asyncio
async def test_knowledge_api_search_and_detail():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. General list
        resp = await client.get("/api/v1/knowledge?limit=10")
        assert resp.status_code == 200
        entries = resp.json()
        assert len(entries) >= 5

        first_id = entries[0]["id"]

        # 2. Search for existing keyword
        search_resp = await client.get("/api/v1/knowledge?q=ancoragem")
        assert search_resp.status_code == 200
        search_results = search_resp.json()
        assert len(search_results) >= 1
        assert any("ancoragem" in e["title"].lower() for e in search_results)

        # 3. Get entry detail
        detail_resp = await client.get(f"/api/v1/knowledge/{first_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["id"] == first_id
        assert "title" in detail
        assert "content" in detail
        assert "extra_metadata" in detail


@pytest.mark.asyncio
async def test_ideas_api_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create new idea
        create_resp = await client.post(
            "/api/v1/ideas",
            json={
                "title": "Nova Ideia de Integração Teste",
                "description": "Ideia para validar teste de integração da API",
                "source": "Captura rápida Cérebro",
                "priority": "high",
            },
        )
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["title"] == "Nova Ideia de Integração Teste"
        idea_id = created["id"]

        # 2. List ideas and verify presence
        list_resp = await client.get("/api/v1/ideas")
        assert list_resp.status_code == 200
        ideas = list_resp.json()
        assert any(i["id"] == idea_id for i in ideas)


@pytest.mark.asyncio
async def test_integrations_health_check_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List integrations
        list_resp = await client.get("/api/v1/integrations")
        assert list_resp.status_code == 200
        checks = list_resp.json()
        assert len(checks) >= 5

        # 2. Trigger active health checks
        check_resp = await client.post("/api/v1/integrations/check")
        assert check_resp.status_code == 200
        data = check_resp.json()
        assert "results" in data
        assert len(data["results"]) >= 5
        # Verify SQLite check was successful
        sqlite_check = next((c for c in data["results"] if "sqlite" in c["name"].lower()), None)
        assert sqlite_check is not None
        assert sqlite_check["status"] == "healthy"


@pytest.mark.asyncio
async def test_doctor_checks_dimensions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/doctor/checks")
        assert resp.status_code == 200
        data = resp.json()
        assert "overall_score" in data
        assert data["overall_score"] >= 80
        assert data["status"] in ("healthy", "warning")
        assert len(data["dimensions"]) == 6

        dims = {d["dimension"] for d in data["dimensions"]}
        assert dims == {
            "Engenharia",
            "Conhecimento",
            "Comercial",
            "Marketing & Studio",
            "Governança & QA",
            "Fábrica & Templates",
        }


@pytest.mark.asyncio
async def test_analytics_summary_and_reconciliation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/analytics/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_cost_usd"] > 0
        assert len(data["cost_by_model"]) == 4
        assert len(data["cost_trend"]) == 14
        assert "reconciliation" in data
        assert data["reconciliation"]["total_revenue_invoiced_brl"] > 0


@pytest.mark.asyncio
async def test_skills_catalog_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/skills")
        assert resp.status_code == 200
        skills = resp.json()
        assert len(skills) >= 5
        assert all("name" in s and "agents" in s for s in skills)
