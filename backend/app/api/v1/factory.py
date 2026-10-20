"""Factory API router — engineering templates and factory projects CRUD."""
import asyncio
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.template import EngineeringTemplate
from app.modules.factory.repository import TemplateRepository
from app.shared.database import async_session, get_session

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
    local_path: str | None = None
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
    ownership: str = "interno"  # interno | externo
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
    from app.modules.factory.workspace_roots import materialize_project_workspace
    from app.modules.factory.esteiras import get_esteira
    from app.modules.factory.run_service import materialize_run_for_project

    ownership = (req.ownership or "interno").strip().lower()
    if ownership not in ("interno", "externo"):
        raise HTTPException(status_code=400, detail="ownership deve ser 'interno' ou 'externo'")

    code = (req.template_code or "lp-c").strip().lower()
    esteira = get_esteira(code)
    total = esteira["total_stages"] if esteira else req.total_stages

    slug = req.name.lower().replace(" ", "-") + f"-{str(uuid.uuid4())[:6]}"
    try:
        workspace = materialize_project_workspace(ownership, slug)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Workspace: {exc}") from exc

    proj = Project(
        id=f"fp-{str(uuid.uuid4())[:8]}",
        slug=slug,
        name=req.name,
        client=req.company,
        company=req.company,
        template_code=code,
        stages_done=0,
        total_stages=total,
        stack=req.stack,
        goal=req.goal,
        audience=req.audience,
        scope_items=req.scope_items or [],
        local_path=str(workspace),
        pendencies=[],
        kanban_cards=[],
        files={"ownership": ownership, "workspace_root": ownership, "template_code": code},
        keys={},
        event_log=[[datetime.now().strftime("%d/%m %H:%M"), "Operação", f"Projeto criado · escopo {ownership}"]],
        status="running",
    )
    repo = TemplateRepository(session)
    created = await repo.create_factory_project(proj)
    try:
        run = await materialize_run_for_project(session, created, template_code=code)
        files = dict(created.files or {})
        files["run_id"] = run.id
        created.files = files
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await session.commit()
    await session.refresh(created)
    return created


@router.get("/projects/{project_id}/run")
async def get_project_run(project_id: str, session: AsyncSession = Depends(get_session)):
    """Run ativo + stages materializadas (B0)."""
    from app.modules.factory.run_service import (
        get_active_run,
        list_stages,
        materialize_run_for_project,
        serialize_run,
    )

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        # também aceita projects criados via /api/v1/projects/
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run = await get_active_run(session, proj.id)
    if not run:
        if not proj.template_code:
            raise HTTPException(status_code=404, detail="Projeto sem esteira / run")
        try:
            run = await materialize_run_for_project(session, proj)
            await session.commit()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    stages = await list_stages(session, run.id)
    return serialize_run(run, stages)


