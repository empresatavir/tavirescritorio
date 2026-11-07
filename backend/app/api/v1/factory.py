"""Factory API router — engineering templates and factory projects CRUD."""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
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
    projects = await repo.list_factory_projects()
    from app.modules.factory.run_service import resolve_visible_run

    changed = False
    for proj in projects:
        _run, dirty = await resolve_visible_run(session, proj)
        changed = changed or dirty
    if changed:
        await session.commit()
    return projects


@router.get("/projects/{project_id}", response_model=FactoryProjectResponse)
async def get_factory_project(project_id: str, session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return proj


@router.delete("/projects/{project_id}")
async def delete_factory_project(
    project_id: str,
    delete_folder: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    """Tira o projeto da Fábrica. A pasta sai do disco só quando delete_folder é verdadeiro."""
    from sqlalchemy import delete, or_, select

    from app.models.approval import Approval
    from app.models.artifact import Artifact
    from app.models.event import Event
    from app.models.factory_run import FactoryRun
    from app.models.factory_stage import FactoryStageInstance
    from app.models.idea import Idea
    from app.models.job import Job
    from app.models.job_attempt import JobAttempt
    from app.models.piece import Piece
    from app.models.task import Task

    proj = await session.get(Project, project_id)
    if proj is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    local_path = proj.local_path
    if delete_folder:
        from app.modules.factory.workspace_roots import project_workspace_for_removal

        try:
            project_workspace_for_removal(local_path)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    task_ids = list((await session.execute(select(Task.id).where(Task.project_id == project_id))).scalars().all())
    job_filter = [Job.project_id == project_id]
    if task_ids:
        job_filter.append(Job.task_id.in_(task_ids))
    job_ids = list((await session.execute(select(Job.id).where(or_(*job_filter)))).scalars().all())
    artifact_filter = []
    if job_ids:
        artifact_filter.append(Artifact.job_id.in_(job_ids))
    if task_ids:
        artifact_filter.append(Artifact.task_id.in_(task_ids))
    artifact_ids = (
        list((await session.execute(select(Artifact.id).where(or_(*artifact_filter)))).scalars().all())
        if artifact_filter
        else []
    )
    approval_filter = []
    if job_ids:
        approval_filter.append(Approval.job_id.in_(job_ids))
    if task_ids:
        approval_filter.append(Approval.task_id.in_(task_ids))
    approval_ids = (
        list((await session.execute(select(Approval.id).where(or_(*approval_filter)))).scalars().all())
        if approval_filter
        else []
    )

    async def drop(model, column, ids: list[str]) -> None:
        if ids:
            await session.execute(delete(model).where(column.in_(ids)))

    event_filter = []
    if job_ids:
        event_filter.append(Event.job_id.in_(job_ids))
    if task_ids:
        event_filter.append(Event.task_id.in_(task_ids))
    if approval_ids:
        event_filter.append(Event.approval_id.in_(approval_ids))
    if artifact_ids:
        event_filter.append(Event.artifact_id.in_(artifact_ids))
    if event_filter:
        await session.execute(delete(Event).where(or_(*event_filter)))
    await drop(Artifact, Artifact.id, artifact_ids)
    await drop(JobAttempt, JobAttempt.job_id, job_ids)
    await drop(Approval, Approval.id, approval_ids)
    await drop(Job, Job.id, job_ids)
    await drop(Task, Task.id, task_ids)
    await session.execute(delete(FactoryStageInstance).where(FactoryStageInstance.project_id == project_id))
    await session.execute(delete(FactoryRun).where(FactoryRun.project_id == project_id))
    await session.execute(delete(Piece).where(Piece.project_id == project_id))
    await session.execute(delete(Idea).where(Idea.project_id == project_id))
    await session.delete(proj)
    await session.commit()

    folder_deleted = False
    folder_error = None
    if delete_folder:
        from app.modules.factory.workspace_roots import remove_project_workspace

        try:
            remove_project_workspace(local_path)
            folder_deleted = True
        except OSError as exc:
            folder_error = str(exc)
    return {
        "ok": True,
        "id": project_id,
        "folder_deleted": folder_deleted,
        "folder_error": folder_error,
    }


@router.post("/projects", response_model=FactoryProjectResponse, status_code=201)
async def create_factory_project(req: CreateFactoryProjectRequest, session: AsyncSession = Depends(get_session)):
    from app.modules.factory.workspace_roots import materialize_project_workspace, slugify_project_name
    from app.modules.factory.esteiras import get_esteira
    from app.modules.factory.run_service import materialize_run_for_project

    ownership = (req.ownership or "interno").strip().lower()
    if ownership not in ("interno", "externo"):
        raise HTTPException(status_code=400, detail="ownership deve ser 'interno' ou 'externo'")

    code = (req.template_code or "lp-c").strip().lower()
    esteira = get_esteira(code)
    total = esteira["total_stages"] if esteira else req.total_stages

    slug = f"{slugify_project_name(req.name)}-{str(uuid.uuid4())[:6]}"
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
        list_stages,
        materialize_run_for_project,
        resolve_visible_run,
        serialize_run,
    )

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        # também aceita projects criados via /api/v1/projects/
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run, restored = await resolve_visible_run(session, proj)
    if not run:
        if not proj.template_code:
            raise HTTPException(status_code=404, detail="Projeto sem esteira / run")
        try:
            run = await materialize_run_for_project(session, proj)
            await session.commit()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    elif restored:
        await session.commit()
        await session.refresh(run)
        await session.refresh(proj)

    from app.modules.factory.run_service import align_run_to_esteira, stamp_run_engine

    if await align_run_to_esteira(session, run, proj):
        await session.refresh(run)
    await stamp_run_engine(session, run)

    stages = await list_stages(session, run.id)
    return serialize_run(run, stages)


@router.post("/projects/{project_id}/open-folder")
async def open_project_folder(project_id: str, session: AsyncSession = Depends(get_session)):
    """Abre o workspace do projeto no Explorer (Windows) / gerenciador local."""
    from pathlib import Path
    from app.modules.factory.workspace_roots import open_folder_in_os
    from app.modules.factory.run_service import get_active_run, get_latest_run

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    path_str = proj.local_path
    if not path_str:
        run = await get_active_run(session, proj.id) or await get_latest_run(session, proj.id)
        path_str = run.workspace_path if run else None
    if not path_str:
        raise HTTPException(status_code=404, detail="Projeto sem pasta local materializada")

    try:
        open_folder_in_os(Path(path_str))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao abrir pasta: {exc}") from exc

    return {"ok": True, "path": str(Path(path_str).resolve())}


class WriteArtifactRequest(BaseModel):
    path: str
    content: str
    overwrite: bool = True
    stage_def_id: str | None = None


@router.get("/projects/{project_id}/artifacts")
async def list_project_artifacts(project_id: str, session: AsyncSession = Depends(get_session)):
    """B4 — lista arquivos reais do workspace + status dos expected_artifacts da etapa atual."""
    from app.modules.factory.artifacts import ArtifactError, expected_status, list_artifacts
    from app.modules.factory.run_service import get_active_run, get_latest_run, list_stages

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    try:
        files = list_artifacts(proj.local_path)
    except ArtifactError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    expected: list[dict] = []
    run = await get_active_run(session, proj.id) or await get_latest_run(session, proj.id)
    if run and run.current_stage_id:
        stages = await list_stages(session, run.id)
        current = next((s for s in stages if s.stage_def_id == run.current_stage_id), None)
        if current and current.expected_artifacts:
            expected = expected_status(proj.local_path, list(current.expected_artifacts))

    return {
        "project_id": proj.id,
        "local_path": proj.local_path,
        "files": files,
        "expected": expected,
        "count": len(files),
    }


@router.get("/projects/{project_id}/artifacts/content")
async def read_project_artifact(
    project_id: str,
    path: str,
    session: AsyncSession = Depends(get_session),
):
    """B4 — lê conteúdo textual de um arquivo do workspace."""
    from app.modules.factory.artifacts import ArtifactError, read_artifact

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    try:
        return read_artifact(proj.local_path, path)
    except ArtifactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/projects/{project_id}/artifacts")
async def write_project_artifact(
    project_id: str,
    req: WriteArtifactRequest,
    session: AsyncSession = Depends(get_session),
):
    """B4 — grava arquivo no workspace (UTF-8) e registra no ledger do run."""
    from app.modules.factory.artifacts import ArtifactError, write_artifact
    from app.modules.factory.run_service import (
        _append_ledger,
        _append_project_event,
        get_active_run,
        get_latest_run,
        list_stages,
        serialize_run,
    )
    from app.modules.factory.sse_hub import factory_sse_hub

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    try:
        written = write_artifact(
            proj.local_path,
            req.path,
            req.content,
            overwrite=req.overwrite,
        )
    except ArtifactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    run = await get_active_run(session, proj.id) or await get_latest_run(session, proj.id)
    ledger_entry = None
    if run:
        stages = await list_stages(session, run.id)
        stage = None
        if req.stage_def_id:
            stage = next((s for s in stages if s.stage_def_id == req.stage_def_id), None)
        if stage is None and run.current_stage_id:
            stage = next((s for s in stages if s.stage_def_id == run.current_stage_id), None)
        if stage is None and stages:
            stage = stages[0]
        if stage:
            ledger_entry = _append_ledger(
                run,
                kind="artifact",
                action="written",
                stage=stage,
                actor="Operador",
                note=f"{written['path']} · sha256={written['sha256'][:12]}",
            )
            _append_project_event(proj, "Operador", f"Artefato gravado: {written['path']}")
            await session.flush()
            await factory_sse_hub.publish(
                run.id,
                "event.appended",
                {
                    "id": ledger_entry.get("id"),
                    "run_id": run.id,
                    "project_id": run.project_id,
                    "kind": "artifact",
                    "action": "written",
                    "title": stage.title,
                    "actor": "Operador",
                    "note": ledger_entry.get("note"),
                    "stage_def_id": stage.stage_def_id,
                    "occurred_at": ledger_entry.get("at"),
                },
            )

    run_payload = None
    if run:
        await session.refresh(run)
        stages_out = await list_stages(session, run.id)
        run_payload = serialize_run(run, stages_out)

    await session.commit()
    return {
        "ok": True,
        "file": written,
        "ledger": ledger_entry,
        "run": run_payload,
    }


async def _factory_project(session: AsyncSession, project_id: str) -> Project:
    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return proj


@router.get("/projects/{project_id}/qa")
async def get_project_qa(project_id: str, session: AsyncSession = Depends(get_session)):
    """Completion Guard, fluxo de QA e evidências gravadas no projeto."""
    from app.modules.factory.dossier import qa_dossier
    from app.modules.factory.run_service import list_stages, resolve_visible_run

    proj = await _factory_project(session, project_id)
    run, restored = await resolve_visible_run(session, proj)
    if restored:
        await session.commit()
    stages = await list_stages(session, run.id) if run else []
    code = (run.template_code if run else None) or proj.template_code or "lp-c"
    report = qa_dossier(proj.local_path, code, stages)
    report["project_id"] = proj.id
    report["run_id"] = run.id if run else None
    return report


@router.get("/projects/{project_id}/security")
async def get_project_security(project_id: str, session: AsyncSession = Depends(get_session)):
    """Vistoria de segurança: varredura, parecer e roteiro do especialista."""
    from app.modules.factory.dossier import security_dossier

    proj = await _factory_project(session, project_id)
    report = security_dossier(proj.local_path)
    report["project_id"] = proj.id
    return report


@router.post("/projects/{project_id}/security/plan")
async def plan_project_security(project_id: str, session: AsyncSession = Depends(get_session)):
    """O especialista lê o projeto e grava o roteiro de verificação."""
    from pathlib import Path

    from app.modules.factory.artifacts import ArtifactError, resolve_workspace_root
    from app.modules.factory.dossier import security_dossier, write_scanner_roteiro
    from app.modules.factory.engine_prefs import office_call
    from app.modules.factory.run_service import resolve_visible_run
    from app.modules.factory.work_session import WorkSessionError, _default_agent

    proj = await _factory_project(session, project_id)
    try:
        root = resolve_workspace_root(proj.local_path)
    except ArtifactError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    write_scanner_roteiro(root)
    run, _restored = await resolve_visible_run(session, proj)
    meta = (run.meta if run else None) or {}
    _provider, model, effort, _enabled = await office_call(meta.get("model"), meta.get("effort"))
    prompt = (
        "Você é Sérgio Seg/LGPD. Analise este projeto e grave somente qa/security-roteiro.md.\n"
        "Não altere código do produto, não apague arquivos e não recomece a esteira.\n"
        "O arquivo deve ser um roteiro de verificação específico deste projeto, em português, neste formato:\n"
        "# Roteiro de verificação\n"
        "- [ ] Título curto | o que conferir neste projeto\n"
        "Marque [x] só o que você verificou e está seguro. Deixe [ ] no que ainda precisa de prova.\n"
        "Cubra segredo, autenticação, dados pessoais, permissões e a superfície real (Flutter, API ou site) que existir na pasta."
    )
    try:
        await asyncio.to_thread(_default_agent, Path(root), prompt, model or "", effort or "", None)
    except WorkSessionError as exc:
        report = security_dossier(proj.local_path)
        report["project_id"] = proj.id
        report["agent_error"] = str(exc)
        return report
    report = security_dossier(proj.local_path)
    report["project_id"] = proj.id
    report["specialist"] = True
    return report


@router.get("/projects/{project_id}/artifacts/raw")
async def read_project_artifact_raw(
    project_id: str,
    path: str,
    session: AsyncSession = Depends(get_session),
):
    """Entrega HTML ou imagem de evidência para a vistoria."""
    from app.modules.factory.artifacts import ArtifactError, resolve_safe_path, resolve_workspace_root
    from app.modules.factory.dossier import RAW_SUFFIXES

    proj = await _factory_project(session, project_id)
    try:
        root = resolve_workspace_root(proj.local_path)
        target = resolve_safe_path(root, path)
    except ArtifactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not target.is_file() or target.suffix.lower() not in RAW_SUFFIXES:
        raise HTTPException(status_code=404, detail="Evidência visual não encontrada")
    return FileResponse(target)


@router.get("/projects/{project_id}/roadmap")
async def get_project_roadmap(project_id: str, session: AsyncSession = Depends(get_session)):
    """B6 — Roadmap = projeção das stages do run."""
    from app.modules.factory.run_service import get_latest_run, list_stages, resolve_visible_run, serialize_stage

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run, restored = await resolve_visible_run(session, proj)
    if restored:
        await session.commit()
    if not run:
        run = await get_latest_run(session, proj.id)
    if not run:
        raise HTTPException(status_code=404, detail="Projeto sem run")
    stages = await list_stages(session, run.id)
    done = sum(1 for s in stages if s.status == "done")
    total = len(stages) or 1
    return {
        "project_id": proj.id,
        "run_id": run.id,
        "template_code": run.template_code,
        "pct": round((done / total) * 100),
        "stages_done": done,
        "total_stages": total,
        "current_stage_id": run.current_stage_id,
        "stages": [serialize_stage(s) for s in stages],
    }


class ChatMessageRequest(BaseModel):
    message: str
    agent_role: str | None = None
    agent_name: str | None = None
    to_project: bool = False


@router.get("/projects/{project_id}/chat")
async def get_project_chat(project_id: str, session: AsyncSession = Depends(get_session)):
    """B8 — histórico de chat escopado ao projeto."""
    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    files = dict(proj.files or {})
    chat = list(files.get("chat") or [])
    return {"project_id": proj.id, "messages": chat}


@router.post("/projects/{project_id}/chat")
async def post_project_chat(
    project_id: str,
    req: ChatMessageRequest,
    session: AsyncSession = Depends(get_session),
):
    """B8 — mensagem isolada por project_id (persona da stage via GhostCLI)."""
    import uuid as _uuid
    from app.modules.factory.run_service import get_latest_run, list_stages, resolve_visible_run
    from app.modules.ghostcli import chat_completion
    from app.modules.ghostcli.client import GhostCliError
    from sqlalchemy.orm.attributes import flag_modified

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    text = (req.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message vazia")

    run, _restored = await resolve_visible_run(session, proj)
    if run is None:
        run = await get_latest_run(session, proj.id)
    stages = await list_stages(session, run.id) if run else []
    finished = run is not None and run.status == "done"
    to_project = bool(req.to_project)
    agent_name = None if to_project else req.agent_name
    agent_role = None if to_project else req.agent_role
    cur = next((s for s in stages if run and s.stage_def_id == run.current_stage_id), None)
    stage_title = cur.title if cur else None
    if not to_project and not agent_name and cur and not finished:
        agent_name = cur.agent
        agent_role = cur.agent_role or agent_role
    if to_project:
        agent_name = proj.name
        agent_role = "projeto"
    else:
        agent_name = agent_name or ("Projeto" if finished else "Orquestrador")
        agent_role = agent_role or ("projeto" if finished else "orquestrador")

    now = datetime.now(timezone.utc).isoformat()
    raw_files = proj.files if isinstance(proj.files, dict) else {}
    files = dict(raw_files)
    chat = list(files.get("chat") or [])
    user_msg = {
        "id": str(_uuid.uuid4()),
        "role": "user",
        "text": text,
        "agent_role": agent_role,
        "agent_name": agent_name,
        "at": now,
        "project_id": proj.id,
    }

    history = []
    for m in chat[-8:]:
        role = "assistant" if m.get("role") in ("agent", "assistant") else "user"
        history.append({"role": role, "content": m.get("text") or ""})
    history.append({"role": "user", "content": text})

    from app.modules.factory.actions import split_actions
    from app.modules.factory.demands import chat_workspace, open_demand, order_path_for
    from app.modules.factory.engine_prefs import office_call
    from app.modules.factory.project_control import ensure_layout

    run_meta = (run.meta if run else None) or {}
    provider, model, effort, _enabled = await office_call(run_meta.get("model"), run_meta.get("effort"))
    demand = await open_demand(session, proj.id, (run_meta or {}).get("demand_id"))
    stage_label = stage_title or (run.current_stage_id if run else None)
    recent = [f"{item['role']}: {item['content']}" for item in history]
    note = f"Você é {agent_name}, atuando como {agent_role}."
    if finished:
        maintenance = bool((run.meta or {}).get("maintenance")) if run else False
        note += " A esteira está encerrada."
        if maintenance:
            note += " A gravação só acontece quando a pessoa pede Aplicar no projeto."
        else:
            note += " Para alterar o código, a pessoa entra em manutenção."
    if to_project:
        note += f" A conversa é com o projeto {proj.name}."

    try:
        ensure_layout(proj.local_path)
    except Exception:
        ensure_layout_ok = False
    else:
        ensure_layout_ok = True
    workspace = None
    order = None
    if ensure_layout_ok and proj.local_path:
        folder = chat_workspace(proj, demand if demand and demand.status not in {"concluida", "recusada"} else None)
        workspace = str(folder)
        order = str(order_path_for(folder))
    from app.modules.factory.chat_reply import fonte_prompt, local_text, needs_source, retrato_prompt

    direct = local_text(proj, demand, stage_label, text)
    ghost_meta = None
    try:
        from app.modules.cursor_link.client import answer_inline, ask_in_workspace, cli_path

        binary = cli_path()
        if direct is not None:
            reply_text = direct
            ghost_meta = "retrato:local"
        elif needs_source(text) and binary and workspace:
            reply_text = await asyncio.to_thread(
                ask_in_workspace,
                binary,
                workspace,
                model or "",
                "low",
                note + "\n" + fonte_prompt(proj, demand, stage_label, text),
                None,
                50.0,
                order,
            )
            ghost_meta = "cursor:fonte:low"
        elif binary:
            reply_text = await asyncio.to_thread(
                answer_inline,
                binary,
                "auto",
                "low",
                note + "\n" + retrato_prompt(proj, demand, stage_label, recent, text),
                40.0,
            )
            ghost_meta = "cursor:retrato:auto"
        else:
            reply_text = await chat_completion(
                system=note + "\n" + retrato_prompt(proj, demand, stage_label, recent, text),
                messages=[{"role": "user", "content": text}],
                model=model,
                effort="low",
                provider=provider,
                max_tokens=400,
                timeout=40,
            )
            ghost_meta = f"{provider}:retrato:low"
    except (GhostCliError, RuntimeError) as exc:
        reply_text = (
            f"[{agent_name}] Não consegui falar com o motor agora ({exc}). "
            f"Mensagem recebida no projeto {proj.name}."
        )
        ghost_meta = f"ghostcli:error:{exc}"

    from app.modules.chat.service import ChatService

    visible, actions = split_actions(ChatService._plain_reply(reply_text))
    reply = {
        "id": str(_uuid.uuid4()),
        "role": "agent",
        "text": visible,
        "agent_role": agent_role,
        "agent_name": agent_name,
        "at": datetime.now(timezone.utc).isoformat(),
        "project_id": proj.id,
        "meta": ghost_meta,
        "actions": actions,
    }
    chat.extend([user_msg, reply])
    files["chat"] = chat[-200:]
    proj.files = files
    flag_modified(proj, "files")
    await session.commit()
    return {"project_id": proj.id, "messages": [user_msg, reply], "history_count": len(files["chat"])}


@router.post("/projects/{project_id}/maintenance")
async def open_project_maintenance(project_id: str, session: AsyncSession = Depends(get_session)):
    """Liga a manutenção do projeto finalizado sem reabrir a esteira."""
    from app.modules.factory.run_service import list_stages, resolve_visible_run, serialize_run
    from sqlalchemy.orm.attributes import flag_modified

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run, _restored = await resolve_visible_run(session, proj)
    if not run or run.status != "done":
        await session.commit()
        raise HTTPException(
            status_code=409,
            detail="A manutenção abre quando a esteira está finalizada.",
        )
    meta = dict(run.meta or {})
    meta["maintenance"] = True
    run.meta = meta
    flag_modified(run, "meta")
    await session.commit()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    return serialize_run(run, stages)


@router.post("/projects/{project_id}/maintenance/apply")
async def apply_project_maintenance(
    project_id: str,
    req: ChatMessageRequest,
    session: AsyncSession = Depends(get_session),
):
    """Aplica um pedido de manutenção no código já entregue."""
    import asyncio
    import uuid as _uuid
    from pathlib import Path

    from sqlalchemy.orm.attributes import flag_modified

    from app.modules.factory.engine_prefs import office_call
    from app.modules.factory.run_service import resolve_visible_run
    from app.modules.factory.work_session import WorkSessionError, _default_agent

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    text = (req.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message vazia")

    run, _restored = await resolve_visible_run(session, proj)
    if not run or run.status != "done":
        raise HTTPException(
            status_code=409,
            detail="A alteração entra na manutenção de um projeto finalizado.",
        )
    if not (run.meta or {}).get("maintenance"):
        raise HTTPException(status_code=409, detail="Entre em manutenção antes de aplicar uma alteração.")

    workspace = proj.local_path or run.workspace_path
    if not workspace:
        raise HTTPException(status_code=404, detail="Projeto sem pasta para aplicar a alteração.")

    _provider, model, effort, _enabled = await office_call((run.meta or {}).get("model"), (run.meta or {}).get("effort"))
    prompt = (
        "Manutenção do projeto já entregue. A esteira permanece finalizada. "
        "Não recrie etapas, não apague a pasta e não recomece do Gate 0.\n"
        "Aplique somente este pedido:\n"
        f"{text}\n"
        "Ao terminar, descreva os arquivos alterados."
    )
    try:
        reply_text = await asyncio.to_thread(
            _default_agent,
            Path(workspace),
            prompt,
            model or "",
            effort or "",
            None,
        )
    except WorkSessionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    now = datetime.now(timezone.utc).isoformat()
    raw_files = proj.files if isinstance(proj.files, dict) else {}
    files = dict(raw_files)
    chat = list(files.get("chat") or [])
    user_msg = {
        "id": str(_uuid.uuid4()),
        "role": "user",
        "text": text,
        "agent_role": "manutencao",
        "agent_name": "Projeto",
        "at": now,
        "project_id": proj.id,
    }
    reply = {
        "id": str(_uuid.uuid4()),
        "role": "agent",
        "text": reply_text or "Alteração aplicada no projeto.",
        "agent_role": "manutencao",
        "agent_name": "Projeto",
        "at": datetime.now(timezone.utc).isoformat(),
        "project_id": proj.id,
    }
    chat.extend([user_msg, reply])
    files["chat"] = chat[-200:]
    proj.files = files
    flag_modified(proj, "files")
    await session.commit()
    return {"project_id": proj.id, "messages": [user_msg, reply], "applied": True}


class AccessUpsertRequest(BaseModel):
    key: str
    label: str | None = None
    kind: str = "secret"
    status: str = "active"  # active | missing | expiring
    hint: str | None = None
    value: str | None = None  # só armazena máscara; valor real não persiste em claro


@router.get("/projects/{project_id}/access")
async def get_project_access(project_id: str, session: AsyncSession = Depends(get_session)):
    """B9 — metadados de acessos (sem secrets em claro)."""
    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    keys = dict(proj.keys or {})
    items = list(keys.get("access_items") or [])
    # nunca devolver value_plain
    safe = []
    for it in items:
        safe.append(
            {
                "key": it.get("key"),
                "label": it.get("label") or it.get("key"),
                "kind": it.get("kind") or "secret",
                "status": it.get("status") or "missing",
                "hint": it.get("hint"),
                "masked": it.get("masked") or "••••••",
                "updated_at": it.get("updated_at"),
            }
        )
    return {"project_id": proj.id, "items": safe}


@router.put("/projects/{project_id}/access")
async def upsert_project_access(
    project_id: str,
    req: AccessUpsertRequest,
    session: AsyncSession = Depends(get_session),
):
    """B9 — upsert metadado; valor só gera máscara (não persiste plaintext)."""
    from datetime import timezone
    from sqlalchemy.orm.attributes import flag_modified

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    key = (req.key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="key obrigatória")

    keys = dict(proj.keys or {})
    items = list(keys.get("access_items") or [])
    masked = "••••••"
    if req.value:
        v = req.value.strip()
        masked = (v[:4] + "•" * min(10, max(0, len(v) - 4))) if len(v) > 4 else "••••"

    found = False
    now = datetime.now(timezone.utc).isoformat()
    for it in items:
        if it.get("key") == key:
            it["label"] = req.label or it.get("label") or key
            it["kind"] = req.kind
            it["status"] = req.status
            it["hint"] = req.hint
            it["masked"] = masked if req.value else it.get("masked") or masked
            it["updated_at"] = now
            # descarta plaintext se existir
            it.pop("value_plain", None)
            found = True
            break
    if not found:
        items.append(
            {
                "key": key,
                "label": req.label or key,
                "kind": req.kind,
                "status": req.status if req.value else "missing",
                "hint": req.hint,
                "masked": masked if req.value else "••••••",
                "updated_at": now,
            }
        )
    keys["access_items"] = items
    proj.keys = keys
    flag_modified(proj, "keys")
    await session.commit()
    return {"project_id": proj.id, "items": items}


@router.post("/projects/{project_id}/access/{key}/reveal")
async def reveal_project_access(
    project_id: str,
    key: str,
    session: AsyncSession = Depends(get_session),
):
    """B9 — reveal auditado: só máscara + evento no ledger (sem plaintext)."""
    from app.modules.factory.run_service import (
        _append_ledger,
        _append_project_event,
        get_active_run,
        get_latest_run,
        list_stages,
    )
    from app.modules.factory.sse_hub import factory_sse_hub

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    keys = dict(proj.keys or {})
    items = list(keys.get("access_items") or [])
    item = next((i for i in items if i.get("key") == key), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Acesso '{key}' não encontrado")

    run = await get_active_run(session, proj.id) or await get_latest_run(session, proj.id)
    if run:
        stages = await list_stages(session, run.id)
        stage = stages[0] if stages else None
        if stage:
            entry = _append_ledger(
                run,
                kind="access",
                action="reveal",
                stage=stage,
                actor="CEO local",
                note=f"Reveal auditado · {key} (somente máscara)",
            )
            _append_project_event(proj, "CEO local", f"Reveal acesso: {key}")
            await session.flush()
            await factory_sse_hub.publish(
                run.id,
                "event.appended",
                {
                    "id": entry.get("id"),
                    "run_id": run.id,
                    "project_id": run.project_id,
                    "kind": "access",
                    "action": "reveal",
                    "title": stage.title,
                    "actor": "CEO local",
                    "note": entry.get("note"),
                    "occurred_at": entry.get("at"),
                },
            )
    await session.commit()
    return {
        "project_id": proj.id,
        "key": key,
        "masked": item.get("masked") or "••••••",
        "revealed": False,
        "note": "v1 não persiste plaintext; reveal só audita no ledger",
    }


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
    model: str | None = None
    effort: str | None = None


class AutoSwitchRequest(BaseModel):
    enabled: bool


async def _load_project_and_run(session: AsyncSession, project_id: str):
    from app.modules.factory.run_service import (
        get_latest_run,
        materialize_run_for_project,
        resolve_visible_run,
    )

    repo = TemplateRepository(session)
    proj = await repo.get_factory_project(project_id)
    if not proj:
        proj = await session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    run, restored = await resolve_visible_run(session, proj)
    if restored:
        await session.commit()
        if run:
            await session.refresh(run)
        await session.refresh(proj)
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


@router.post("/projects/{project_id}/stages/{stage_def_id}/execute")
async def execute_project_stage(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """B7 — executor local: materializa expected_artifacts + hash no ledger."""
    from app.modules.factory.executor import execute_stage
    from app.modules.factory.run_service import StageTransitionError

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await execute_stage(
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


@router.put("/projects/{project_id}/run/auto-switch")
async def put_auto_switch(
    project_id: str,
    body: AutoSwitchRequest,
    session: AsyncSession = Depends(get_session),
):
    """Liga ou desliga a execução automática no run, sem avançar a esteira."""
    from app.modules.factory.run_service import set_auto_execute

    _proj, run = await _load_project_and_run(session, project_id)
    payload = await set_auto_execute(session, run, enabled=body.enabled)
    await session.commit()
    return payload


@router.post("/projects/{project_id}/run/auto")
async def auto_execute_project_run(
    project_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Execução automática: execute+complete até o próximo gate CEO / done / falha."""
    from app.modules.factory.executor import auto_execute_until_gate
    from app.modules.factory.run_service import StageTransitionError

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await auto_execute_until_gate(
            session,
            run,
            proj,
            actor=req.actor or "Executor automático",
            note=req.note or "",
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        from app.modules.factory.executor import recover_auto_failure

        return await recover_auto_failure(
            session,
            run,
            proj,
            exc,
            actor=req.actor or "Executor automático",
        )
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


@router.post("/projects/{project_id}/stages/{stage_def_id}/resume")
async def resume_project_stage(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Retoma etapa falha / run pausado (B3)."""
    from app.modules.factory.run_service import StageTransitionError, resume_stage

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await resume_stage(
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


@router.post("/projects/{project_id}/run/resume")
async def resume_project_run(
    project_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Retoma o run pausado na etapa atual (B3)."""
    from app.modules.factory.run_service import StageTransitionError, resume_stage

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await resume_stage(
            session,
            run,
            proj,
            None,
            actor=req.actor or "CEO local",
            note=req.note,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.post("/projects/{project_id}/stages/{stage_def_id}/redo")
async def redo_project_gate(
    project_id: str,
    stage_def_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Reabre a entrega do gate com instruções, modelo e esforço."""
    from app.modules.factory.run_service import StageTransitionError, redo_gate_delivery

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await redo_gate_delivery(
            session,
            run,
            proj,
            stage_def_id,
            actor=req.actor or "CEO local",
            note=req.note,
            model=req.model,
            effort=req.effort,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.post("/projects/{project_id}/run/restart")
async def restart_project_run(
    project_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Reinicia a esteira no Gate 0. A pasta do projeto permanece."""
    from app.modules.factory.run_service import StageTransitionError, restart_run

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await restart_run(
            session,
            run,
            proj,
            actor=req.actor or "CEO local",
            note=req.note,
            model=req.model,
            effort=req.effort,
        )
    except StageTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await session.commit()
    return payload


@router.post("/agents/halt")
async def halt_running_agents():
    """Corta o agente que a Fábrica abriu. Não espera o banco."""
    from app.modules.cursor_link.client import halt_factory_agents

    return {"ok": True, "stopped": halt_factory_agents()}


@router.post("/projects/{project_id}/run/pause")
async def pause_project_run(
    project_id: str,
    req: StageActionRequest = Body(default_factory=StageActionRequest),
    session: AsyncSession = Depends(get_session),
):
    """Pausa suave sem falhar a etapa (B3)."""
    from app.modules.factory.run_service import StageTransitionError, pause_run

    proj, run = await _load_project_and_run(session, project_id)
    try:
        payload = await pause_run(
            session,
            run,
            proj,
            actor=req.actor or "CEO local",
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
    seen_progress: set[str] = set()
    try:
        for frame in await factory_sse_hub.recent_progress(run_id):
            data = frame.get("data") or {}
            eid = str(data.get("id") or "")
            if eid:
                seen_progress.add(eid)
            yield format_sse("execution.progress", data, event_id=eid or None)
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
            if event_name == "execution.progress" and eid and str(eid) in seen_progress:
                continue
            if event_name == "execution.progress" and eid:
                seen_progress.add(str(eid))
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


from app.modules.factory.demand_http import mount as mount_demands

mount_demands(router)


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