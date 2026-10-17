"""Factory API router — engineering templates and factory projects CRUD."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.factory.repository import TemplateRepository
from app.models.template import EngineeringTemplate
from app.models.project import Project

router = APIRouter(prefix="/api/v1/factory", tags=["factory"])


class TemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    mode: str
    description: str | None = None
    stages: Any | None = None
    mesas: Any | None = None
    owner_role: str | None = None
    default_commands: Any | None = None
    gate_required: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateTemplateRequest(BaseModel):
    id: str | None = None
    name: str
    category: str
    mode: str
    description: str | None = None
    stages: Any | None = None
    mesas: Any | None = None
    owner_role: str | None = None
    default_commands: Any | None = None
    gate_required: bool = False
    sort_order: int = 0


class FactoryProjectResponse(BaseModel):
    id: str
    slug: str
    name: str
    client: str | None = None
    company: str | None = None
    template_code: str | None = None
    stages_done: int
    total_stages: int
    status: str
    repo_url: str | None = None
    deploy_target: str | None = None
    stack: str | None = None
    goal: str | None = None
    audience: str | None = None
    scope_items: Any | None = None
    pendencies: Any | None = None
    kanban_cards: Any | None = None
    files: Any | None = None
    keys: Any | None = None
    event_log: Any | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateFactoryProjectRequest(BaseModel):
    name: str
    company: str
    template_code: str
    total_stages: int = 16
    stack: str | None = None
    goal: str | None = None
    audience: str | None = None
    scope_items: list[str] | None = None
    repo_url: str | None = None
    deploy_target: str | None = None


class UpdateStageRequest(BaseModel):
    stages_done: int


class ResolvePendencyRequest(BaseModel):
    pendency_id: str
    note: str | None = None


# --- Templates ---

@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    return await repo.list_all()


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    template = await repo.get_by_code(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return template


@router.post("/templates", response_model=TemplateResponse, status_code=201)
async def create_template(req: CreateTemplateRequest, session: AsyncSession = Depends(get_session)):
    template = EngineeringTemplate(
        id=req.id or str(uuid.uuid4()),
        name=req.name,
        category=req.category,
        mode=req.mode,
        description=req.description,
        stages=req.stages,
        mesas=req.mesas,
        owner_role=req.owner_role,
        default_commands=req.default_commands,
        gate_required=req.gate_required,
        sort_order=req.sort_order,
    )
    repo = TemplateRepository(session)
    created = await repo.create(template)
    await session.commit()
    await session.refresh(created)
    return created


# --- Factory Projects ---

@router.get("/projects", response_model=list[FactoryProjectResponse])
async def list_factory_projects(session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    return await repo.list_factory_projects()


@router.get("/projects/{project_id}", response_model=FactoryProjectResponse)
async def get_factory_project(project_id: str, session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return proj


@router.post("/projects", response_model=FactoryProjectResponse, status_code=201)
async def create_factory_project(req: CreateFactoryProjectRequest, session: AsyncSession = Depends(get_session)):
    slug = req.name.lower().replace(" ", "-") + f"-{str(uuid.uuid4())[:6]}"
    proj = Project(
        id=f"fp-{str(uuid.uuid4())[:8]}",
        slug=slug,
        name=req.name,
        client=req.company,
        company=req.company,
        template_code=req.template_code,
        stages_done=0,
        total_stages=req.total_stages,
        stack=req.stack,
        goal=req.goal,
        audience=req.audience,
        scope_items=req.scope_items or [],
        pendencies=[],
        kanban_cards=[],
        files=[],
        keys={},
        event_log=[[datetime.now().strftime("%d/%m %H:%M"), "Operação", "Projeto criado na Fábrica"]],
        status="running",
    )
    repo = TemplateRepository(session)
    created = await repo.create_factory_project(proj)
    await session.commit()
    await session.refresh(created)
    return created


@router.patch("/projects/{project_id}/stage", response_model=FactoryProjectResponse)
async def update_project_stage(
    project_id: str,
    req: UpdateStageRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TemplateRepository(session)
    updated = await repo.update_project_stage(project_id, req.stages_done)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/projects/{project_id}/resolve-pendency", response_model=FactoryProjectResponse)
async def resolve_project_pendency(
    project_id: str,
    req: ResolvePendencyRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TemplateRepository(session)
    updated = await repo.resolve_project_pendency(project_id, req.pendency_id, req.note)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated