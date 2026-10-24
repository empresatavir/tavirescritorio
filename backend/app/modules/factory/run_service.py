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

    ai = dict(getattr(project, "ai_settings", None) or {})
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
            # Defaults até o CEO redefinir na engrenagem do projeto
            "model": ai.get("model") or "claude-opus-5-5",
            "effort": ai.get("effort") or "xhigh",
            "provider": ai.get("provider") or "ghostcli",
            "orchestration": [
                "dora",
                "marina_yuri",
                "ari",
                "paula",
                "ceo_plan_gate",
                "execution",
            ],
            "ledger": [
                {
                    "id": str(uuid.uuid4()),
                    "at": now.isoformat(),
                    "kind": "system",
                    "action": "run_started",
                    "stage_def_id": first["id"],
                    "title": first["title"],
                    "actor": "Sistema",
                    "note": (
                        f"Run materializado · esteira {code} · "
                        "modelo claude-opus-5-5 · esforço xhigh"
                    ),
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
    _sync_pendencies(project, stages_created, run)
    if stages_created:
        first_inst = stages_created[0]
        await _emit_stage_changed(run, first_inst, kind="current")

    return run


def _replacement_stage_id(old_id: str, missing_ids: list[str]) -> str | None:
    """Etapa combinada antiga abre no especialista de backend, depois no de frontend."""
    prefer = {
        "m_code": ("m_code_be", "build_be"),
        "qa": ("qa_be",),
        "m_qa": ("m_qa_be",),
    }.get(old_id, ())
    for candidate in prefer:
        if candidate in missing_ids:
            return candidate
    return missing_ids[0] if missing_ids else None


async def align_run_to_esteira(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
) -> bool:
    """Copia a esteira canônica para o run já aberto.

    Backend fica com Diego Sistemas. Frontend fica com Dev Frontend.
    QA de back fica com Tester Automatizado. QA de frente fica com Validador Visual.
    Etapa antiga ainda não concluída é trocada. Etapa concluída permanece.
    """
    defs = stage_definitions(run.template_code or project.template_code or "")
    if not defs:
        return False

    stages = await list_stages(session, run.id)
    by_id = {stage.stage_def_id: stage for stage in stages}
    canon_ids = {item["id"] for item in defs}
    obsolete = [stage for stage in stages if stage.stage_def_id not in canon_ids]
    missing = [item for item in defs if item["id"] not in by_id]
    can_replace = bool(obsolete) and all(stage.status != "done" for stage in obsolete)
    changed = False

    if can_replace:
        old_current = next((stage for stage in obsolete if stage.stage_def_id == run.current_stage_id), None)
        for stage in obsolete:
            await session.delete(stage)
        await session.flush()
        for stage in obsolete:
            by_id.pop(stage.stage_def_id, None)
        missing_ids = [item["id"] for item in missing]
        replacement = (
            _replacement_stage_id(old_current.stage_def_id, missing_ids) if old_current else None
        )
        old_status = old_current.status if old_current else "queued"
        changed = True
    else:
        replacement = None
        old_status = "queued"

    for index, item in enumerate(defs):
        stage = by_id.get(item["id"])
        if stage is None:
            if not can_replace:
                continue
            status = "queued"
            started = None
            if item["id"] == replacement:
                status = old_status if old_status in ("running", "failed", "awaiting_gate") else "running"
                started = _now()
                run.current_stage_id = item["id"]
            session.add(
                FactoryStageInstance(
                    id=str(uuid.uuid4()),
                    run_id=run.id,
                    project_id=project.id,
                    stage_def_id=item["id"],
                    code=item["code"],
                    title=item["title"],
                    sort_order=index + 1,
                    agent=item.get("agent"),
                    agent_role=item.get("agent_role"),
                    is_gate=bool(item.get("gate")),
                    topology=item.get("topology"),
                    status=status,
                    expected_artifacts=list(item.get("expected_artifacts") or []),
                    started_at=started,
                )
            )
            changed = True
            continue

        fields = {
            "code": item["code"],
            "title": item["title"],
            "agent": item.get("agent"),
            "agent_role": item.get("agent_role"),
            "is_gate": bool(item.get("gate")),
            "topology": item.get("topology"),
            "sort_order": index + 1,
        }
        for key, value in fields.items():
            if getattr(stage, key) != value:
                setattr(stage, key, value)
                changed = True
        if stage.status != "done":
            artifacts = list(item.get("expected_artifacts") or [])
            if list(stage.expected_artifacts or []) != artifacts:
                stage.expected_artifacts = artifacts
                flag_modified(stage, "expected_artifacts")
                changed = True

    if not changed:
        return False

    if can_replace or not obsolete:
        project.total_stages = len(defs)
    meta = dict(run.meta or {})
    meta["total_stages"] = project.total_stages
    if can_replace:
        ledger = list(meta.get("ledger") or [])
        ledger.append(
            {
                "id": str(uuid.uuid4()),
                "at": _now().isoformat(),
                "kind": "system",
                "action": "stages_aligned",
                "stage_def_id": run.current_stage_id,
                "title": "Especialistas",
                "actor": "Sistema",
                "note": (
                    "A esteira separou as funções. "
                    "Diego Sistemas faz o backend. Dev Frontend faz o frontend. "
                    "Tester Automatizado valida o back. Validador Visual valida a frente."
                ),
            }
        )
        meta["ledger"] = ledger
    run.meta = meta
    flag_modified(run, "meta")
    await session.flush()
    stages_now = await list_stages(session, run.id)
    _sync_pendencies(project, stages_now, run)
    _sync_stages_done(project, stages_now)
    await session.commit()
    await session.refresh(run)
    await session.refresh(project)
    return True


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


def build_pendencies(
    stages: list[FactoryStageInstance],
    run: FactoryRun,
) -> list[dict]:
    """Pendências derivadas do run (gates + falhas) — B3."""
    meta = run.meta or {}
    last_fail = meta.get("last_fail") or {}
    pends: list[dict] = []
    for s in stages:
        if s.status == "awaiting_gate":
            pends.append(
                {
                    "id": f"gate-{s.stage_def_id}",
                    "kind": "auth",
                    "title": f"Gate · {s.title}",
                    "from": CEO_ACTOR,
                    "text": f"Autorize a etapa {s.code} ({s.title}) para continuar a esteira.",
                    "stage_def_id": s.stage_def_id,
                    "action": "authorize",
                }
            )
        elif s.status == "failed":
            note = None
            if last_fail.get("stage_def_id") == s.stage_def_id:
                note = last_fail.get("note")
            pends.append(
                {
                    "id": f"fail-{s.stage_def_id}",
                    "kind": "error",
                    "title": f"Falha · {s.title}",
                    "from": s.agent or "Sistema",
                    "text": "Retome a etapa após corrigir a causa da falha.",
                    "cause": note,
                    "stage_def_id": s.stage_def_id,
                    "action": "resume",
                }
            )
    return pends


def _sync_pendencies(
    project: Project,
    stages: list[FactoryStageInstance],
    run: FactoryRun,
) -> None:
    project.pendencies = build_pendencies(stages, run)
    flag_modified(project, "pendencies")


def _find_stage(
    stages: list[FactoryStageInstance], stage_def_id: str
) -> FactoryStageInstance:
    for s in stages:
        if s.stage_def_id == stage_def_id:
            return s
    raise StageTransitionError(
        f"Etapa '{stage_def_id}' não encontrada neste run. "
        "Se a esteira foi separada, atualize a tela. "
        "Diego Sistemas faz o backend. Dev Frontend faz o frontend. "
        "Tester Automatizado valida o back. Validador Visual valida a frente."
    )


def _activate_next(
    run: FactoryRun,
    stages: list[FactoryStageInstance],
    current: FactoryStageInstance,
) -> FactoryStageInstance | None:
    nxt = next(
        (s for s in stages if s.sort_order > current.sort_order and s.status != "done"),
        None,
    )
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

    if await align_run_to_esteira(session, run, project):
        await session.refresh(run)

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

    if _delivery_paths(run, stage) and not stage.artifact_hash:
        from app.modules.factory.executor import execute_stage

        await execute_stage(
            session,
            run,
            project,
            stage.stage_def_id,
            actor=stage.agent or actor,
            note="Entrega do agente antes da autorização",
        )
        await session.refresh(run)
        stages = await list_stages(session, run.id)
        stage = _find_stage(stages, stage_def_id)
    if _delivery_paths(run, stage) and not stage.artifact_hash:
        raise StageTransitionError(
            "O agente ainda não entregou o relatório deste gate. Gere o documento antes de autorizar."
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
    _sync_pendencies(project, stages, run)
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
        _sync_pendencies(project, stages, run)
    elif nxt.is_gate:
        _append_project_event(project, "Sistema", f"Aguardando gate: {nxt.title}")
    else:
        _append_project_event(project, "Sistema", f"Etapa em execução: {nxt.title}")

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    _sync_pendencies(project, stages, run)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="done")
    if nxt:
        await _emit_stage_changed(run, nxt, kind="current")
    if completed_entry:
        await _emit_event_appended(run, completed_entry)

    return serialize_run(run, stages) | {"last_ledger": entry}


async def _rewind_if_quality_failed(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stages: list[FactoryStageInstance],
    stage: FactoryStageInstance,
    *,
    actor: str | None,
) -> dict | None:
    """QA ou segurança reprovada abre issue e devolve o trabalho ao desenvolvedor."""
    from app.modules.factory.artifacts import ArtifactError, resolve_workspace_root
    from app.modules.factory.quality_loop import (
        MAX_LOOPS,
        quality_kind,
        read_verdict,
        report_path,
        rework_target,
        side_stage_ids,
        write_issue,
    )

    kind = quality_kind(stage.stage_def_id)
    if not kind:
        return None

    text = ""
    root = None
    try:
        root = resolve_workspace_root(project.local_path)
        report = root / report_path(kind, stage.stage_def_id)
        if report.is_file():
            text = report.read_text(encoding="utf-8", errors="replace")
    except (ArtifactError, OSError):
        text = ""

    if read_verdict(text, kind) == "aprovado":
        return None

    meta = dict(run.meta or {})
    loops = dict(meta.get("quality_loops") or {})
    count = int(loops.get(stage.stage_def_id) or 0) + 1
    loops[stage.stage_def_id] = count
    meta["quality_loops"] = loops
    run.meta = meta
    flag_modified(run, "meta")

    who = actor or stage.agent or "Agente"
    if count >= MAX_LOOPS:
        stage.status = "failed"
        stage.finished_at = _now()
        run.status = "paused"
        project.status = "paused"
        note = (
            f"O ciclo de {kind} parou após {count} reprovações. "
            "Leia a issue e peça para refazer a etapa."
        )
        entry = _append_ledger(
            run, kind="stage", action="failed", stage=stage, actor=who, note=note
        )
        _append_project_event(project, who, note)
        _sync_pendencies(project, stages, run)
        await session.flush()
        await session.refresh(run)
        stages = await list_stages(session, run.id)
        await _emit_event_appended(run, entry)
        await _emit_stage_changed(run, stage, kind="failed")
        return serialize_run(run, stages) | {"last_ledger": entry, "quality_loop": "stopped"}

    issue = ""
    if root is not None:
        try:
            issue = write_issue(root, kind, text)
        except OSError:
            issue = ""

    target = rework_target(stages, stage)
    if target is None:
        raise StageTransitionError("Não há etapa de implementação para consumir a issue.")

    now = _now()
    side = side_stage_ids(stage.stage_def_id)
    for item in stages:
        if side is not None:
            if item.stage_def_id not in side or item.sort_order > stage.sort_order:
                continue
        elif item.sort_order < target.sort_order or item.sort_order > stage.sort_order:
            continue
        item.finished_at = None
        item.artifact_hash = None
        if item.stage_def_id == target.stage_def_id:
            item.status = "running"
            item.started_at = now
        else:
            item.status = "queued"
            item.started_at = None

    run.current_stage_id = target.stage_def_id
    run.status = "running"
    project.status = "running"
    label = "QA" if kind == "qa" else "segurança"
    owner = target.agent or "O especialista"
    if kind == "security":
        note = (
            f"Segurança reprovada. Issue {issue or 'sem arquivo'}. "
            "A implementação volta ao início. Os QAs testam de novo."
        )
    else:
        note = (
            f"{label} reprovada. Issue {issue or 'sem arquivo'}. "
            f"{owner} precisa corrigir. O teste desse lado roda de novo."
        )
    entry = _append_ledger(
        run, kind="stage", action="rework", stage=stage, actor=who, note=note
    )
    _append_project_event(project, who, note)
    _sync_stages_done(project, stages)
    _sync_pendencies(project, stages, run)
    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, target, kind="current")
    return serialize_run(run, stages) | {"last_ledger": entry, "quality_loop": "rework", "issue": issue}


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

    if await align_run_to_esteira(session, run, project):
        await session.refresh(run)

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

    if (stage.expected_artifacts or []) and not (artifact_hash or stage.artifact_hash):
        raise StageTransitionError(
            "Execute a etapa antes de concluir. Arquivos antigos na pasta não contam como entrega nova."
        )

    looped = await _rewind_if_quality_failed(
        session, run, project, stages, stage, actor=actor or stage.agent
    )
    if looped is not None:
        return looped

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
    _sync_pendencies(project, stages, run)

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

    meta = dict(run.meta or {})
    meta["last_fail"] = {
        "stage_def_id": stage.stage_def_id,
        "note": note or "Etapa falhou",
        "at": _now().isoformat(),
    }
    run.meta = meta
    flag_modified(run, "meta")

    entry = _append_ledger(
        run,
        kind="stage",
        action="failed",
        stage=stage,
        actor=who,
        note=note or "Etapa falhou",
    )
    _append_project_event(
        project,
        who,
        f"Etapa falhou: {stage.title}" + (f" · {note}" if note else ""),
    )

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    _sync_pendencies(project, stages, run)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="failed")

    return serialize_run(run, stages) | {"last_ledger": entry}


