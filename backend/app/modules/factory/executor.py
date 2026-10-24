"""B7 — Executor local de etapa (filesystem + GhostCLI HTTP)."""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.factory_run import FactoryRun
from app.models.factory_stage import FactoryStageInstance
from app.modules.factory.artifacts import (
    ArtifactError,
    expected_status,
    file_sha256,
    resolve_workspace_root,
    write_artifact,
)
from app.modules.factory.run_service import (
    StageTransitionError,
    _append_ledger,
    _append_project_event,
    _emit_event_appended,
    _emit_stage_changed,
    _now,
    list_stages,
    serialize_run,
    _sync_pendencies,
    _sync_stages_done,
)
from app.modules.ghostcli import chat_completion, default_effort, default_model
from app.modules.ghostcli.client import GhostCliError


def _run_model_effort(run: FactoryRun) -> tuple[str, str, str]:
    meta = run.meta or {}
    return (
        str(meta.get("model") or default_model()),
        str(meta.get("effort") or default_effort()),
        str(meta.get("provider") or "ghostcli"),
    )


def _esteira_def(run: FactoryRun, stage_def_id: str) -> dict | None:
    from app.modules.factory.esteiras import stage_definitions

    for d in stage_definitions(run.template_code or ""):
        if d.get("id") == stage_def_id:
            return d
    return None


def _sync_stage_from_esteira(run: FactoryRun, stage: FactoryStageInstance) -> list[str]:
    """Alinha artifacts (e is_gate) com a esteira canônica — cobre runs/cobaias antigos."""
    from sqlalchemy.orm.attributes import flag_modified

    d = _esteira_def(run, stage.stage_def_id)
    expected = [a for a in (stage.expected_artifacts or []) if a]
    if d:
        canon = list(d.get("expected_artifacts") or [])
        if not expected and canon:
            expected = canon
            stage.expected_artifacts = canon
            flag_modified(stage, "expected_artifacts")
        elif canon and expected != canon:
            expected = canon
            stage.expected_artifacts = canon
            flag_modified(stage, "expected_artifacts")
        # Gate mudou na definição (ex.: m_qa virou trabalho do agente)
        canon_gate = bool(d.get("gate"))
        if stage.is_gate != canon_gate:
            stage.is_gate = canon_gate
    if not expected:
        if d and not (d.get("expected_artifacts") or []) and stage.is_gate:
            return []
        expected = [f"artifacts/{stage.stage_def_id}.md"]
        stage.expected_artifacts = expected
        flag_modified(stage, "expected_artifacts")
    return expected


STE100_RULES = (
    "Escreva em português do Brasil no formato ASD-STE100.\n"
    "Regras:\n"
    "- Uma ideia por frase. No máximo 25 palavras.\n"
    "- Voz ativa. Diga quem faz a ação.\n"
    "- Uma instrução por frase.\n"
    "- Se houver condição, escreva a condição antes da ação.\n"
    "- Use lista vertical para passos.\n"
    "- Não use sinônimo para a mesma coisa.\n"
    "- Não invente fato que não está nas fontes.\n"
    "Use estes títulos, nesta ordem:\n"
    "## Situação\n## O que li\n## Entrega\n## Evidência\n## Riscos\n## Próximo passo\n"
)


def _source_bundle(project: Project, root: Path, skip: str) -> str:
    """Lê o pedido do projeto e os relatórios já gravados, para o agente não inventar."""
    parts: list[str] = []
    description = (project.description or "").strip()
    if description:
        parts.append(f"Descrição do projeto:\n{description}")
    meta = project.files or {}
    names = [str(item) for item in (meta.get("context_files") or []) if item]
    ordered: list[str] = [f"context/{name}" for name in names]
    ordered.extend(names)
    if root.is_dir():
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            if rel.startswith(".tavir/") or path.suffix.lower() not in {".md", ".txt", ".json", ".csv"}:
                continue
            if rel.count("/") > 2:
                continue
            ordered.append(rel)
    seen: set[str] = set()
    chunks: list[str] = []
    total = 0
    for rel in ordered:
        if rel in seen or rel == skip:
            continue
        seen.add(rel)
        path = root / rel
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace").strip()
        except OSError:
            continue
        if not text:
            continue
        piece = f"### Fonte `{rel}`\n{text[:3500]}"
        chunks.append(piece)
        total += len(piece)
        if total > 14000 or len(chunks) >= 8:
            break
    if chunks:
        parts.append("Fontes:\n\n" + "\n\n".join(chunks))
    else:
        parts.append(
            "Não há arquivo-base no workspace. Declare essa ausência em O que li. "
            "Não invente requisitos."
        )
    return "\n\n".join(parts)[:16000]


