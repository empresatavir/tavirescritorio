"""Phase 5 Exit Validation Tests:
- Modal Decoupling & Project Creation Engine:
  1. POST /api/v1/projects/ with 3 separate stack inputs: FE, BE, DB (never grouped).
  2. Track selector verification: "zero" -> template_code="ideacao-dora" (total_stages=6)
     vs "pronto" -> template_code="execucao-direta" (total_stages=4).
  3. Context files array and design system file persistence.
  4. GET /api/v1/projects/ list returns newly created projects.
  5. Decoupled task creation (simple task without AI parameters) and execution linking.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_phase5_create_project_track_zero_with_three_stack_inputs():
    """Verify project creation with track 'zero' (Dora Ideation), 3 separate stack inputs, and context files."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "App Provinha Infantil",
            "company": "Meridian Brands",
            "stack_frontend": "Solid.js + Tailwind v4",
            "stack_backend": "FastAPI + Python 3.12",
            "stack_database": "SQLite WAL + Supabase",
            "track": "zero",
            "context_files": ["briefing.md", "personas.json", "wireframes.html"],
            "design_system_file": "brand_tokens.json",
        }
        res = await client.post("/api/v1/projects/", json=payload)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data = res.json()

        assert data["name"] == "App Provinha Infantil"
        assert data["company"] == "Meridian Brands"
        assert data["template_code"] == "ideacao-dora"
        assert data["total_stages"] == 6
        assert data["stages_done"] == 0

        # Verify stack format contains all 3 distinct components
        stack_str = data["stack"]
        assert "FE: Solid.js + Tailwind v4" in stack_str
        assert "BE: FastAPI + Python 3.12" in stack_str
        assert "DB: SQLite WAL + Supabase" in stack_str

        # Verify context files and design system (lista; legado aceito como item único)
        files = data.get("files") or {}
        assert "briefing.md" in files.get("context_files", [])
        ds = files.get("design_system_files") or files.get("design_system") or []
        if isinstance(ds, str):
            ds = [ds]
        assert "brand_tokens.json" in ds
        assert files.get("track") == "zero"
        assert files.get("ideation_mode") == "long_interview"


@pytest.mark.asyncio
async def test_phase5_create_project_track_pronto_execution():
    """Verify project creation with track 'pronto' (Direct Technical Execution) with 4 stages."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Refatoracao Escritorio Core",
            "company": "TAVIR Interno",
            "stack_frontend": "React 19 / Vite",
            "stack_backend": "Go 1.22",
            "stack_database": "PostgreSQL 16",
            "track": "pronto",
            "context_files": ["architecture.md"],
            "design_system_files": ["tavir-ds.css", "tokens.json"],
        }
        res = await client.post("/api/v1/projects/", json=payload)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data = res.json()

        assert data["name"] == "Refatoracao Escritorio Core"
        assert data["template_code"] == "execucao-direta"
        assert data["total_stages"] == 4
        assert "FE: React 19 / Vite" in data["stack"]
        assert "BE: Go 1.22" in data["stack"]
        assert "DB: PostgreSQL 16" in data["stack"]
        files = data.get("files") or {}
        assert files.get("ideation_mode") == "closed_scope_no_invent"
        assert "tavir-ds.css" in (files.get("design_system_files") or [])
        assert "tokens.json" in (files.get("design_system_files") or [])

        # Escopo fechado sem documento deve falhar
        bad = await client.post(
            "/api/v1/projects/",
            json={"name": "Sem Escopo", "track": "pronto", "context_files": []},
        )
        assert bad.status_code == 400

        # Check list endpoint
        list_res = await client.get("/api/v1/projects/")
        assert list_res.status_code == 200
        projects_list = list_res.json()
        assert any(p["id"] == data["id"] for p in projects_list)


@pytest.mark.asyncio
async def test_phase5_decoupled_task_and_job_execution_linking():
    """Verify decoupled simple task creation and job linking back to task."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a simple task (5 fields without AI parameters)
        task_payload = {
            "title": "Auditoria de UI e Design System Tokens",
            "description": "Verificação de contraste e tokens híbridos",
            "priority": "high",
            "sector": "Design",
        }
        task_res = await client.post("/api/v1/tasks/", json=task_payload)
        assert task_res.status_code in (200, 201)
        task_data = task_res.json()
        task_id = task_data["id"]

        # 2. Start a planning/execution job linked to this task
        job_payload = {
            "task_id": task_id,
            "command": "echo 'Planejamento via Fable e Paula PM'",
            "model_name": "Fable",
            "effort": "max",
        }
        job_res = await client.post("/api/v1/jobs/", json=job_payload)
        assert job_res.status_code == 201
        job_data = job_res.json()
        assert job_data["task_id"] == task_id
        assert job_data["model_name"] == "Fable"
        assert job_data["effort"] == "max"