async def resume_stage(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str | None = None,
    *,
    actor: str = CEO_ACTOR,
    note: str | None = None,
) -> dict:
    """Retoma run pausado (pós-fail ou pause suave) — B3."""
    if run.status != "paused":
        raise StageTransitionError(f"Run não está pausado (status={run.status})")

    stages = await list_stages(session, run.id)
    target_id = stage_def_id or run.current_stage_id
    if not target_id:
        raise StageTransitionError("Nenhuma etapa atual para retomar")
    stage = _find_stage(stages, target_id)

    if stage.status == "failed":
        stage.status = "awaiting_gate" if stage.is_gate else "running"
        stage.finished_at = None
        stage.started_at = _now()
        kind = "resumed_after_fail"
    elif stage.status in ("running", "awaiting_gate", "blocked"):
        if stage.status == "blocked":
            stage.status = "awaiting_gate" if stage.is_gate else "running"
        kind = "resumed"
    else:
        raise StageTransitionError(
            f"Não é possível retomar etapa em status={stage.status}"
        )

    run.current_stage_id = stage.stage_def_id
    run.status = "running"
    project.status = "running"

    meta = dict(run.meta or {})
    if meta.get("last_fail", {}).get("stage_def_id") == stage.stage_def_id:
        meta.pop("last_fail", None)
        run.meta = meta
        flag_modified(run, "meta")

    entry = _append_ledger(
        run,
        kind="system",
        action="resumed",
        stage=stage,
        actor=actor,
        note=note or ("Retomada após falha" if kind == "resumed_after_fail" else "Esteira retomada"),
    )
    _append_project_event(project, actor, f"Esteira retomada: {stage.title}")
    _sync_stages_done(project, stages)
    _sync_pendencies(project, stages, run)

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    _sync_pendencies(project, stages, run)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="current")

    return serialize_run(run, stages) | {"last_ledger": entry}


