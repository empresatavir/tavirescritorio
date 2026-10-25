"""B7 — Executor local de etapa (filesystem + GhostCLI HTTP)."""
from __future__ import annotations

import asyncio
import contextlib
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
from app.modules.factory.work_session import (
    WorkSessionError,
    run_build_sync,
    run_check_sync,
    run_visual_sync,
    work_kind,
)


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
    from app.modules.factory.intake import merge_expected

    merged = merge_expected(run.workspace_path, stage.stage_def_id, expected)
    if merged != list(stage.expected_artifacts or []):
        stage.expected_artifacts = merged
        flag_modified(stage, "expected_artifacts")
    return merged


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
    ordered: list[str] = ["context/escopo.md", "context/contrato.json"]
    ordered.extend(f"context/{name}" for name in names)
    ordered.extend(names)
    if root.is_dir():
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            if rel.startswith(".tavir/") or path.suffix.lower() not in {".md", ".txt", ".json", ".csv", ".html", ".css"}:
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
        limit = 20000 if rel in {"context/escopo.md", "context/contrato.json"} or rel.endswith(".md") else 2000
        piece = f"### Fonte `{rel}`\n{text[:limit]}"
        chunks.append(piece)
        total += len(piece)
        if total > 28000 or len(chunks) >= 10:
            break
    if chunks:
        parts.append("Fontes:\n\n" + "\n\n".join(chunks))
    else:
        parts.append(
            "Não há arquivo-base no workspace. Declare essa ausência em O que li. "
            "Não invente requisitos."
        )
    return "\n\n".join(parts)[:28000]


_progress_seq = 0


async def _emit_progress(run: FactoryRun, stage: FactoryStageInstance, message: str) -> None:
    """Avisa a tela do passo atual, sem gravar no livro-razão."""
    global _progress_seq
    from app.modules.factory.sse_hub import factory_sse_hub

    _progress_seq += 1
    await factory_sse_hub.publish(
        run.id,
        "execution.progress",
        {
            "id": f"p-{stage.stage_def_id}-{_progress_seq}",
            "run_id": run.id,
            "stage_def_id": stage.stage_def_id,
            "actor": stage.agent or "Agente",
            "message": message,
            "occurred_at": _now().isoformat(),
        },
    )


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


async def _watch_model(run: FactoryRun, stage: FactoryStageInstance, label: str, call):
    """Publica um passo a cada 8 s e repassa as linhas do motor para a tela."""
    stop = asyncio.Event()

    async def _pulse() -> None:
        ticks = 0
        while True:
            try:
                await asyncio.wait_for(stop.wait(), 8)
                return
            except TimeoutError:
                ticks += 1
                await _emit_progress(run, stage, f"{label} {ticks * 8} s.")

    task = asyncio.create_task(_pulse())
    loop = asyncio.get_running_loop()

    def on_status(message: str) -> None:
        text = " ".join((message or "").split())[:180]
        if text:
            asyncio.run_coroutine_threadsafe(_emit_progress(run, stage, text), loop)

    try:
        return await call(on_status)
    finally:
        stop.set()
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


