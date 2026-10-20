"""Jobs API router — create, status and SSE events for job lifecycle."""
import asyncio
import json
import re
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_session, async_session
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.runner import JobRunner
from app.models.task import Task
from app.models.project import Project
from app.models.agent import Agent
from app.models.artifact import Artifact

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def _get_office_module():
    try:
        import sys
        from pathlib import Path
        for parent in Path(__file__).resolve().parents:
            ag = parent / "AgenciaIA"
            if ag.exists() and (ag / "tools" / "office.py").exists():
                if str(ag) not in sys.path:
                    sys.path.insert(0, str(ag))
                from tools import office
                return office
    except Exception as exc:
        print(f"[jobs.py] Warning: could not load office module: {exc}")
    return None


class CreateJobRequest(BaseModel):
    task_id: str | None = None
    project_id: str | None = None
    agent_id: str | None = None
    command: str = "echo hello"
    timeout: int = 30
    model_name: str | None = None
    effort: str | None = None
    model_provider: str | None = None
    # planning | execution | manual — controla transição de status da task vinculada
    origin: str = "manual"

    model_config = {"protected_namespaces": ()}


class JobResponse(BaseModel):
    id: str
    task_id: str | None = None
    project_id: str | None = None
    agent_id: str | None = None
    origin: str
    model_provider: str | None = None
    model_name: str | None = None
    effort: str | None = None
    status: str
    workspace_path: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}


_background_job_tasks: set[asyncio.Task] = set()


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(req: CreateJobRequest, session: AsyncSession = Depends(get_session)):
    task = None
    if req.task_id:
        tid_str = str(req.task_id)
        task = await session.get(Task, tid_str)
        if not task:
            m_num = re.search(r"\d+", tid_str)
            if m_num:
                seq_num = int(m_num.group(0))
                stmt = select(Task).where((Task.seq == seq_num) | (Task.id == f"task-{seq_num}"))
                res = await session.execute(stmt)
                task = res.scalars().first()
                if task:
                    req.task_id = task.id

        if not task:
            office = _get_office_module()
            if office:
                cols = office.kan_load()
                m_num = re.search(r"\d+", tid_str)
                k_item = None
                if m_num:
                    _, k_item = office.kan_achar_numero(cols, int(m_num.group(0)))
                if not k_item:
                    _, k_item = office.kan_achar(cols, tid_str.replace("task-", ""))
                if k_item:
                    seq_num = int(k_item.get("numero", 0) or 0)
                    task = Task(
                        id=tid_str if tid_str.startswith("task-") else f"task-{seq_num or k_item['slug']}",
                        seq=seq_num if seq_num > 0 else None,
                        project_id="tavir-core",
                        title=k_item["titulo"],
                        description=k_item.get("contexto") or None,
                        status="pending",
                        priority="medium",
                        assignee_agent_id="pm-projetos",
                        sector="Operação",
                    )
                    session.add(task)
                    await session.flush()
                    req.task_id = task.id

    # Check dependencies (Hard blocker -> HTTP 409 Conflict)
    if task:
        office = _get_office_module()
        if office:
            cols = office.kan_load()
            card = None
            if task.title:
                for col_name, items in cols.items():
                    for it in items:
                        if it.get("titulo") == task.title:
                            card = it
                            break
                    if card:
                        break
            if not card and task.seq:
                _, card = office.kan_achar_numero(cols, task.seq)
            if not card and task.title:
                _, card = office.kan_achar(cols, office.slug(task.title))
            if not card:
                _, card = office.kan_achar(cols, task.id.replace("task-", ""))

            if card and task.seq != card.get("numero") and card.get("numero"):
                task.seq = card.get("numero")

            if card:
                ok, bloqueantes = office.kan_checar_dependencias(card, cols)
                if not ok:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Task {req.task_id} bloqueada por dependências não concluídas: {', '.join(bloqueantes)}"
                    )
                etapa = office.kan_esc_etapa_atual(card)
                if etapa and etapa.get("estado") == "bloqueada":
                    gate = office.decision_gate_para_item(card)
                    if gate:
                        data_gate = office.load()
                        ped, criado = office.decision_gate_abrir(data_gate, gate)
                        if criado:
                            office.save(data_gate)
                        estado_gate = office.decision_gate_estado(data_gate, gate)
                        if not estado_gate["approved"]:
                            raise HTTPException(
                                status_code=409,
                                detail=f"Task {req.task_id} possui etapa bloqueada aguardando aprovação humana de decision gate"
                            )

    # Infer model and effort
    model_name = req.model_name
    effort = req.effort
    if not model_name and req.command:
        if "Fable" in req.command or "fable" in req.command.lower():
            model_name = "Fable"
        elif "Claude" in req.command or "claude" in req.command.lower():
            model_name = "Claude"
    if not effort and req.command:
        if "Máximo" in req.command or "max" in req.command.lower():
            effort = "max"

    # Validate foreign keys
    project_id = req.project_id
    if project_id:
        p = await session.get(Project, project_id)
        if not p:
            p_core = await session.get(Project, "tavir-core")
            project_id = "tavir-core" if p_core else None

    agent_id = req.agent_id
    if agent_id:
        a = await session.get(Agent, agent_id)
        if not a:
            agent_id = "pm-projetos"

    origin = (req.origin or "manual").strip().lower()
    if origin not in ("planning", "execution", "manual"):
        origin = "manual"

    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=req.task_id,
        project_id=project_id,
        agent_id=agent_id,
        command=req.command,
        model_name=model_name,
        effort=effort,
        model_provider=req.model_provider,
        origin=origin,
    )
    if task:
        task.active_job_id = job.id
        task.updated_at = datetime.now(timezone.utc)
        if origin == "planning":
            task.status = "planning"
        elif origin == "execution":
            task.status = "in_progress"
        else:
            # Jobs manuais legados: se a task ainda não foi planejada, trata como planejamento
            if task.status in ("to_plan", "pending", "planning"):
                task.status = "planning"
            else:
                task.status = "in_progress"
        session.add(task)

    await session.commit()
    await session.refresh(job)

    # Fire-and-forget execution in background with strong reference to prevent GC cancellation
    t = asyncio.create_task(_run_job_background(job.id, req.command, req.timeout))
    _background_job_tasks.add(t)
    t.add_done_callback(_background_job_tasks.discard)
    return job