def _is_stub(path: Path) -> bool:
    """Rascunho local não é entrega da IA."""
    if not path.is_file():
        return False
    try:
        head = path.read_text(encoding="utf-8", errors="replace")[:1200]
    except OSError:
        return False
    markers = (
        "executor local (B7)",
        "Conteúdo inicial materializado",
        "Contexto atual mapeado",
        "Contexto atual do",
    )
    return any(marker in head for marker in markers)


def _wrap_ste100(stage: FactoryStageInstance, relative: str, body: str) -> str:
    title = stage.title or relative
    agent = stage.agent or "Agente"
    return (
        f"# {title}\n\n"
        f"**Agente:** {agent}  \n"
        f"**Arquivo:** `{relative}`  \n"
        "**Formato:** ASD-STE100\n\n"
        "## Situação\n\n"
        f"{agent} entregou este relatório na etapa {title}.\n\n"
        "## O que li\n\n"
        "As fontes disponíveis estão no pedido desta etapa.\n\n"
        "## Entrega\n\n"
        f"{body.strip()}\n\n"
        "## Evidência\n\n"
        f"O arquivo `{relative}` está no workspace do projeto.\n\n"
        "## Riscos\n\n"
        "Confirme os fatos com o arquivo-base antes de autorizar o gate.\n\n"
        "## Próximo passo\n\n"
        "Leia este relatório. Autorize o gate só se a entrega estiver completa.\n"
    )


