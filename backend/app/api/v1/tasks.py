"""Tasks API router — CRUD and kanban status transitions for operational tasks."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from pathlib import Path
import re
import uuid

from sqlalchemy import select
from app.shared.database import get_session
from app.modules.tasks.repository import TaskRepository
from app.models.task import Task
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.job import Job

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

ATTACHMENTS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "workspaces" / "task-attachments"
ALLOWED_ATTACHMENT_EXT = {".pdf", ".txt", ".md"}
MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024  # 8 MB


VALID_TASK_STATUSES = {
    "to_plan",
    "planning",
    "planned",
    "in_progress",
    "done",
    # legados aceitos na entrada e normalizados
    "pending",
}


def normalize_task_status(status: str | None) -> str:
    raw = (status or "to_plan").strip().lower()
    if raw in ("pending", "todo"):
        return "to_plan"
    if raw in ("completed", "succeeded"):
        return "done"
    if raw in VALID_TASK_STATUSES and raw != "pending":
        return raw
    return "to_plan"


class CreateTaskRequest(BaseModel):
    project_id: str = "tavir-core"
    title: str
    description: str | None = None
    status: str = "to_plan"
    priority: str = "medium"
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    seq: int | None = None
    depends_on: list[Any] | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    active_job_id: str | None = None
    depends_on: list[Any] | None = None


class TaskResponse(BaseModel):
    id: str
    seq: int | None = None
    project_id: str
    title: str
    description: str | None = None
    status: str
    priority: str
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    depends_on: Any | None = None
    active_job_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _normalize_depends_on(raw: list[Any] | None) -> list[str]:
    if not raw:
        return []
    out: list[str] = []
    for item in raw:
        if item is None or item == "":
            continue
        s = str(item).strip()
        s = s.lstrip("#")
        if not s:
            continue
        # Aceita seq numérico ou id de task
        out.append(s)
    # unique preserve order
    seen: set[str] = set()
    uniq: list[str] = []
    for d in out:
        if d not in seen:
            seen.add(d)
            uniq.append(d)
    return uniq


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^\w.\- ]+", "_", base).strip() or "anexo"
    return cleaned[:180]


def _sync_task_to_office_kanban(title: str, description: str | None, agent_id: str | None, seq: int | None = None, depends_on: list[Any] | None = None) -> tuple[str | None, int | None]:
    try:
        import sys
        from pathlib import Path
        agencia_dir = None
        for parent in Path(__file__).resolve().parents:
            ag = parent / "AgenciaIA"
            if ag.exists() and (ag / "tools" / "office.py").exists():
                agencia_dir = ag
                break
        if agencia_dir and str(agencia_dir) not in sys.path:
            sys.path.insert(0, str(agencia_dir))
        from tools import office
        
        base_slug = office.slug(title)
        cols = office.kan_load()
        candidate = base_slug
        count = 1
        while office.kan_achar(cols, candidate)[0]:
            suffix = f"-{seq}" if seq and count == 1 else f"-{count}"
            candidate = f"{base_slug[:max(1, 20-len(suffix))]}{suffix}".strip("-")
            count += 1

        slug, erro = office.kan_add(
            titulo=title,
            s=candidate,
            contexto=description or "",
            agente=agent_id or "",
            depends_on=depends_on,
        )
        if erro:
            print(f"[tasks.py] Warning: office.kan_add error: {erro}")
            return None, None

        cols_after = office.kan_load()
        _, it = office.kan_achar(cols_after, slug)
        assigned_num = it.get("numero") if it else None
        return slug, assigned_num
    except Exception as exc:
        print(f"[tasks.py] Warning: could not sync to office kanban: {exc}")
        return None, None


def _parse_iso_datetime(val: str | datetime | None) -> datetime | None:
    if val is None or isinstance(val, datetime):
        return val
    val_str = str(val).strip()
    if " " in val_str and "+" not in val_str:
        val_str = val_str.replace(" ", "+")
    try:
        if val_str.endswith("Z"):
            val_str = val_str[:-1] + "+00:00"
        return datetime.fromisoformat(val_str)
    except Exception:
        return None


def _to_response(task: Task) -> TaskResponse:
    data = TaskResponse.model_validate(task)
    data.status = normalize_task_status(data.status)
    return data


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    project_id: str | None = Query(None),
    updated_since: str | None = Query(None),
    since: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    raw_cutoff = since if since is not None else updated_since
    cutoff = _parse_iso_datetime(raw_cutoff)
    repo = TaskRepository(session)
    # Filtro por status: aceita alias legado "pending" == "to_plan"
    status_filter = normalize_task_status(status) if status else None
    if status == "pending":
        status_filter = "to_plan"
    rows = await repo.list_all(status=status_filter, priority=priority, project_id=project_id, updated_since=cutoff)
    # Inclui legados "pending" quando filtramos to_plan
    if status_filter == "to_plan":
        legacy = await repo.list_all(status="pending", priority=priority, project_id=project_id, updated_since=cutoff)
        seen = {r.id for r in rows}
        rows = list(rows) + [r for r in legacy if r.id not in seen]
    return [_to_response(t) for t in rows]


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(req: CreateTaskRequest, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    depends = _normalize_depends_on(req.depends_on)
    tags = list(req.tags) if isinstance(req.tags, list) else ([] if not req.tags else [req.tags])
    # Espelha depends em tags para visibilidade legada
    tags = [t for t in tags if not str(t).startswith("depends:#") and not str(t).startswith("depends_on:")]
    for d in depends:
        tags.append(f"depends:#{d}")

    # Seq sempre pelo backend (ignora reserva do cliente)
    task = Task(
        id=str(uuid.uuid4()),
        project_id=req.project_id,
        title=req.title,
        description=req.description,
        status=normalize_task_status(req.status),
        priority=req.priority,
        assignee_agent_id=req.assignee_agent_id,
        sector=req.sector,
        escalation=req.escalation,
        handoffs=req.handoffs,
        gates=req.gates,
        tags=tags,
        depends_on=depends or None,
        seq=None,
    )
    await repo.create(task)
    await session.commit()
    await session.refresh(task)

    # Mirror into SQLite kanban_cards and PENDENTES.md via office.py
    office_slug, assigned_num = _sync_task_to_office_kanban(
        task.title, task.description, task.assignee_agent_id, task.seq, depends_on=depends or None
    )
    if assigned_num:
        task.seq = assigned_num
        await session.commit()
        await session.refresh(task)

    return _to_response(task)


@router.post("/{task_id}/attachments", response_model=TaskResponse)
async def upload_task_attachment(
    task_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    """Salva anexo (pdf/txt/md) no workspace da task e registra em tags."""
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    original = file.filename or "anexo.txt"
    safe = _safe_filename(original)
    ext = Path(safe).suffix.lower()
    if ext not in ALLOWED_ATTACHMENT_EXT:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use PDF, TXT ou Markdown.")

    content = await file.read()
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=400, detail="Arquivo maior que 8 MB.")

    dest_dir = ATTACHMENTS_ROOT / task_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / safe
    # Evita sobrescrita acidental
    if dest.exists():
        stem, suffix = dest.stem, dest.suffix
        dest = dest_dir / f"{stem}-{uuid.uuid4().hex[:6]}{suffix}"
        safe = dest.name
    dest.write_bytes(content)

    tags = list(task.tags) if isinstance(task.tags, list) else []
    tags = [t for t in tags if not str(t).startswith("file:") and not str(t).startswith("file_path:")]
    tags.append(f"file:{safe}")
    tags.append(f"file_path:{dest.as_posix()}")
    task.tags = tags
    await session.commit()
    await session.refresh(task)
    return _to_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return _to_response(task)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    req: UpdateTaskStatusRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    req.status = normalize_task_status(req.status)

    if req.status == "done":
        office = None
        try:
            import sys
            from pathlib import Path
            for parent in Path(__file__).resolve().parents:
                ag = parent / "AgenciaIA"
                if ag.exists() and (ag / "tools" / "office.py").exists():
                    if str(ag) not in sys.path:
                        sys.path.insert(0, str(ag))
                    from tools import office as _off
                    office = _off
                    break
        except Exception:
            office = None

        if office:
            cols = office.kan_load()
            k_item = None
            if task.seq:
                _, k_item = office.kan_achar_numero(cols, task.seq)
            if not k_item:
                target_slug = office.slug(task.title)
                _, k_item = office.kan_achar(cols, target_slug)
            if not k_item:
                for c_items in cols.values():
                    for it in c_items:
                        if it.get("titulo") == task.title:
                            k_item = it
                            break
                    if k_item:
                        break

            if k_item:
                import re
                slug_card = k_item.get("slug")
                _, aviso_done = office.kan_done(slug_card, obs="Conclusão via Tasks API")
                if aviso_done and "ainda está" in aviso_done:
                    raise HTTPException(
                        status_code=409,
                        detail=aviso_done,
                    )
                alt_id = None
                m_alt = re.search(r"\b(ALT-\d+)\b", aviso_done or "")
                if m_alt:
                    alt_id = m_alt.group(1)
                else:
                    cols_done = office.kan_load()
                    _, it_done = office.kan_achar(cols_done, slug_card)
                    if it_done:
                        alt_id = it_done.get("alteracao_id")

                if alt_id:
                    appr_id = f"ap-{alt_id.lower()}"
                    existing_app = await session.get(Approval, appr_id)
                    if not existing_app:
                        new_app = Approval(
                            id=appr_id,
                            title=f"Gate de Alterações: {task.title}",
                            type="alteracao",
                            task_id=task.id,
                            requester_agent_id=task.assignee_agent_id or "pm-projetos",
                            status="pending",
                            impact="high",
                            reason=f"Solicitação {alt_id} criada via kan_done aguardando homologação em Alterações",
                            description="Conclusão automatizada de todas as fases. Homologue no painel de Alterações.",
                            on_approve_text="Aprovar e homologar merge",
                            on_reject_text="Rejeitar solicitação",
                        )
                        session.add(new_app)

    task = await repo.update_status(task_id, req.status)
    await session.commit()
    await session.refresh(task)
    return _to_response(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    req: UpdateTaskRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TaskRepository(session)
    updates = req.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] is not None:
        updates["status"] = normalize_task_status(updates["status"])
    if "depends_on" in updates:
        updates["depends_on"] = _normalize_depends_on(updates["depends_on"]) or None
    task = await repo.update(task_id, **updates)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    await session.commit()
    await session.refresh(task)
    return _to_response(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    deleted = await repo.delete(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    await session.commit()
    return None


class TaskArtifactMeta(BaseModel):
    id: str
    name: str
    artifact_type: str
    size_bytes: int | None = None
    job_id: str | None = None
    path: str = ""


class TaskArtifactBundle(BaseModel):
    task_id: str
    job_id: str | None = None
    artifacts: list[TaskArtifactMeta]


class TaskArtifactContent(BaseModel):
    name: str
    content: str
    truncated: bool = False
    job_id: str | None = None


async def _resolve_task_artifacts(session: AsyncSession, task_id: str) -> tuple[str | None, list[Artifact]]:
    """Artefatos da task: prioriza job de execução mais recente, senão qualquer job vinculado."""
    by_task = await session.execute(
        select(Artifact).where(Artifact.task_id == task_id).order_by(Artifact.created_at.desc())
    )
    arts = list(by_task.scalars().all())
    if arts:
        return arts[0].job_id, list(reversed(arts))

    jobs_res = await session.execute(
        select(Job).where(Job.task_id == task_id).order_by(Job.created_at.desc())
    )
    jobs = list(jobs_res.scalars().all())
    preferred = next((j for j in jobs if (j.origin or "") == "execution"), None) or (jobs[0] if jobs else None)
    if not preferred:
        return None, []

    job_arts = await session.execute(
        select(Artifact).where(Artifact.job_id == preferred.id).order_by(Artifact.created_at.asc())
    )
    arts = list(job_arts.scalars().all())
    if not arts and preferred.workspace_path:
        ws = Path(preferred.workspace_path)
        if ws.is_dir():
            for fname in ("execucao.md", "plano.md", "output.txt"):
                fp = ws / fname
                if fp.is_file():
                    arts.append(
                        Artifact(
                            id=f"ws-{preferred.id[:8]}-{fname}",
                            job_id=preferred.id,
                            task_id=task_id,
                            name=fname,
                            artifact_type="markdown" if fname.endswith(".md") else "text",
                            path=str(fp),
                            size_bytes=fp.stat().st_size,
                            qa_status="pending",
                        )
                    )
    return preferred.id, arts


@router.get("/{task_id}/artifacts", response_model=TaskArtifactBundle)
async def list_task_artifacts(task_id: str, session: AsyncSession = Depends(get_session)):
    """Lista artefatos/resultado da task (execucao.md, plano.md, output.txt)."""
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    job_id, arts = await _resolve_task_artifacts(session, task_id)
    return TaskArtifactBundle(
        task_id=task_id,
        job_id=job_id,
        artifacts=[
            TaskArtifactMeta(
                id=a.id,
                name=a.name,
                artifact_type=a.artifact_type,
                size_bytes=a.size_bytes,
                job_id=a.job_id,
                path=a.path or "",
            )
            for a in arts
        ],
    )


@router.get("/{task_id}/artifacts/{name}/content", response_model=TaskArtifactContent)
async def get_task_artifact_content(
    task_id: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    safe = Path(name).name
    if safe != name or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Nome de artefato inválido")
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    job_id, arts = await _resolve_task_artifacts(session, task_id)
    art = next((a for a in arts if a.name == safe), None)
    if not art or not art.path:
        raise HTTPException(status_code=404, detail=f"Artefato {safe} não encontrado")
    path = Path(art.path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo {safe} ausente no disco")
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao ler artefato: {exc}") from exc
    max_chars = 120_000
    truncated = len(raw) > max_chars
    return TaskArtifactContent(
        name=safe,
        content=raw[:max_chars],
        truncated=truncated,
        job_id=job_id or art.job_id,
    )
