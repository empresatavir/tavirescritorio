"""Materialização (B0) + avanço de etapas / gates / ledger (B1)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.project import Project
from app.models.factory_run import FactoryRun
from app.models.factory_stage import FactoryStageInstance
from app.modules.factory.esteiras import get_esteira, stage_definitions
from app.modules.factory.sse_hub import factory_sse_hub

CEO_ACTOR = "CEO local"


async def _emit_stage_changed(
    run: FactoryRun,
    stage: FactoryStageInstance,
    *,
    kind: str,
) -> None:
    await factory_sse_hub.publish(
        run.id,
        "stage.changed",
        {
            "run_id": run.id,
            "project_id": run.project_id,
            "stage_id": stage.stage_def_id,
            "stage_instance_id": stage.id,
            "status": stage.status,
            "is_gate": stage.is_gate,
            "kind": kind,
            "current_stage_id": run.current_stage_id,
            "run_status": run.status,
        },
    )


async def _emit_event_appended(run: FactoryRun, entry: dict) -> None:
    await factory_sse_hub.publish(
        run.id,
        "event.appended",
        {
            "id": entry.get("id"),
            "run_id": run.id,
            "project_id": run.project_id,
            "kind": entry.get("kind"),
            "action": entry.get("action"),
            "title": entry.get("title"),
            "actor": entry.get("actor"),
            "note": entry.get("note"),
            "stage_def_id": entry.get("stage_def_id"),
            "occurred_at": entry.get("at"),
        },
    )


class StageTransitionError(ValueError):
    """Transição inválida de etapa."""


async def get_active_run(session: AsyncSession, project_id: str) -> FactoryRun | None:
    result = await session.execute(
        select(FactoryRun)
        .where(FactoryRun.project_id == project_id)
        .where(FactoryRun.status.in_(("running", "paused")))
        .order_by(FactoryRun.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def get_latest_run(session: AsyncSession, project_id: str) -> FactoryRun | None:
    result = await session.execute(
        select(FactoryRun)
        .where(FactoryRun.project_id == project_id)
        .order_by(FactoryRun.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def list_stages(session: AsyncSession, run_id: str) -> list[FactoryStageInstance]:
    result = await session.execute(
        select(FactoryStageInstance)
        .where(FactoryStageInstance.run_id == run_id)
        .order_by(FactoryStageInstance.sort_order)
    )
    return list(result.scalars().all())


async def materialize_run_for_project(
    session: AsyncSession,
    project: Project,
    *,
    template_code: str | None = None,
) -> FactoryRun:
    """Cria run + stages a partir da esteira. Idempotente se já houver run ativo."""
    existing = await get_active_run(session, project.id)
    if existing:
        return existing

    code = (template_code or project.template_code or "lp-c").strip().lower()
    esteira = get_esteira(code)
    defs = stage_definitions(code)
    if not defs:
        raise ValueError(f"Esteira desconhecida: {code}")

    run_id = str(uuid.uuid4())
    first = defs[0]
    first_status = "awaiting_gate" if first.get("gate") else "running"
    now = datetime.now(timezone.utc)

    run = FactoryRun(
        id=run_id,
        project_id=project.id,
        template_code=code,
        status="running",
        current_stage_id=first["id"],
        workspace_path=project.local_path,
        meta={
            "esteira_name": esteira["name"] if esteira else code,
            "total_stages": len(defs),
            "ledger": [
                {
                    "id": str(uuid.uuid4()),
                    "at": now.isoformat(),
                    "kind": "system",
                    "action": "run_started",
                    "stage_def_id": first["id"],
                    "title": first["title"],
                    "actor": "Sistema",
                    "note": f"Run materializado · esteira {code}",
                }
            ],
        },
    )
    session.add(run)

    for i, d in enumerate(defs):
        if i == 0:
            st = first_status
        else:
            st = "queued"
        session.add(
            FactoryStageInstance(
                id=str(uuid.uuid4()),
                run_id=run_id,
                project_id=project.id,
                stage_def_id=d["id"],
                code=d["code"],
                title=d["title"],
                sort_order=i + 1,
                agent=d.get("agent"),
                agent_role=d.get("agent_role"),
                is_gate=bool(d.get("gate")),
                topology=d.get("topology"),
                status=st,
                expected_artifacts=d.get("expected_artifacts") or [],
                started_at=now if i == 0 else None,
            )
        )

    project.template_code = code
    project.total_stages = len(defs)
    project.stages_done = 0
    if project.status in (None, "", "active"):
        project.status = "running"

    _append_project_event(
        project,
        "Sistema",
        f"Run iniciado · {code} · etapa atual: {first['title']}",
    )

    await session.flush()

    # Snapshot SSE para assinantes já conectados (raro no create)
    ledger0 = (run.meta or {}).get("ledger") or []
    if ledger0:
        await _emit_event_appended(run, ledger0[0])
    first_inst = None
    stages_created = await list_stages(session, run_id)
    if stages_created:
        first_inst = stages_created[0]
        await _emit_stage_changed(run, first_inst, kind="current")

    return run


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _append_ledger(
    run: FactoryRun,
    *,
    kind: str,
    action: str,
    stage: FactoryStageInstance,
    actor: str,
    note: str | None = None,
) -> dict:
    meta = dict(run.meta or {})
    ledger = list(meta.get("ledger") or [])
    entry = {
        "id": str(uuid.uuid4()),
        "at": _now().isoformat(),
        "kind": kind,
        "action": action,
        "stage_def_id": stage.stage_def_id,
        "title": stage.title,
        "actor": actor,
        "note": note,
    }
    ledger.append(entry)
    meta["ledger"] = ledger
    run.meta = meta
    flag_modified(run, "meta")
    return entry


def _append_project_event(project: Project, actor: str, message: str) -> None:
    stamp = datetime.now().strftime("%d/%m %H:%M")
    log = list(project.event_log) if project.event_log else []
    # event_log pode ser lista de listas (seed) — normaliza
    log.append([stamp, actor, message])
    project.event_log = log
    flag_modified(project, "event_log")


def _sync_stages_done(project: Project, stages: list[FactoryStageInstance]) -> None:
    done = sum(1 for s in stages if s.status == "done")
    project.stages_done = done
    project.total_stages = len(stages)


def _find_stage(
    stages: list[FactoryStageInstance], stage_def_id: str
) -> FactoryStageInstance:
    for s in stages:
        if s.stage_def_id == stage_def_id:
            return s
    raise StageTransitionError(f"Etapa '{stage_def_id}' não encontrada neste run")


def _activate_next(
    run: FactoryRun,
    stages: list[FactoryStageInstance],
    current: FactoryStageInstance,
) -> FactoryStageInstance | None:
    nxt = next((s for s in stages if s.sort_order > current.sort_order), None)
    if not nxt:
        run.current_stage_id = None
        run.status = "done"
        return None
    nxt.status = "awaiting_gate" if nxt.is_gate else "running"
    nxt.started_at = _now()
    run.current_stage_id = nxt.stage_def_id
    run.status = "running"
    return nxt


async def authorize_gate(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str,
    *,
    actor: str = CEO_ACTOR,
    note: str | None = None,
) -> dict:
    """CEO autoriza gate em awaiting_gate → done e avança."""
    if run.status not in ("running", "paused"):
        raise StageTransitionError(f"Run não está ativo (status={run.status})")

    stages = await list_stages(session, run.id)
    stage = _find_stage(stages, stage_def_id)

    if not stage.is_gate:
        raise StageTransitionError("authorize só se aplica a gates; use complete")
    if stage.status != "awaiting_gate":
        raise StageTransitionError(
            f"Gate '{stage_def_id}' não está aguardando autorização (status={stage.status})"
        )
    if run.current_stage_id and run.current_stage_id != stage_def_id:
        raise StageTransitionError(
            f"Gate atual é '{run.current_stage_id}', não '{stage_def_id}'"
        )

    stage.status = "done"
    stage.finished_at = _now()
    entry = _append_ledger(
        run,
        kind="gate",
        action="authorized",
        stage=stage,
        actor=actor,
        note=note or "Gate autorizado",
    )
    _append_project_event(project, actor, f"Gate autorizado: {stage.title}")

    nxt = _activate_next(run, stages, stage)
    _sync_stages_done(project, stages)
    completed_entry = None
    if nxt is None:
        project.status = "done"
        completed_entry = _append_ledger(
            run,
            kind="system",
            action="run_completed",
            stage=stage,
            actor="Sistema",
            note="Esteira concluída",
        )
        _append_project_event(project, "Sistema", "Esteira concluída · Gate Final")
    elif nxt.is_gate:
        _append_project_event(project, "Sistema", f"Aguardando gate: {nxt.title}")
    else:
        _append_project_event(project, "Sistema", f"Etapa em execução: {nxt.title}")

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="done")
    if nxt:
        await _emit_stage_changed(run, nxt, kind="current")
    if completed_entry:
        await _emit_event_appended(run, completed_entry)

    return serialize_run(run, stages) | {"last_ledger": entry}


async def complete_stage(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str,
    *,
    actor: str | None = None,
    note: str | None = None,
    artifact_hash: str | None = None,
) -> dict:
    """Conclui etapa em running (não-gate ou trabalho pós-liberação)."""
    if run.status not in ("running", "paused"):
        raise StageTransitionError(f"Run não está ativo (status={run.status})")

    stages = await list_stages(session, run.id)
    stage = _find_stage(stages, stage_def_id)

    if stage.is_gate:
        raise StageTransitionError("Gates usam authorize, não complete")
    if stage.status != "running":
        raise StageTransitionError(
            f"Etapa '{stage_def_id}' não está em execução (status={stage.status})"
        )
    if run.current_stage_id and run.current_stage_id != stage_def_id:
        raise StageTransitionError(
            f"Etapa atual é '{run.current_stage_id}', não '{stage_def_id}'"
        )

    who = actor or stage.agent or "Agente"
    stage.status = "done"
    stage.finished_at = _now()
    if artifact_hash:
        stage.artifact_hash = artifact_hash

    entry = _append_ledger(
        run,
        kind="stage",
        action="completed",
        stage=stage,
        actor=who,
        note=note or "Etapa concluída",
    )
    _append_project_event(project, who, f"Etapa concluída: {stage.title}")

    nxt = _activate_next(run, stages, stage)
    _sync_stages_done(project, stages)
    completed_entry = None
    if nxt is None:
        project.status = "done"
        completed_entry = _append_ledger(
            run,
            kind="system",
            action="run_completed",
            stage=stage,
            actor="Sistema",
            note="Esteira concluída",
        )
        _append_project_event(project, "Sistema", "Esteira concluída")
    elif nxt.is_gate:
        _append_project_event(project, "Sistema", f"Aguardando gate: {nxt.title}")
    else:
        _append_project_event(project, "Sistema", f"Etapa em execução: {nxt.title}")

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="done")
    if nxt:
        await _emit_stage_changed(run, nxt, kind="current")
    if completed_entry:
        await _emit_event_appended(run, completed_entry)

    return serialize_run(run, stages) | {"last_ledger": entry}


async def fail_stage(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str,
    *,
    actor: str | None = None,
    note: str | None = None,
) -> dict:
    """Marca etapa atual como failed e pausa o run."""
    if run.status == "done":
        raise StageTransitionError("Run já concluído")

    stages = await list_stages(session, run.id)
    stage = _find_stage(stages, stage_def_id)

    if stage.status not in ("running", "awaiting_gate", "blocked"):
        raise StageTransitionError(
            f"Não é possível falhar etapa em status={stage.status}"
        )
    if run.current_stage_id and run.current_stage_id != stage_def_id:
        raise StageTransitionError(
            f"Etapa atual é '{run.current_stage_id}', não '{stage_def_id}'"
        )

    who = actor or stage.agent or "Sistema"
    stage.status = "failed"
    stage.finished_at = _now()
    run.status = "paused"
    project.status = "paused"

    entry = _append_ledger(
        run,
        kind="stage",
        action="failed",
        stage=stage,
        actor=who,
        note=note or "Etapa falhou",
    )
    _append_project_event(project, who, f"Etapa falhou: {stage.title}" + (f" · {note}" if note else ""))

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="failed")

    return serialize_run(run, stages) | {"last_ledger": entry}


def get_ledger(run: FactoryRun) -> list[dict]:
    meta = run.meta or {}
    return list(meta.get("ledger") or [])


def _dt(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def serialize_stage(st: FactoryStageInstance) -> dict:
    return {
        "id": st.id,
        "stage_def_id": st.stage_def_id,
        "code": st.code,
        "title": st.title,
        "sort_order": st.sort_order,
        "agent": st.agent,
        "agent_role": st.agent_role,
        "is_gate": st.is_gate,
        "topology": st.topology,
        "status": st.status,
        "expected_artifacts": st.expected_artifacts or [],
        "artifact_hash": st.artifact_hash,
        "started_at": _dt(st.started_at),
        "finished_at": _dt(st.finished_at),
    }


def serialize_run(run: FactoryRun, stages: list[FactoryStageInstance]) -> dict:
    return {
        "id": run.id,
        "project_id": run.project_id,
        "template_code": run.template_code,
        "status": run.status,
        "current_stage_id": run.current_stage_id,
        "workspace_path": run.workspace_path,
        "meta": run.meta or {},
        "ledger": get_ledger(run),
        "stages": [serialize_stage(s) for s in stages],
        "stages_done": sum(1 for s in stages if s.status == "done"),
        "total_stages": len(stages),
        "created_at": _dt(run.created_at),
        "updated_at": _dt(run.updated_at),
    }