async def _agent_content(
    stage: FactoryStageInstance,
    project: Project,
    relative: str,
    *,
    model: str | None = None,
    effort: str | None = None,
    provider: str | None = None,
    guidance: str | None = None,
) -> tuple[str, str | None]:
    """Gera o arquivo via o motor configurado. Falha explícita se a IA não responder."""
    model = model or default_model()
    effort = effort or default_effort()
    guidance = (guidance or "").strip()
    try:
        root = resolve_workspace_root(project.local_path)
        sources = _source_bundle(project, root, relative)
    except ArtifactError as exc:
        sources = f"Workspace indisponível: {exc}"

    role_extra = ""
    if stage.stage_def_id in ("brief", "m_gate0") or stage.agent_role == "dora":
        role_extra = (
            "Você é a Dora. Leia o arquivo-base em context/ e o pedido do projeto. "
            "O relatório é a entrega do Gate 0. Não avance sem citar o que leu.\n"
        )
    elif stage.stage_def_id == "paula_plan" or stage.agent_role == "paula":
        role_extra = (
            "Você é a Paula PM. Leia brief, requisitos e arquitetura. "
            "Entregue o plano, o roadmap e o kanban com fases acionáveis.\n"
        )
    elif stage.stage_def_id in {"build_be", "m_code_be"} or stage.agent_role == "diego":
        role_extra = (
            "Você é o Diego Sistemas. Você implementa só o backend.\n"
            "Não altere o frontend.\n"
            "Grave o plano de testes do backend. Cada caso diz o passo, o esperado e o obtido.\n"
            "Leia as issues em qa/issues que tratam do backend. Corrija cada uma no código do backend.\n"
            "Não declare o teste aprovado. Quem aprova o backend é o Tester Automatizado.\n"
        )
    elif stage.stage_def_id in {"build_fe", "m_code_fe", "build", "m_code"} or stage.agent_role == "dev_frontend":
        role_extra = (
            "Você é o Dev Frontend. Você implementa só o frontend.\n"
            "Não altere o backend.\n"
            "Grave o plano de testes da interface. Cada caso diz o passo, o esperado e o obtido.\n"
            "Leia as issues em qa/issues que tratam da interface. Corrija cada uma no código do frontend.\n"
            "Não declare o teste aprovado. Quem aprova a interface é o Validador Visual.\n"
        )
    elif stage.stage_def_id in {"qa_be", "m_qa_be"} or stage.agent_role == "tester":
        role_extra = (
            "Você é o Tester Automatizado. Valide só o backend.\n"
            "Leia qa/plan-back.md e o código do backend. Não invente aprovação.\n"
            "Se houver falha, descreva uma issue por falha: título, passo, esperado e obtido.\n"
            "Feche o relatório com uma linha isolada: Resultado: APROVADO ou Resultado: REPROVADO.\n"
            "Use REPROVADO quando existir qualquer falha aberta no backend.\n"
        )
    elif stage.stage_def_id in {"qa_fe", "m_qa_fe", "qa", "m_qa"} or stage.agent_role == "validador":
        role_extra = (
            "Você é o Validador Visual. Valide só o frontend.\n"
            "Leia qa/plan-front.md e a interface. Não invente aprovação.\n"
            "Se houver falha, descreva uma issue por falha: título, passo, esperado e obtido.\n"
            "Feche o relatório com uma linha isolada: Resultado: APROVADO ou Resultado: REPROVADO.\n"
            "Use REPROVADO quando existir qualquer falha aberta na interface.\n"
        )
    elif stage.stage_def_id in {"m_hard", "seo_sec", "m_seo_sec"} or stage.agent_role == "sergio":
        role_extra = (
            "Você é o Sérgio. Audite como security-auditor.\n"
            "Cubra injeção, autenticação, segredo, controle de acesso, XSS, dependência vulnerável, "
            "SSRF, validação de entrada e configuração insegura.\n"
            "Não copie valor de segredo. Mascare com **** e cite arquivo e linha.\n"
            "Cada achado tem ID SEC-NNN, CWE, severidade, local, cenário de exploração e correção.\n"
            "Feche com uma linha isolada: Parecer: APROVADO ou Parecer: REPROVADO.\n"
            "Use REPROVADO se existir achado Critical ou High em aberto.\n"
        )
    elif stage.stage_def_id in {"m_docs", "docs"} or stage.agent_role == "dante":
        role_extra = (
            "Você é o Dante. Escreva a documentação em três níveis, cada um no seu arquivo.\n"
            "Suporte: como operar, recuperar falha e o que escalar.\n"
            "Desenvolvimento: como o frontend e o backend se organizam e como alterar com segurança.\n"
            "Usuário: como usar o produto, sem termo interno.\n"
            "Não invente tela ou comando que não está nas fontes.\n"
        )

    is_doc = relative.endswith(".md") or relative.endswith(".txt")
    system = (
        f"Você é {stage.agent or 'o agente da Fábrica TAVIR'}, "
        f"papel `{stage.agent_role or 'especialista'}`.\n"
        f"Projeto: {project.name}.\n"
        f"Etapa: {stage.title} (`{stage.stage_def_id}`).\n"
        f"{role_extra}"
        + (STE100_RULES if is_doc else "Escreva só o código pedido. Não explique o código.\n")
    )
    user = (
        f"Entregue o arquivo `{relative}`.\n\n"
        f"{sources}\n"
    )
    if guidance:
        user += f"\nInstruções do CEO para refazer:\n{guidance}\n"
    try:
        text = await chat_completion(
            system=system,
            messages=[{"role": "user", "content": user}],
            model=model,
            effort=effort,
            provider=provider,
            max_tokens=4000 if is_doc else 2500,
            timeout=240.0,
        )
    except GhostCliError as exc:
        raise StageTransitionError(
            f"A IA não respondeu ({exc}). A entrega deste agente não foi feita."
        ) from exc
    text = (text or "").strip()
    if not text:
        from app.modules.ghostcli.notice import report_ai_link_error

        report_ai_link_error("A IA devolveu um documento vazio. A entrega não foi feita.")
        raise StageTransitionError("A IA devolveu um documento vazio. A entrega não foi feita.")
    if not relative.endswith(".md") and text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    if is_doc and "## Situação" not in text:
        text = _wrap_ste100(stage, relative, text)
    return text, ("cursor: ok · STE100" if (provider or "") == "cursor" else "ghostcli: ok · STE100")


