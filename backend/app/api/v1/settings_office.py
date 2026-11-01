"""Configurações do escritório: perfil, projetos, memória e parada da esteira."""
from __future__ import annotations

import uuid
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.office_settings import OfficeSettings
from app.models.project import Project
from app.modules.auth.clock import now
from app.modules.factory.memory_store import MemoryError, approve, list_drawer, reject
from app.modules.factory.project_control import (
    ControlError,
    ensure_layout,
    normalize_control,
    validate_control,
    write_bases_file,
)
from app.modules.factory.workspace_roots import materialize_project_workspace, slugify_project_name
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])
OFFICE_ID = "office"
DEFAULT_OVERVIEW = {
    "fabrica": True,
    "aprovacoes": True,
    "prazos": True,
    "ordem": ["jobs", "escalados", "cards", "precisa"],
}
_SALA_BLOCKS = ("jobs", "escalados", "cards", "precisa")
_IDIOMAS = {"pt", "en"}
_SAO_PAULO = timezone(timedelta(hours=-3))


class ProfileBody(BaseModel):
    nome: str = ""
    email: str = ""
    idioma: str = "pt"


class OverviewBody(BaseModel):
    fabrica: bool = True
    aprovacoes: bool = True
    prazos: bool = True
    ordem: list[str] = ["jobs", "escalados", "cards", "precisa"]


class ControlBody(BaseModel):
    active: bool = True
    watch: bool = False
    automation: dict = {}
    auto_types: list[str] = []
    refino_destino: str = "dossie"
    secoes_excluidas: list[int] = []
    build_command: str = ""
    build_artifact: str = ""
    slas: list[dict] = []
    bases: list[str] = []


class FocusBody(BaseModel):
    project_id: str | None = None
    demand_id: str | None = None


class MemoryBody(BaseModel):
    name: str


def _ordem(value: object) -> list[str]:
    seen: list[str] = []
    if isinstance(value, list):
        for item in value:
            if item in _SALA_BLOCKS and item not in seen:
                seen.append(item)
    for item in _SALA_BLOCKS:
        if item not in seen:
            seen.append(item)
    return seen


def _overview(raw: object) -> dict:
    base = raw if isinstance(raw, dict) else {}
    return {
        "fabrica": bool(base.get("fabrica", True)),
        "aprovacoes": bool(base.get("aprovacoes", True)),
        "prazos": bool(base.get("prazos", True)),
        "ordem": _ordem(base.get("ordem")),
    }


def office_moment() -> datetime:
    if os.environ.get("TAVIR_VISUAL_FIXTURE") == "1":
        return datetime.fromisoformat("2026-10-29T15:00:00-03:00")
    return now()


def office_greeting(moment: datetime, idioma: str, nome: str) -> str:
    stamp = moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
    hour = stamp.astimezone(_SAO_PAULO).hour
    who = (nome or "").strip() or "Carlos"
    if idioma == "en":
        period = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"
    else:
        period = "Bom dia" if hour < 12 else "Boa tarde" if hour < 18 else "Boa noite"
    return f"{period}, {who}."


async def _office(session: AsyncSession) -> OfficeSettings:
    row = await session.get(OfficeSettings, OFFICE_ID)
    if row is None:
        row = OfficeSettings(id=OFFICE_ID, perfil_nome="", perfil_email="", overview=dict(DEFAULT_OVERVIEW))
        session.add(row)
        await session.flush()
    if not isinstance(row.overview, dict):
        row.overview = dict(DEFAULT_OVERVIEW)
    return row


def _project_dump(project: Project, focused_id: str | None) -> dict:
    control = normalize_control(project.control)
    return {
        "id": project.id,
        "slug": project.slug,
        "name": project.name,
        "client": project.client,
        "template_code": project.template_code,
        "local_path": project.local_path,
        "status": project.status,
        "focused": project.id == focused_id,
        "control": control,
    }


@router.get("")
async def get_settings(session: AsyncSession = Depends(get_session)):
    office = await _office(session)
    projects = (await session.execute(select(Project).order_by(Project.name.asc()))).scalars().all()
    await session.commit()
    return {
        "perfil": {
            "nome": office.perfil_nome,
            "email": office.perfil_email,
            "idioma": office.perfil_idioma or "pt",
        },
        "greeting": office_greeting(office_moment(), office.perfil_idioma or "pt", office.perfil_nome),
        "as_of": office_moment().isoformat(),
        "overview": _overview(office.overview),
        "focused_project_id": office.focused_project_id,
        "focused_demand_id": office.focused_demand_id,
        "projects": [_project_dump(project, office.focused_project_id) for project in projects],
        "ports": {"api": 9001, "web": 9002},
    }