def _delivery_paths(run: FactoryRun, stage: FactoryStageInstance) -> list[str]:
    """Artefatos declarados na esteira ou na etapa. Gates só de autorização ficam de fora."""
    from app.modules.factory.esteiras import stage_definitions

    for definition in stage_definitions(run.template_code or ""):
        if definition.get("id") != stage.stage_def_id:
            continue
        canon = [item for item in (definition.get("expected_artifacts") or []) if item]
        if canon:
            if not stage.expected_artifacts:
                stage.expected_artifacts = canon
                flag_modified(stage, "expected_artifacts")
            return canon
        break
    return [item for item in (stage.expected_artifacts or []) if item]


def _upstream_work(
    stages: list[FactoryStageInstance],
    gate: FactoryStageInstance,
) -> list[FactoryStageInstance]:
    """Etapas de trabalho entre o gate anterior e este gate."""
    block: list[FactoryStageInstance] = []
    for stage in reversed(stages):
        if stage.sort_order >= gate.sort_order:
            continue
        if stage.is_gate:
            break
        block.append(stage)
    block.reverse()
    return block


async def redo_gate_delivery(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str,
    *,
    actor: str = CEO_ACTOR,
    note: str | None = None,
    model: str | None = None,
    effort: str | None = None,
) -> dict:
    """Reabre a entrega de um gate já alcançado, com instruções e motor/esforço.

    Gates concluídos também entram: a esteira volta ao bloco que alimenta
    aquele gate e as etapas posteriores voltam para a fila.
    """
    stages = await list_stages(session, run.id)
    gate = _find_stage(stages, stage_def_id)
    if not gate.is_gate:
        raise StageTransitionError("Refazer entrega só se aplica a um gate")
    if gate.status not in ("awaiting_gate", "done"):
        raise StageTransitionError(
            f"Gate '{stage_def_id}' ainda não teve entrega (status={gate.status})"
        )

    meta = dict(run.meta or {})
    if model:
        meta["model"] = model.strip()
    if effort:
        meta["effort"] = effort.strip()
    upstream = _upstream_work(stages, gate)
    targets = list(upstream)
    if gate.expected_artifacts:
        targets.append(gate)
    if not targets:
        raise StageTransitionError("Este gate não tem entrega anterior para refazer")

    now = _now()
    later = [s for s in stages if s.sort_order > gate.sort_order]
    reset_ids = {s.stage_def_id for s in targets} | {s.stage_def_id for s in later}
    if "paula_plan" in reset_ids:
        meta.pop("plan_ready", None)
        meta.pop("planner", None)

    meta["redo"] = {
        "gate_id": gate.stage_def_id,
        "note": (note or "").strip(),
        "force_ids": [s.stage_def_id for s in targets],
        "at": now.isoformat(),
    }
    run.meta = meta
    flag_modified(run, "meta")

    for stage in later:
        stage.status = "queued"
        stage.started_at = None
        stage.finished_at = None
        stage.artifact_hash = None

    if upstream:
        first = upstream[0]
        for stage in upstream:
            active = stage.stage_def_id == first.stage_def_id
            stage.status = "running" if active else "queued"
            stage.finished_at = None
            stage.artifact_hash = None
            stage.started_at = now if active else None
        gate.status = "queued"
        gate.started_at = None
        gate.finished_at = None
        gate.artifact_hash = None
        run.current_stage_id = first.stage_def_id
        reopened = first.title
    else:
        gate.status = "awaiting_gate"
        gate.started_at = now
        gate.finished_at = None
        gate.artifact_hash = None
        run.current_stage_id = gate.stage_def_id
        reopened = gate.title

    run.status = "running"
    project.status = "running"
    entry = _append_ledger(
        run,
        kind="gate",
        action="redo",
        stage=gate,
        actor=actor,
        note=note or f"Refazer entrega · {reopened}",
    )
    _append_project_event(project, actor, f"Refazer entrega do gate: {gate.title}")
    _sync_stages_done(project, stages)
    _sync_pendencies(project, stages, run)

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    await _emit_event_appended(run, entry)
    current = next((s for s in stages if s.stage_def_id == run.current_stage_id), gate)
    await _emit_stage_changed(run, current, kind="current")
    return serialize_run(run, stages) | {"last_ledger": entry, "redo": meta["redo"]}


