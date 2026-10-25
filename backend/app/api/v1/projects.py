"""Projects API router — read and write endpoints for projects."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_session
from app.models.project import Project
from app.modules.projects.repository import ProjectRepository
from app.modules.factory.workspace_roots import materialize_project_workspace, slugify_project_name
from app.modules.factory.esteiras import resolve_template_code, get_esteira
from app.modules.factory.run_service import materialize_run_for_project
from app.api.v1.schemas import ProjectResponse

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str
    company: str | None = None
    ownership: str  # "interno" | "externo" — define raiz do workspace em disco
    stack_frontend: str | None = None
    stack_backend: str | None = None
    stack_database: str | None = None
    track: str = "zero"  # "zero" (Dora / ideação) | "pronto" (escopo fechado)
    context_files: list[str] = []
    design_system_file: str | None = None  # legado: um arquivo
    design_system_files: list[str] = []  # preferido: múltiplos arquivos de DS
    template_category: str | None = None  # lp | of | sy


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_session)):
    repo = ProjectRepository(session)
    projects = await repo.list_all()
    return projects


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(req: CreateProjectRequest, session: AsyncSession = Depends(get_session)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Nome do projeto é obrigatório")

    ownership = (req.ownership or "").strip().lower()
    if ownership not in ("interno", "externo"):
        raise HTTPException(
            status_code=400,
            detail="ownership é obrigatório e deve ser 'interno' ou 'externo'",
        )

    track = (req.track or "zero").strip().lower()
    if track not in ("zero", "pronto", "especificado", "manutencao"):
        raise HTTPException(
            status_code=400,
            detail="track deve ser 'zero', 'especificado', 'manutencao' ou 'pronto'",
        )

    if track in ("pronto", "especificado", "manutencao") and not req.context_files:
        raise HTTPException(
            status_code=400,
            detail="Esta entrada exige ao menos um arquivo em context_files.",
        )

    ds_files = list(req.design_system_files or [])
    if req.design_system_file and req.design_system_file not in ds_files:
        ds_files.append(req.design_system_file)

    slug_base = slugify_project_name(req.name)
    project_id = str(uuid.uuid4())
    slug = f"{slug_base}-{project_id[:6]}"

    try:
        workspace = materialize_project_workspace(ownership, slug)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao criar workspace em disco: {exc}",
        ) from exc

    stack_parts = []
    if req.stack_frontend:
        stack_parts.append(f"FE: {req.stack_frontend.strip()}")
    if req.stack_backend:
        stack_parts.append(f"BE: {req.stack_backend.strip()}")
    if req.stack_database:
        stack_parts.append(f"DB: {req.stack_database.strip()}")
    stack_str = " · ".join(stack_parts) if stack_parts else None

    template_code = resolve_template_code(req.template_category, track)
    esteira = get_esteira(template_code)
    total_stages = esteira["total_stages"] if esteira else (10 if track == "zero" else 8)

    files_dict = {
        "context_files": req.context_files,
        "design_system": ds_files,
        "design_system_files": ds_files,
        "track": track,
        "ownership": ownership,
        "workspace_root": ownership,
        "template_category": req.template_category,
        "template_code": template_code,
        "ideation_mode": {
            "zero": "long_interview",
            "especificado": "specified_creation",
            "manutencao": "maintenance_read",
        }.get(track, "closed_scope_no_invent"),
    }

    project = Project(
        id=project_id,
        slug=slug,
        name=req.name.strip(),
        company=req.company.strip() if req.company else None,
        client=req.company.strip() if req.company else None,
        stack=stack_str,
        template_code=template_code,
        local_path=str(workspace),
        files=files_dict,
        status="running",
        stages_done=0,
        total_stages=total_stages,
        description=(
            f"Escopo: {ownership} · Esteira: {template_code} · "
            + (
                "Projeto do Zero"
                if track == "zero"
                else "Escopo Fechado (manutenção)"
            )
        ),
    )
    session.add(project)
    await session.flush()

    try:
        run = await materialize_run_for_project(session, project, template_code=template_code)
        files_dict = dict(files_dict)
        files_dict["run_id"] = run.id
        project.files = files_dict
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await session.commit()
    await session.refresh(project)
    return project


@router.post("/{project_id}/intake")
async def read_project_scope(project_id: str, session: AsyncSession = Depends(get_session)):
    """A Dora lê os arquivos já gravados e grava o contrato da esteira."""
    from app.modules.factory.intake import read_uploaded_scope

    repo = ProjectRepository(session)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    result = await read_uploaded_scope(session, project)
    await session.commit()
    return result