async def _agent_content(
    stage: FactoryStageInstance,
    project: Project,
    relative: str,
    *,
    model: str | None = None,
    effort: str | None = None,
    provider: str | None = None,
    guidance: str | None = None,
    run: FactoryRun | None = None,
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
            "Você é a Dora. Leia context/escopo.md e o contrato em context/contrato.json. "
            "O relatório do Gate 0 repete esse escopo. Não invente produto, paleta ou tela.\n"
        )
    elif stage.stage_def_id == "paula_plan" or stage.agent_role == "paula":
        role_extra = (
            "Você é a Paula PM. Leia brief, requisitos e arquitetura. "
            "Entregue o plano, o roadmap e o kanban com fases acionáveis.\n"
        )
    elif stage.stage_def_id in {"build_be", "m_code_be"} or stage.agent_role == "diego":
        role_extra = (
            "Você é o Diego Sistemas. Você implementa só o backend.\n"
            "Grave os arquivos de backend listados em context/contrato.json.\n"
            "Não altere o frontend.\n"
            "Grave o plano de testes do backend. Cada caso diz o passo, o esperado e o obtido.\n"
            "Leia as issues em qa/issues que tratam do backend. Corrija cada uma no código do backend.\n"
            "Não declare o teste aprovado. Quem aprova o backend é o Tester Automatizado.\n"
        )
    elif stage.stage_def_id in {"build_fe", "m_code_fe", "build", "m_code"} or stage.agent_role == "dev_frontend":
        role_extra = (
            "Você é o Dev Frontend. Você implementa só o frontend.\n"
            "Grave os arquivos de frontend listados em context/contrato.json.\n"
            "Siga o HTML e o design system enviados na criação.\n"
            "Não altere o backend.\n"
            "Grave o plano de testes da interface. Cada caso diz o passo, o esperado e o obtido.\n"
            "Se o entregável for apk ou ambos, grave também o cliente Flutter em aplicativo/ "
            "sem apagar a página web. O manifesto libera INTERNET e HTTP local.\n"
            "Leia as issues em qa/issues que tratam da interface. Corrija cada uma no código do frontend.\n"
            "Não declare o teste aprovado. Quem aprova a interface é o Validador Visual.\n"
        )
    elif stage.stage_def_id in {"qa_be", "m_qa_be"} or stage.agent_role == "tester":
        role_extra = (
            "Você é o Tester Automatizado. Valide só o backend.\n"
            "Leia context/contrato.json, qa/plan-back.md e o código do backend.\n"
            "Use REPROVADO se um arquivo de backend do contrato não existir.\n"
            "Se houver falha, descreva uma issue por falha: título, passo, esperado e obtido.\n"
            "Feche o relatório com uma linha isolada: Resultado: APROVADO ou Resultado: REPROVADO.\n"
            "Use REPROVADO quando existir qualquer falha aberta no backend.\n"
        )
    elif stage.stage_def_id in {"qa_fe", "m_qa_fe", "qa", "m_qa"} or stage.agent_role == "validador":
        role_extra = (
            "Você é o Validador Visual. Valide só o frontend.\n"
            "A jornada de uso executa a rotina. A frase Resultado não substitui essa execução.\n"
            "Leia context/contrato.json, qa/plan-front.md e a interface.\n"
            "Use REPROVADO se uma tela ou um arquivo de frontend do contrato não existir.\n"
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
    async def _ask(on_status):
        return await chat_completion(
            system=system,
            messages=[{"role": "user", "content": user}],
            model=model,
            effort=effort,
            provider=provider,
            max_tokens=4000 if is_doc else 8000,
            timeout=None,
            on_status=on_status,
        )

    try:
        if run is None:
            text = await _ask(None)
        else:
            text = await _watch_model(run, stage, f"Gravando {relative}.", _ask)
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
    run: FactoryRun | None = None,
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
        if run is not None:
            await _emit_progress(run, stage, f"Chamando o motor para gravar {path}/README.md.")
        content, note = await _agent_content(
            stage,
            project,
            f"{path}/README.md",
            model=model,
            effort=effort,
            provider=provider,
            guidance=guidance,
            run=run,
        )
        readme.write_text(content, encoding="utf-8")
    written.append({"path": f"{path}/README.md", "sha256": file_sha256(readme)})

    if path.rstrip("/") in ("src", "backend", "frontend"):
        work = dir_path / "main.py" if path.rstrip("/") == "backend" else dir_path / "index.ts"
        if path.rstrip("/") == "src":
            work = dir_path / "app.ts"
        if not work.exists():
            if run is not None:
                await _emit_progress(run, stage, f"Chamando o motor para gravar {path}/{work.name}.")
            content, n2 = await _agent_content(
                stage,
                project,
                f"{path}/{work.name}",
                model=model,
                effort=effort,
                provider=provider,
                guidance=guidance,
                run=run,
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
    from app.modules.cursor_link.client import clear_factory_halt

    clear_factory_halt()

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
    from app.modules.factory.intake import ContractError, ensure_contract

    try:
        await ensure_contract(session, project, stage.stage_def_id)
    except ContractError as exc:
        raise StageTransitionError(str(exc)) from exc
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

    from app.modules.factory.run_service import stamp_run_engine

    await stamp_run_engine(session, run)
    model, effort, provider = _run_model_effort(run)
    redo = (run.meta or {}).get("redo") or {}
    force_ids = set(redo.get("force_ids") or [])
    guidance = redo.get("note") or None
    force = stage.stage_def_id in force_ids
    asked = "Entrega do agente" in (note or "")
    written: list[dict] = []
    ghost_notes: list[str] = []
    await _emit_progress(run, stage, f"{stage.agent or 'O agente'} iniciou {stage.title}.")

    kind = work_kind(stage.stage_def_id)
    if kind in {"build", "visual"} and provider != "cursor":
        raise StageTransitionError(
            "A etapa de código precisa do Cursor como motor padrão. "
            "Esse motor edita o projeto e a fábrica executa o teste. "
            "O outro motor só devolve texto."
        )
    if kind:
        async def _call(on_status):
            common = {
                "agent_name": stage.agent or "Agente",
                "title": stage.title or stage.stage_def_id,
                "expected": expected,
                "on_status": on_status,
            }
            if kind == "visual":
                return await asyncio.to_thread(
                    run_visual_sync,
                    root,
                    stage.stage_def_id,
                    model=model,
                    effort=effort,
                    guidance=guidance,
                    **common,
                )
            if kind == "build":
                return await asyncio.to_thread(
                    run_build_sync,
                    root,
                    stage.stage_def_id,
                    model=model,
                    effort=effort,
                    guidance=guidance,
                    **common,
                )
            if kind == "jornada":
                from app.modules.factory.jornada import run_jornada_sync

                return await asyncio.to_thread(
                    run_jornada_sync,
                    root,
                    stage.stage_def_id,
                    **common,
                )
            if kind == "apk":
                from app.modules.factory.apk_build import run_apk_sync

                return await asyncio.to_thread(
                    run_apk_sync,
                    root,
                    stage.stage_def_id,
                    repair="reparar com o log" in (note or "").lower(),
                    model=model,
                    effort=effort,
                    **common,
                )
            return await asyncio.to_thread(
                run_check_sync,
                root,
                stage.stage_def_id,
                kind=kind,
                **common,
            )

        try:
            result = await _watch_model(
                run,
                stage,
                f"{stage.agent or 'O agente'} está na sessão de execução.",
                _call,
            )
        except WorkSessionError as exc:
            raise StageTransitionError(str(exc)) from exc
        written.extend(result.get("files") or [])
        if result.get("note"):
            ghost_notes.append(str(result["note"]))
    else:
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
                    root, path, stage, project, model=model, effort=effort, provider=provider, guidance=guidance, run=run
                )
                written.extend(parts)
                if note:
                    ghost_notes.append(note)
                continue
            if fresh and target.is_file():
                target.unlink()
            if not target.exists():
                await _emit_progress(run, stage, f"Chamando o motor {model} para gravar {path}.")
                content, note = await _agent_content(
                    stage, project, path, model=model, effort=effort, provider=provider, guidance=guidance, run=run
                )
                if note:
                    ghost_notes.append(note)
                info = write_artifact(project.local_path, path, content)
                written.append(info)
                await _emit_progress(run, stage, f"Arquivo {path} gravado.")
            else:
                written.append({"path": path, "sha256": file_sha256(target), "size": target.stat().st_size})
                await _emit_progress(run, stage, f"Arquivo {path} já estava no workspace.")

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
    await _emit_progress(run, stage, f"{stage.title} concluiu a gravação.")
    await _emit_stage_changed(run, stage, kind="current")

    payload = serialize_run(run, stages)
    payload["last_ledger"] = entry
    payload["executed_files"] = written
    payload["ghostcli"] = ghost_note
    return payload


def _stop_card(problem: str, solution: str, action: str) -> dict:
    note = f"Problema: {problem} Solução: {solution}"
    return {
        "note": note[:500],
        "action": action,
        "problem": problem[:240],
        "solution": solution[:240],
    }


def explain_stop(message: str, stage_title: str, stage_def_id: str = "") -> dict:
    """Traduz a falha para a tela: o problema, a solução e o botão do escritório."""
    text = (message or "").strip()
    low = text.lower()
    title = stage_title or "esta etapa"
    flutter_stage = stage_def_id in {"build_fe", "qa_fe", "qa_jornada", "build_apk"} or "frontend" in title.lower()
    missing_command = "winerror 2" in low or "não encontrei o comando" in low or "código de saída 127" in low
    if "pausa" in low:
        return _stop_card(
            f"A etapa {title} está pausada.",
            "O escritório retoma desta etapa.",
            "resume",
        )
    if missing_command:
        command = "flutter" if "flutter" in low or flutter_stage else "o comando"
        return _stop_card(
            f"O escritório chamou {command} e o Windows não encontrou o programa.",
            "O programa está nesta máquina. O escritório roda de novo com o caminho completo, nesta etapa.",
            "office",
        )
    if "teste ainda falha" in low or "passou antes da implementação" in low or "não há teste" in low or "teste sumiu" in low:
        return _stop_card(
            f"O teste de {title} não fechou a etapa.",
            "O agente da etapa lê a falha, corrige o código e o escritório roda o teste de novo.",
            "agent",
        )
    if "não gerou" in low and "apk" in low:
        return _stop_card(
            f"A compilação de {title} não gerou o APK.",
            "O Dev Frontend lê o log, corrige o aplicativo e o escritório compila de novo nesta etapa.",
            "agent",
        )
    if not text:
        return _stop_card(
            f"A chamada de {title} encerrou sem detalhe.",
            "O escritório tenta esta etapa de novo.",
            "office",
        )
    if stage_def_id in {"build_fe", "build_be", "qa_fe", "qa_be", "qa_jornada", "build_apk"}:
        return _stop_card(
            text[:220],
            "O agente da etapa corrige a partir deste erro e o escritório executa a etapa de novo.",
            "agent",
        )
    return _stop_card(
        text[:220],
        "O escritório continua desta etapa. O que já foi gravado permanece.",
        "office",
    )


def checkpoint_record(
    meta: dict | None,
    *,
    stage_def_id: str,
    title: str,
    status: str,
    note: str,
    at: str,
    action: str = "",
    problem: str = "",
    solution: str = "",
) -> dict:
    """O checkpoint mais recente e a fila curta dos anteriores."""
    item = {
        "at": at,
        "stage_def_id": stage_def_id,
        "title": title,
        "status": status,
        "note": (note or "")[:500],
        "action": action,
        "problem": (problem or "")[:240],
        "solution": (solution or "")[:240],
    }
    history = [row for row in ((meta or {}).get("checkpoints") or []) if isinstance(row, dict)]
    history.append(item)
    return {"checkpoint": item, "checkpoints": history[-12:]}


async def _commit_checkpoint(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    stage: FactoryStageInstance,
    *,
    status: str,
    note: str,
    actor: str,
    action: str = "",
    problem: str = "",
    solution: str = "",
) -> dict:
    """Grava o avanço já feito. O commit solta a etapa antes da próxima chamada."""
    from sqlalchemy.orm.attributes import flag_modified

    await session.refresh(run)
    await session.refresh(project)
    await session.refresh(stage)
    stamped = checkpoint_record(
        run.meta,
        stage_def_id=stage.stage_def_id,
        title=stage.title or stage.stage_def_id,
        status=status,
        note=note,
        at=_now().isoformat(),
        action=action,
        problem=problem,
        solution=solution,
    )
    meta = dict(run.meta or {})
    meta.update(stamped)
    run.meta = meta
    flag_modified(run, "meta")
    entry = _append_ledger(
        run,
        kind="system",
        action="checkpoint",
        stage=stage,
        actor=actor,
        note=stamped["checkpoint"]["note"],
    )
    _append_project_event(project, actor, stamped["checkpoint"]["note"])
    await session.commit()
    await _emit_event_appended(run, entry)
    await _emit_progress(run, stage, stamped["checkpoint"]["note"])
    await _emit_stage_changed(run, stage, kind="current")
    return stamped["checkpoint"]


async def auto_execute_until_gate(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    *,
    actor: str = "Executor automático",
    note: str = "",
    max_steps: int = 24,
) -> dict:
    """
    Execução automática: execute + complete em etapas não-gate
    até parar em gate (awaiting_gate), done ou falha.
    """
    from app.modules.factory.run_service import complete_stage, pause_run, resume_stage

    if run.status == "paused":
        await resume_stage(
            session,
            run,
            project,
            run.current_stage_id,
            actor=actor,
            note="Auto-resume antes da execução automática",
        )
        await session.commit()
        await session.refresh(run)

    # Alinha todas as stages do run com a esteira canônica (cobaias antigas)
    stages0 = await list_stages(session, run.id)
    for st in stages0:
        _sync_stage_from_esteira(run, st)
    await session.flush()

    steps: list[dict] = []
    stop_reason = "max_steps"
    error_note = ""
    repair_once = "reparar com o log" in (note or "").lower()

    for _ in range(max_steps):
        from app.modules.cursor_link.client import PAUSA_MOTOR, factory_halted

        if factory_halted():
            await session.refresh(run)
            stages = await list_stages(session, run.id)
            halted = next((s for s in stages if s.stage_def_id == run.current_stage_id), None)
            await pause_run(
                session,
                run,
                project,
                actor=actor,
                note="Pausa pedida durante a chamada do motor",
            )
            if halted is not None:
                await _commit_checkpoint(
                    session,
                    run,
                    project,
                    halted,
                    status="paused",
                    note=f"Pausa gravada em {halted.title}. A próxima execução continua nesta etapa.",
                    actor=actor,
                    action="resume",
                )
            else:
                await session.commit()
            stop_reason = "paused"
            break
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
            await _commit_checkpoint(
                session,
                run,
                project,
                stage,
                status="saved",
                note=f"{stage.title} regravado. O gate espera autorização.",
                actor=actor,
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
        stage_title = stage.title or stage_id
        await _commit_checkpoint(
            session,
            run,
            project,
            stage,
            status="running",
            note=f"{stage_title} em execução. O avanço anterior permanece gravado.",
            actor=actor,
        )

        # 1) materializa artefatos
        try:
            stage_note = "Reparar com o log desta etapa" if repair_once else "Auto-execução · artefatos"
            repair_once = False
            exe = await execute_stage(
                session,
                run,
                project,
                stage_id,
                actor=actor,
                note=stage_note,
            )
        except StageTransitionError as exc:
            await session.rollback()
            await session.refresh(run)
            stages = await list_stages(session, run.id)
            stopped = next((s for s in stages if s.stage_def_id == stage_id), None) or (stages[0] if stages else None)
            if factory_halted() or PAUSA_MOTOR in str(exc):
                await pause_run(
                    session,
                    run,
                    project,
                    actor=actor,
                    note="Pausa pedida durante a chamada do motor",
                )
                if stopped is not None:
                    await _commit_checkpoint(
                        session,
                        run,
                        project,
                        stopped,
                        status="paused",
                        note=f"Pausa gravada em {stopped.title}. A próxima execução continua nesta etapa.",
                        actor=actor,
                        action="resume",
                    )
                else:
                    await session.commit()
                stop_reason = "paused"
                break
            explained = explain_stop(str(exc), stage_title, stage_id)
            error_note = explained["note"]
            action = explained["action"]
            if stopped is not None:
                try:
                    await _commit_checkpoint(
                        session,
                        run,
                        project,
                        stopped,
                        status="error",
                        note=error_note,
                        actor=actor,
                        action=action,
                        problem=explained["problem"],
                        solution=explained["solution"],
                    )
                except Exception:
                    await session.rollback()
            stop_reason = "error"
            break
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

        # 2) conclui etapa e grava o checkpoint na mesma transação
        try:
            done = await complete_stage(
                session,
                run,
                project,
                stage_id,
                actor=actor,
                note="Auto-execução · complete",
                artifact_hash=stage_exe.artifact_hash if stage_exe else None,
            )
        except StageTransitionError as exc:
            await session.rollback()
            await session.refresh(run)
            stages = await list_stages(session, run.id)
            failed_stage = next((s for s in stages if s.stage_def_id == stage_id), None) or (stages[0] if stages else None)
            explained = explain_stop(str(exc), stage_title, stage_id)
            error_note = explained["note"]
            action = explained["action"]
            if failed_stage is not None:
                try:
                    await _commit_checkpoint(
                        session,
                        run,
                        project,
                        failed_stage,
                        status="error",
                        note=error_note,
                        actor=actor,
                        action=action,
                        problem=explained["problem"],
                        solution=explained["solution"],
                    )
                except Exception:
                    await session.rollback()
            stop_reason = "error"
            break
        await session.refresh(run)
        steps.append({"stage_def_id": stage_id, "action": "completed"})
        fresh = await list_stages(session, run.id)
        saved = next((s for s in fresh if s.stage_def_id == stage_id), None) or stage_exe or stage
        nxt = next((s for s in fresh if s.stage_def_id == run.current_stage_id), None)
        follow = f" A próxima execução continua em {nxt.title}." if nxt is not None and nxt.stage_def_id != stage_id else ""
        if done.get("quality_loop") == "rework":
            saved_note = f"{stage_title} voltou para correção. O avanço até aqui permanece gravado."
        else:
            saved_note = f"{saved.title or stage_title} gravada.{follow} As etapas concluídas não são refeitas."
        await _commit_checkpoint(
            session,
            run,
            project,
            saved,
            status="saved",
            note=saved_note,
            actor=actor,
        )

        if done.get("status") == "done":
            stop_reason = "completed"
            break

    # Snapshot final: flush/refresh obrigatório antes de serialize_run
    # (updated_at com onupdate=func.now() expira após flush → MissingGreenlet).
    from datetime import datetime, timezone

    await session.refresh(run)
    await session.refresh(project)
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
            note=(
                f"Execução automática · {len(steps)} passo(s) · parou: {stop_reason}"
                + (f" · {error_note}" if error_note else "")
            ),
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
        "message": error_note,
        "checkpoint": (run.meta or {}).get("checkpoint"),
    }
    if entry:
        payload["last_ledger"] = entry
        await _emit_event_appended(run, entry)
    return payload


async def recover_auto_failure(
    session: AsyncSession,
    run: FactoryRun,
    project: Project,
    exc: Exception,
    *,
    actor: str,
) -> dict:
    """Uma falha fora da etapa vira checkpoint, nunca uma página 500 sem explicação."""
    await session.rollback()
    explained = explain_stop(str(exc), "a etapa atual")
    note = explained["note"]
    try:
        await session.refresh(run)
        await session.refresh(project)
        stages = await list_stages(session, run.id)
        current = next((item for item in stages if item.stage_def_id == run.current_stage_id), None)
        if current is not None:
            explained = explain_stop(str(exc), current.title or "a etapa atual", current.stage_def_id)
            note = explained["note"]
            await _commit_checkpoint(
                session,
                run,
                project,
                current,
                status="error",
                note=note,
                actor=actor,
                action=explained["action"],
                problem=explained["problem"],
                solution=explained["solution"],
            )
    except Exception:
        await session.rollback()
    try:
        await session.refresh(run)
        stages = await list_stages(session, run.id)
        payload = serialize_run(run, stages)
    except Exception:
        await session.rollback()
        payload = {}
    payload["auto"] = {
        "steps": [],
        "stop_reason": "error",
        "steps_count": 0,
        "message": note,
        "checkpoint": (run.meta or {}).get("checkpoint") if getattr(run, "meta", None) else None,
    }
    return payload