async def restart_run(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    *,
    actor: str = CEO_ACTOR,
    note: str | None = None,
    model: str | None = None,
    effort: str | None = None,
) -> dict:
    """Volta a esteira ao início (Gate 0). A pasta do projeto permanece."""
    stages = await list_stages(session, run.id)
    if not stages:
        raise StageTransitionError("Run sem etapas")

    ordered = sorted(stages, key=lambda s: s.sort_order)
    first = ordered[0]
    now = _now()
    for i, stage in enumerate(ordered):
        if i == 0:
            stage.status = "awaiting_gate" if stage.is_gate else "running"
            stage.started_at = now
        else:
            stage.status = "queued"
            stage.started_at = None
        stage.finished_at = None
        stage.artifact_hash = None

    run.current_stage_id = first.stage_def_id
    run.status = "running"
    project.status = "running"
    project.stages_done = 0

    meta = dict(run.meta or {})
    meta["model"] = (model or "claude-opus-5-5").strip()
    meta["effort"] = (effort or "xhigh").strip()
    meta.pop("plan_ready", None)
    meta.pop("planner", None)
    # Arquivos já existentes na pasta não podem ser reaproveitados: cada etapa
    # com entrega precisa ser reescrita na próxima execução.
    meta["redo"] = {
        "gate_id": first.stage_def_id,
        "note": (note or "").strip(),
        "force_ids": [s.stage_def_id for s in ordered if _delivery_paths(run, s)],
        "at": now.isoformat(),
        "reason": "restart",
    }
    meta["restarted_at"] = now.isoformat()
    run.meta = meta
    flag_modified(run, "meta")

    entry = _append_ledger(
        run,
        kind="system",
        action="restarted",
        stage=first,
        actor=actor,
        note=note or "Projeto refeito do zero · esteira reiniciada no Gate 0",
    )
    _append_project_event(project, actor, "Esteira reiniciada do zero")
    _sync_stages_done(project, ordered)
    _sync_pendencies(project, ordered, run)

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stages[0], kind="current")
    return serialize_run(run, stages) | {"last_ledger": entry}