async def _materialize_dir(
    root: Path,
    path: str,
    stage: FactoryStageInstance,
    project: Project,
    *,
    model: str | None = None,
    effort: str | None = None,
    provider: str | None = None,
    guidance: str | None = None,
) -> tuple[list[dict], str | None]:
    """Cria pasta + README (e arquivo de trabalho) — agentes deixam rastro real."""
    written: list[dict] = []
    note: str | None = None
    dir_path = root / path
    if dir_path.exists() and dir_path.is_file():
        dir_path.unlink()
    dir_path.mkdir(parents=True, exist_ok=True)

    readme = dir_path / "README.md"
    if not readme.exists():
        content, note = await _agent_content(
            stage, project, f"{path}/README.md", model=model, effort=effort, provider=provider, guidance=guidance
        )
        readme.write_text(content, encoding="utf-8")
    written.append({"path": f"{path}/README.md", "sha256": file_sha256(readme)})

    if path.rstrip("/") in ("src", "backend", "frontend"):
        work = dir_path / "main.py" if path.rstrip("/") == "backend" else dir_path / "index.ts"
        if path.rstrip("/") == "src":
            work = dir_path / "app.ts"
        if not work.exists():
            content, n2 = await _agent_content(
                stage, project, f"{path}/{work.name}", model=model, effort=effort, provider=provider, guidance=guidance
            )
            note = note or n2
            work.write_text(content, encoding="utf-8")
        written.append(
            {"path": f"{path}/{work.name}", "sha256": file_sha256(work), "size": work.stat().st_size}
        )
    return written, note