@router.put("/profile")
async def put_profile(body: ProfileBody, session: AsyncSession = Depends(get_session)):
    email = (body.email or "").strip()
    if email and "@" not in email:
        raise HTTPException(status_code=400, detail="E-mail inválido.")
    idioma = (body.idioma or "pt").strip().lower()
    if idioma not in _IDIOMAS:
        raise HTTPException(status_code=400, detail="Idioma inválido.")
    office = await _office(session)
    office.perfil_nome = (body.nome or "").strip()
    office.perfil_email = email
    office.perfil_idioma = idioma
    await session.commit()
    return {
        "nome": office.perfil_nome,
        "email": office.perfil_email,
        "idioma": office.perfil_idioma,
        "greeting": office_greeting(now(), office.perfil_idioma, office.perfil_nome),
    }


@router.put("/overview")
async def put_overview(body: OverviewBody, session: AsyncSession = Depends(get_session)):
    office = await _office(session)
    office.overview = _overview(
        {
            "fabrica": body.fabrica,
            "aprovacoes": body.aprovacoes,
            "prazos": body.prazos,
            "ordem": body.ordem,
        }
    )
    flag_modified(office, "overview")
    await session.commit()
    return office.overview


@router.put("/focus")
async def put_focus(body: FocusBody, session: AsyncSession = Depends(get_session)):
    office = await _office(session)
    if body.project_id:
        project = await session.get(Project, body.project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        if project.local_path:
            ensure_layout(project.local_path)
        office.focused_project_id = project.id
    else:
        office.focused_project_id = None
    office.focused_demand_id = body.demand_id
    await session.commit()
    return {"focused_project_id": office.focused_project_id, "focused_demand_id": office.focused_demand_id}


class NewProjectBody(BaseModel):
    name: str
    client: str | None = None


@router.post("/projects", status_code=201)
async def create_project(body: NewProjectBody, session: AsyncSession = Depends(get_session)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Informe o nome do projeto.")
    slug = f"{slugify_project_name(name)}-{uuid.uuid4().hex[:6]}"
    try:
        workspace = materialize_project_workspace("interno", slug)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Workspace: {exc}") from exc
    project = Project(
        id=f"cfg-{uuid.uuid4().hex[:8]}",
        slug=slug,
        name=name,
        client=(body.client or "").strip() or None,
        local_path=str(workspace),
        stages_done=0,
        total_stages=0,
        status="active",
        control=normalize_control({}),
    )
    session.add(project)
    office = await _office(session)
    office.focused_project_id = project.id
    await session.commit()
    await session.refresh(project)
    return _project_dump(project, project.id)


@router.put("/projects/{project_id}/control")
async def put_control(project_id: str, body: ControlBody, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    try:
        clean = validate_control(body.model_dump())
    except ControlError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    project.control = clean
    flag_modified(project, "control")
    if project.local_path:
        ensure_layout(project.local_path)
        write_bases_file(project.local_path, clean["bases"])
    await session.commit()
    return {"id": project.id, "control": clean}


@router.get("/projects/{project_id}/memory")
async def get_memory(project_id: str, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if not project.local_path:
        raise HTTPException(status_code=400, detail="O projeto não tem pasta nesta máquina.")
    return {
        "casa": list_drawer(project.local_path, "casa"),
        "projeto": list_drawer(project.local_path, "projeto"),
        "agente": list_drawer(project.local_path, "agente"),
    }


@router.post("/projects/{project_id}/memory/approve")
async def post_approve(project_id: str, body: MemoryBody, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None or not project.local_path:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    try:
        dest = approve(project.local_path, body.name)
    except MemoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"name": dest.name}


@router.post("/projects/{project_id}/memory/reject")
async def post_reject(project_id: str, body: MemoryBody, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None or not project.local_path:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    try:
        reject(project.local_path, body.name)
    except MemoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@router.post("/halt")
async def post_halt():
    from app.modules.cursor_link.client import halt_factory_agents

    stopped = halt_factory_agents()
    return {"stopped": stopped}