async def pause_run(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    *,
    actor: str = CEO_ACTOR,
    note: str | None = None,
) -> dict:
    """Pausa suave (sem falhar etapa) — B3."""
    if run.status != "running":
        raise StageTransitionError(f"Só é possível pausar run em execução (status={run.status})")

    stages = await list_stages(session, run.id)
    stage = None
    if run.current_stage_id:
        stage = _find_stage(stages, run.current_stage_id)
    if stage is None and stages:
        stage = next((s for s in stages if s.status in ("running", "awaiting_gate")), stages[0])
    if stage is None:
        raise StageTransitionError("Run sem etapas para pausar")

    run.status = "paused"
    project.status = "paused"

    entry = _append_ledger(
        run,
        kind="system",
        action="paused",
        stage=stage,
        actor=actor,
        note=note or "Esteira pausada pelo operador",
    )
    _append_project_event(project, actor, f"Esteira pausada em: {stage.title}")
    _sync_pendencies(project, stages, run)

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="paused")

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


async def set_auto_execute(session: AsyncSession, run: FactoryRun, *, enabled: bool) -> dict:
    """Grava o interruptor no run. Não executa etapa."""
    meta = dict(run.meta or {})
    meta["auto_execute"] = bool(enabled)
    run.meta = meta
    flag_modified(run, "meta")
    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)
    return serialize_run(run, stages)


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
    """Serializa run já carregado na sessão. Caller deve refresh() antes se houve flush."""
    # Lê timestamps com fallback — evita MissingGreenlet se updated_at expirou pós-flush.
    try:
        created = run.created_at
    except Exception:  # noqa: BLE001 — lazy-load sync em async
        created = None
    try:
        updated = run.updated_at
    except Exception:  # noqa: BLE001
        updated = None
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
        "pendencies": build_pendencies(stages, run),
        "created_at": _dt(created),
        "updated_at": _dt(updated),
    }