async def execute_stage(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage_def_id: str,
    *,
    actor: str | None = None,
    note: str | None = None,
) -> dict:
    """Materializa expected_artifacts no workspace e registra hash no ledger."""
    if run.status not in ("running", "paused"):
        raise StageTransitionError(f"Run não está ativo (status={run.status})")

    from app.modules.factory.run_service import align_run_to_esteira

    if await align_run_to_esteira(session, run, project):
        await session.refresh(run)

    stages = await list_stages(session, run.id)
    stage = next((s for s in stages if s.stage_def_id == stage_def_id), None)
    if not stage:
        raise StageTransitionError(
            f"Etapa '{stage_def_id}' não encontrada. "
            "Atualize a tela. Diego Sistemas faz o backend. Dev Frontend faz o frontend. "
            "Tester Automatizado valida o back. Validador Visual valida a frente."
        )
    # Alinha artifacts/is_gate com esteira canônica (cobaias / runs antigos)
    expected = _sync_stage_from_esteira(run, stage)
    redo_now = (run.meta or {}).get("redo") or {}
    forced_gate = bool(stage.is_gate and stage.stage_def_id in set(redo_now.get("force_ids") or []))
    delivery_gate = bool(stage.is_gate and expected and stage.status == "awaiting_gate")
    if stage.is_gate and not forced_gate and not delivery_gate:
        raise StageTransitionError("Gates não usam execute; use authorize")
    allowed = ("running", "failed", "awaiting_gate") if (forced_gate or delivery_gate) else ("running", "failed")
    if stage.status not in allowed:
        raise StageTransitionError(f"Etapa não executável (status={stage.status})")
    if run.current_stage_id and run.current_stage_id != stage_def_id:
        raise StageTransitionError(f"Etapa atual é '{run.current_stage_id}'")

    try:
        root = resolve_workspace_root(project.local_path)
    except ArtifactError as exc:
        raise StageTransitionError(str(exc)) from exc

    # Projeto marcado done por inconsistência antiga — alinha com run ativo
    if project.status == "done" and run.status in ("running", "paused"):
        project.status = "running"

    model, effort, provider = _run_model_effort(run)
    redo = (run.meta or {}).get("redo") or {}
    force_ids = set(redo.get("force_ids") or [])
    guidance = redo.get("note") or None
    force = stage.stage_def_id in force_ids
    asked = "Entrega do agente" in (note or "")
    written: list[dict] = []
    ghost_notes: list[str] = []

    for rel in expected:
        raw = (rel or "").replace("\\", "/")
        is_dir = raw.endswith("/")
        path = raw.rstrip("/")
        if not path:
            continue
        target = root / path
        fresh = force or asked or not stage.artifact_hash or _is_stub(target)
        if is_dir or target.is_dir():
            if fresh:
                for child_name in ("README.md", "app.ts", "index.ts", "main.py"):
                    child = target / child_name
                    if child.is_file() and (force or not stage.artifact_hash or _is_stub(child)):
                        child.unlink()
            parts, note = await _materialize_dir(
                root, path, stage, project, model=model, effort=effort, provider=provider, guidance=guidance
            )
            written.extend(parts)
            if note:
                ghost_notes.append(note)
            continue
        if fresh and target.is_file():
            target.unlink()
        if not target.exists():
            content, note = await _agent_content(
                stage, project, path, model=model, effort=effort, provider=provider, guidance=guidance
            )
            if note:
                ghost_notes.append(note)
            info = write_artifact(project.local_path, path, content)
            written.append(info)
        else:
            written.append({"path": path, "sha256": file_sha256(target), "size": target.stat().st_size})

    if force and redo:
        from sqlalchemy.orm.attributes import flag_modified

        left = [i for i in (redo.get("force_ids") or []) if i != stage.stage_def_id]
        meta = dict(run.meta or {})
        redo = dict(redo)
        redo["force_ids"] = left
        meta["redo"] = redo
        run.meta = meta
        flag_modified(run, "meta")

    ghost_note = "; ".join(dict.fromkeys(ghost_notes)) if ghost_notes else None
    ghost_note = (
        f"model={model} effort={effort}"
        + (f" · {ghost_note}" if ghost_note else "")
    )

    # Paula concluiu o plano: marca no meta do run (modelo/esforço seguem Opus/máximo por ora)
    if stage.stage_def_id == "paula_plan":
        from sqlalchemy.orm.attributes import flag_modified

        meta = dict(run.meta or {})
        meta["plan_ready"] = True
        meta["model"] = model
        meta["effort"] = effort
        meta["planner"] = "Paula PM"
        run.meta = meta
        flag_modified(run, "meta")

    status = expected_status(project.local_path, expected)
    missing = [s["path"] for s in status if not s["present"]]
    if missing:
        raise StageTransitionError(f"Artefatos ausentes após execute: {', '.join(missing)}")

    primary_hash = written[0]["sha256"] if written else None
    if primary_hash:
        stage.artifact_hash = primary_hash
    if stage.status == "failed":
        stage.status = "running"
        stage.finished_at = None
        run.status = "running"
        project.status = "running"

    who = actor or stage.agent or "Executor"
    entry = _append_ledger(
        run,
        kind="stage",
        action="executed",
        stage=stage,
        actor=who,
        note=note
        or (
            f"Executor local · {len(written)} artefato(s)"
            + (f" · {ghost_note}" if ghost_note else "")
        ),
    )
    _append_project_event(project, who, f"Etapa executada: {stage.title}")
    _sync_stages_done(project, stages)
    _sync_pendencies(project, stages, run)

    await session.flush()
    await session.refresh(run)
    stages = await list_stages(session, run.id)

    await _emit_event_appended(run, entry)
    await _emit_stage_changed(run, stage, kind="current")

    payload = serialize_run(run, stages)
    payload["last_ledger"] = entry
    payload["executed_files"] = written
    payload["ghostcli"] = ghost_note
    return payload