@router.get("/runs/{run_id}")
async def get_run(run_id: str, session: AsyncSession = Depends(get_session)):
    from app.models.factory_run import FactoryRun
    from app.modules.factory.run_service import list_stages, serialize_run

    run = await session.get(FactoryRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    stages = await list_stages(session, run.id)
    return serialize_run(run, stages)


class StageActionRequest(BaseModel):
    note: str | None = None
    actor: str | None = None
    artifact_hash: str | None = None


async def _load_project_and_run(session: AsyncSession, project_id: str):
    from app.modules.factory.run_service import get_active_run, get_latest_run, materialize_run_for_project

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run = await get_active_run(session, proj.id)
    if not run:
        run = await get_latest_run(session, proj.id)
    if not run:
        if not proj.template_code:
            raise HTTPException(status_code=404, detail="Projeto sem run / esteira")
        try:
            run = await materialize_run_for_project(session, proj)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return proj, run


@router.post("/projects/{project_id}/stages/{stage_def_id}/authorize")
async def authorize_project_stage(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """CEO local autoriza gate (awaiting_gate → done → próxima etapa)."""
    from app.modules.factory.run_service import StageTransitionError, authorize_gate

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await authorize_gate(
            session,
            run,
            proj,
            stage_def_id,
            actor=req.actor or "CEO local",
            note=req.note,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.post("/projects/{project_id}/stages/{stage_def_id}/complete")
async def complete_project_stage(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Conclui etapa em execução (não-gate)."""
    from app.modules.factory.run_service import StageTransitionError, complete_stage

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await complete_stage(
            session,
            run,
            proj,
            stage_def_id,
            actor=req.actor,
            note=req.note,
            artifact_hash=req.artifact_hash,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.post("/projects/{project_id}/stages/{stage_def_id}/fail")
async def fail_project_stage(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Marca etapa atual como falha e pausa o run."""
    from app.modules.factory.run_service import StageTransitionError, fail_stage

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await fail_stage(
            session,
            run,
            proj,
            stage_def_id,
            actor=req.actor,
            note=req.note,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.get("/projects/{project_id}/ledger")
async def get_project_ledger(project_id: str, session: AsyncSession = Depends(get_session)):
    from app.modules.factory.run_service import get_ledger

    proj, run = await _load_project_and_run(session, project_id)
    return {
        "project_id": proj.id,
        "run_id": run.id,
        "ledger": get_ledger(run),
        "event_log": proj.event_log or [],
    }


@router.get("/runs/{run_id}/ledger")
async def get_run_ledger(run_id: str, session: AsyncSession = Depends(get_session)):
    from app.models.factory_run import FactoryRun
    from app.modules.factory.run_service import get_ledger

    run = await session.get(FactoryRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return {"run_id": run.id, "project_id": run.project_id, "ledger": get_ledger(run)}


async def _factory_run_sse_generator(run_id: str):
    """Snapshot do ledger/stages + push em tempo real via hub."""
    from app.models.factory_run import FactoryRun
    from app.modules.factory.run_service import get_ledger, list_stages
    from app.modules.factory.sse_hub import factory_sse_hub, format_sse

    # Serializa tudo dentro da sessão — evita MissingGreenlet após close.
    async with async_session() as session:
        run = await session.get(FactoryRun, run_id)
        if not run:
            yield format_sse("error", {"error": "Run not found", "run_id": run_id})
            return
        stages = await list_stages(session, run_id)
        ledger = get_ledger(run)
        project_id = run.project_id
        run_status = run.status
        current_stage_id = run.current_stage_id
        stage_rows = [
            {
                "id": s.id,
                "stage_def_id": s.stage_def_id,
                "status": s.status,
                "is_gate": s.is_gate,
                "title": s.title,
            }
            for s in stages
        ]

    # Snapshot inicial (reconciliação do cliente)
    yield format_sse(
        "run.snapshot",
        {
            "run_id": run_id,
            "project_id": project_id,
            "status": run_status,
            "current_stage_id": current_stage_id,
            "stages": [
                {
                    "stage_id": s["stage_def_id"],
                    "status": s["status"],
                    "is_gate": s["is_gate"],
                    "title": s["title"],
                }
                for s in stage_rows
            ],
            "ledger_count": len(ledger),
        },
        event_id=f"snap-{run_id[:8]}",
    )
    for entry in ledger:
        yield format_sse(
            "event.appended",
            {
                "id": entry.get("id"),
                "run_id": run_id,
                "project_id": project_id,
                "kind": entry.get("kind"),
                "action": entry.get("action"),
                "title": entry.get("title"),
                "actor": entry.get("actor"),
                "note": entry.get("note"),
                "stage_def_id": entry.get("stage_def_id"),
                "occurred_at": entry.get("at"),
                "replay": True,
            },
            event_id=entry.get("id"),
        )
    for s in stage_rows:
        kind = "current" if s["stage_def_id"] == current_stage_id else s["status"]
        yield format_sse(
            "stage.changed",
            {
                "run_id": run_id,
                "project_id": project_id,
                "stage_id": s["stage_def_id"],
                "stage_instance_id": s["id"],
                "status": s["status"],
                "is_gate": s["is_gate"],
                "kind": kind,
                "current_stage_id": current_stage_id,
                "run_status": run_status,
                "replay": True,
            },
            event_id=f"stage-{s['id'][:8]}",
        )

    q = await factory_sse_hub.subscribe(run_id)
    try:
        while True:
            try:
                frame = await asyncio.wait_for(q.get(), timeout=15.0)
            except asyncio.TimeoutError:
                # heartbeat keep-alive
                yield ": ping\n\n"
                # Encerra se run terminou (checagem leve)
                async with async_session() as session:
                    live = await session.get(FactoryRun, run_id)
                    if live and live.status == "done":
                        yield format_sse(
                            "run.completed",
                            {"run_id": run_id, "project_id": live.project_id, "status": "done"},
                        )
                        break
                continue

            event_name = frame.get("event") or "message"
            data = frame.get("data") or {}
            eid = data.get("id") or data.get("stage_instance_id")
            yield format_sse(event_name, data, event_id=str(eid) if eid else None)

            if event_name == "event.appended" and data.get("action") == "run_completed":
                yield format_sse(
                    "run.completed",
                    {
                        "run_id": run_id,
                        "project_id": data.get("project_id"),
                        "status": "done",
                    },
                )
                break
    finally:
        await factory_sse_hub.unsubscribe(run_id, q)


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str):
    """SSE: event.appended · stage.changed · run.snapshot / run.completed."""
    from app.models.factory_run import FactoryRun

    async with async_session() as session:
        run = await session.get(FactoryRun, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return StreamingResponse(
        _factory_run_sse_generator(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/projects/{project_id}/events")
async def stream_project_events(project_id: str, session: AsyncSession = Depends(get_session)):
    """SSE do run ativo do projeto (atalho)."""
    proj, run = await _load_project_and_run(session, project_id)
    return StreamingResponse(
        _factory_run_sse_generator(run.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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