@router.get("/", response_model=list[JobResponse])
async def list_jobs(session: AsyncSession = Depends(get_session)):
    repo = JobRepository(session)
    return await repo.list_all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, session: AsyncSession = Depends(get_session)):
    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.get("/{job_id}/events")
async def stream_events(job_id: str):
    """SSE endpoint streaming job events with cursor-based reconnection."""

    async def event_generator():
        seen_event_ids: set[str] = set()
        while True:
            async with async_session() as session:
                repo = JobRepository(session)
                # Verify job exists
                job = await repo.get_by_id(job_id)
                if not job:
                    yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                    break

                events = await repo.list_events(job_id)
                for event in events:
                    if event.id in seen_event_ids:
                        continue
                    seen_event_ids.add(event.id)
                    data = {
                        "id": event.id,
                        "event_type": event.event_type,
                        "previous_state": event.previous_state,
                        "new_state": event.new_state,
                        "actor": event.actor,
                        "action": event.action,
                        "details": event.details,
                        "created_at": str(event.created_at),
                    }
                    yield f"id: {event.id}\ndata: {json.dumps(data)}\n\n"

                # If job reached terminal success state, stop streaming after emitting all events
                if job.status == "succeeded":
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/{job_id}/pause", response_model=JobResponse)
async def pause_job(job_id: str, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    try:
        job = await runner.pause_job(job_id)
        await session.commit()
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(job_id: str, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    try:
        job = await runner.retry_job(job_id)
        await session.commit()
        await session.refresh(job)
        # Planning/execution ignoram o shell e rematerializam artefatos; manual usa echo stub.
        retry_cmd = (
            "echo retry-ok"
            if (job.origin or "manual").lower() in ("planning", "execution")
            else "echo '[Retry] Retomando execução do Job'"
        )
        t = asyncio.create_task(_run_job_background(job.id, retry_cmd, 60))
        _background_job_tasks.add(t)
        t.add_done_callback(_background_job_tasks.discard)
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    try:
        job = await runner.cancel_job(job_id)
        await session.commit()
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class ArtifactMeta(BaseModel):
    id: str
    name: str
    artifact_type: str
    size_bytes: int | None = None
    path: str
    qa_status: str = "pending"

    model_config = {"from_attributes": True}


class ArtifactContent(BaseModel):
    name: str
    content: str
    truncated: bool = False


@router.get("/{job_id}/artifacts", response_model=list[ArtifactMeta])
async def list_job_artifacts(job_id: str, session: AsyncSession = Depends(get_session)):
    """Lista artefatos gerados pelo job (plano.md, execucao.md, output.txt)."""
    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    result = await session.execute(
        select(Artifact).where(Artifact.job_id == job_id).order_by(Artifact.created_at.asc())
    )
    arts = list(result.scalars().all())
    # Fallback: arquivos no workspace ainda não registrados
    if not arts and job.workspace_path:
        ws = Path(job.workspace_path)
        if ws.is_dir():
            for fname in ("execucao.md", "plano.md", "output.txt"):
                fp = ws / fname
                if fp.is_file():
                    arts.append(
                        Artifact(
                            id=f"ws-{job_id[:8]}-{fname}",
                            job_id=job_id,
                            task_id=job.task_id,
                            name=fname,
                            artifact_type="markdown" if fname.endswith(".md") else "text",
                            path=str(fp),
                            size_bytes=fp.stat().st_size,
                            qa_status="pending",
                        )
                    )
    return arts


@router.get("/{job_id}/artifacts/{name}/content", response_model=ArtifactContent)
async def get_job_artifact_content(
    job_id: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    """Lê o conteúdo textual de um artefato (resultado da execução)."""
    safe = Path(name).name
    if safe != name or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Nome de artefato inválido")

    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    result = await session.execute(
        select(Artifact).where(Artifact.job_id == job_id, Artifact.name == safe)
    )
    art = result.scalar_one_or_none()
    path: Path | None = None
    if art and art.path:
        path = Path(art.path)
    elif job.workspace_path:
        candidate = Path(job.workspace_path) / safe
        if candidate.is_file():
            path = candidate

    if not path or not path.is_file():
        raise HTTPException(status_code=404, detail=f"Artefato {safe} não encontrado")

    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao ler artefato: {exc}") from exc

    max_chars = 120_000
    truncated = len(raw) > max_chars
    return ArtifactContent(name=safe, content=raw[:max_chars], truncated=truncated)


async def _run_job_background(job_id: str, command: str, timeout: int):
    """Background task to execute a job outside the request lifecycle."""
    async with async_session() as session:
        runner = JobRunner(session)
        try:
            await runner.run(job_id, command, timeout=timeout)
            await session.commit()
        except BaseException as e:
            await session.rollback()
            # Log but don't crash the background task
            print(f"[JobRunner] Background error for {job_id}: {e}")
            print(f"[JobRunner] Background error for {job_id}: {e}")