async def auto_execute_until_gate(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    *,
    actor: str = "Executor automático",
    max_steps: int = 24,
) -> dict:
    """
    Execução automática: execute + complete em etapas não-gate
    até parar em gate (awaiting_gate), done ou falha.
    """
    from app.modules.factory.run_service import complete_stage, resume_stage

    if run.status == "paused":
        await resume_stage(
            session,
            run,
            project,
            run.current_stage_id,
            actor=actor,
            note="Auto-resume antes da execução automática",
        )
        await session.refresh(run)

    # Alinha todas as stages do run com a esteira canônica (cobaias antigas)
    stages0 = await list_stages(session, run.id)
    for st in stages0:
        _sync_stage_from_esteira(run, st)
    await session.flush()

    steps: list[dict] = []
    stop_reason = "max_steps"

    for _ in range(max_steps):
        await session.refresh(run)
        stages = await list_stages(session, run.id)
        if run.status == "done" or not run.current_stage_id:
            stop_reason = "completed"
            break

        stage = next((s for s in stages if s.stage_def_id == run.current_stage_id), None)
        if not stage:
            stop_reason = "no_stage"
            break

        _sync_stage_from_esteira(run, stage)

        redo_now = (run.meta or {}).get("redo") or {}
        force_ids = set(redo_now.get("force_ids") or [])
        if (stage.is_gate or stage.status == "awaiting_gate") and stage.stage_def_id in force_ids:
            exe = await execute_stage(
                session,
                run,
                project,
                stage.stage_def_id,
                actor=actor,
                note="Refazer entrega do gate · artefatos",
            )
            await session.refresh(run)
            stages_exe = await list_stages(session, run.id)
            stage_exe = next((s for s in stages_exe if s.stage_def_id == stage.stage_def_id), None)
            if stage_exe is not None and stage_exe.is_gate:
                stage_exe.status = "awaiting_gate"
                stage_exe.finished_at = None
                run.current_stage_id = stage_exe.stage_def_id
                run.status = "running"
                project.status = "running"
                await session.flush()
            steps.append(
                {
                    "stage_def_id": stage.stage_def_id,
                    "action": "redo_gate_files",
                    "files": len(exe.get("executed_files") or []),
                }
            )
            stop_reason = "awaiting_gate"
            break

        if stage.is_gate or stage.status == "awaiting_gate":
            stop_reason = "awaiting_gate"
            break

        if stage.status == "failed":
            stop_reason = "failed"
            break

        if stage.status != "running":
            stop_reason = f"blocked:{stage.status}"
            break

        stage_id = stage.stage_def_id

        # 1) materializa artefatos
        exe = await execute_stage(
            session,
            run,
            project,
            stage_id,
            actor=actor,
            note="Auto-execução · artefatos",
        )
        await session.refresh(run)
        stages_exe = await list_stages(session, run.id)
        stage_exe = next((s for s in stages_exe if s.stage_def_id == stage_id), None)
        steps.append(
            {
                "stage_def_id": stage_id,
                "action": "executed",
                "files": len(exe.get("executed_files") or []),
            }
        )

        # 2) conclui etapa
        done = await complete_stage(
            session,
            run,
            project,
            stage_id,
            actor=actor,
            note="Auto-execução · complete",
            artifact_hash=stage_exe.artifact_hash if stage_exe else None,
        )
        await session.refresh(run)
        steps.append({"stage_def_id": stage_id, "action": "completed"})

        if done.get("status") == "done":
            stop_reason = "completed"
            break

    # Snapshot final: flush/refresh obrigatório antes de serialize_run
    # (updated_at com onupdate=func.now() expira após flush → MissingGreenlet).
    from datetime import datetime, timezone

    await session.refresh(run)
    stages = await list_stages(session, run.id)
    cur = next((s for s in stages if s.stage_def_id == run.current_stage_id), stages[-1] if stages else None)
    entry = None
    if cur:
        entry = _append_ledger(
            run,
            kind="system",
            action="auto_run",
            stage=cur,
            actor=actor,
            note=f"Execução automática · {len(steps)} passo(s) · parou: {stop_reason}",
        )
        _append_project_event(project, actor, f"Execução automática parou: {stop_reason}")
        run.updated_at = datetime.now(timezone.utc)
        await session.flush()

    run_id = run.id
    await session.refresh(run)
    stages = await list_stages(session, run_id)
    # Garante colunas carregadas no contexto async antes do dict sync.
    _ = (run.updated_at, run.created_at, run.meta, run.status, run.current_stage_id)
    payload = serialize_run(run, stages)
    payload["auto"] = {
        "steps": steps,
        "stop_reason": stop_reason,
        "steps_count": len(steps),
    }
    if entry:
        payload["last_ledger"] = entry
        await _emit_event_appended(run, entry)
    return payload
