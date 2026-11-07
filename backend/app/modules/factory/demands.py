"""Ciclo de vida de uma demanda: pasta própria, dossiê e cerca de status."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.approval import Approval
from app.models.factory_demand import FactoryDemand
from app.models.project import Project
from app.modules.factory.project_control import (
    automation_block_reason,
    ensure_layout,
    normalize_control,
)

STATUSES = (
    "rascunho",
    "entendimento",
    "refino",
    "aceite",
    "correcao",
    "compilacao",
    "entrega",
    "concluida",
)
TERMINAL = {"concluida", "recusada"}
NEXT_STATUS = {
    "rascunho": "entendimento",
    "entendimento": "refino",
    "refino": "aceite",
    "aceite": "correcao",
    "correcao": "compilacao",
    "compilacao": "entrega",
    "entrega": "concluida",
}
ACTION_FOR = {
    "entendimento": "entender",
    "refino": "refinar",
    "aceite": "refinar",
    "correcao": "corrigir",
    "compilacao": "compilar",
    "entrega": "entregar",
    "concluida": "entregar",
}
STAGE_PHASE = {
    "brief": "entendimento",
    "m_gate0": "entendimento",
    "requirements": "refino",
    "architecture": "refino",
    "paula_plan": "refino",
    "m_diag": "refino",
    "plan_gate": "aceite",
    "visual_gate": "aceite",
    "m_plan_gate": "aceite",
    "visual_proof": "correcao",
    "build": "correcao",
    "qa": "correcao",
    "seo_sec": "correcao",
    "m_code": "correcao",
    "m_code_be": "correcao",
    "m_code_fe": "correcao",
    "m_qa": "correcao",
    "m_qa_be": "correcao",
    "m_qa_fe": "correcao",
    "m_qa_jornada": "correcao",
    "m_seo_sec": "correcao",
    "m_hard": "correcao",
    "m_apk": "compilacao",
    "build_apk": "compilacao",
    "docs": "entrega",
    "m_docs": "entrega",
    "final_gate": "entrega",
    "m_final": "entrega",
}
PHASE_ALLOWED = {
    "entendimento": {"rascunho", "entendimento"},
    "refino": {"entendimento", "refino"},
    "aceite": {"refino", "aceite"},
    "correcao": {"correcao"},
    "compilacao": {"correcao", "compilacao"},
    "entrega": {"compilacao", "entrega", "concluida"},
}


class DemandError(ValueError):
    pass


def phase_of_stage(stage_def_id: str) -> str | None:
    return STAGE_PHASE.get(stage_def_id)


def track_for(demand_type: str) -> str:
    return "zero" if demand_type == "criacao" else "pronto"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _control(project: Project) -> dict:
    return normalize_control(getattr(project, "control", None))


async def next_code(session: AsyncSession, project_id: str) -> str:
    rows = (
        await session.execute(select(FactoryDemand.code).where(FactoryDemand.project_id == project_id))
    ).scalars().all()
    highest = 0
    for code in rows:
        piece = str(code).split("-")[-1]
        if piece.isdigit():
            highest = max(highest, int(piece))
    return f"DEM-{highest + 1:03d}"


def _pointer(demand_dir: Path, memory_dir: Path) -> None:
    link = demand_dir / "memory"
    if link.exists() or link.is_symlink():
        return
    try:
        link.symlink_to(memory_dir, target_is_directory=True)
    except OSError:
        link.mkdir(parents=True, exist_ok=True)
        (link / "origem.txt").write_text(str(memory_dir), encoding="utf-8")


def prepare_folder(project: Project, code: str) -> Path:
    paths = ensure_layout(project.local_path)
    folder = paths["demandas"] / code
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "qa" / "orders").mkdir(parents=True, exist_ok=True)
    (folder / "qa" / "evidence").mkdir(parents=True, exist_ok=True)
    _pointer(folder, paths["memory"])
    return folder


def artifact_names(folder: Path) -> list[str]:
    names = []
    for relative in ("entendimento.md", "refino.md", "qa/falha.md", "qa/correcao-feita.md", "changelog.md"):
        if (folder / relative).is_file():
            names.append(relative)
    if (folder / "pacote").is_dir():
        names.append("pacote/")
    return names


def write_dossier_file(demand: FactoryDemand) -> None:
    folder = Path(demand.folder)
    folder.mkdir(parents=True, exist_ok=True)
    data = demand.dossier if isinstance(demand.dossier, dict) else {}
    accepted = data.get("aceito") or "—"
    missing = data.get("falta") or "—"
    stage = data.get("etapa") or "—"
    arts = ", ".join(artifact_names(folder)) or "—"
    body = (
        f"# Dossiê {demand.code}\n\n"
        f"- Código: {demand.code}\n"
        f"- Tipo: {demand.type}\n"
        f"- Status: {demand.status}\n"
        f"- Etapa: {stage}\n"
        f"- Aceito: {accepted}\n"
        f"- Falta: {missing}\n"
        f"- Artefatos: {arts}\n\n"
        f"## Resumo\n\n{demand.summary or 'Sem resumo.'}\n"
    )
    (folder / "dossie.md").write_text(body, encoding="utf-8")


def portrait(project: Project, demand: FactoryDemand | None, *, stage: str | None = None, messages: list[str] | None = None) -> str:
    """Retrato sem caminho de disco e sem dado de outro projeto."""
    lines = [
        f"Projeto: {project.name} ({project.slug}).",
    ]
    if demand is None:
        lines.append("Nenhuma demanda aberta. Leia só a pasta fonte deste projeto.")
    else:
        lines.append(f"Demanda: {demand.code}. Status: {demand.status}. Tipo: {demand.type}.")
        lines.append(f"Etapa: {stage or (demand.dossier or {}).get('etapa') or '—'}.")
        lines.append("Artefatos: " + (", ".join(artifact_names(Path(demand.folder))) or "nenhum"))
        dossier = Path(demand.folder) / "dossie.md"
        if dossier.is_file():
            lines.append("Dossiê:")
            lines.append(dossier.read_text(encoding="utf-8")[:1200])
    if messages:
        lines.append("Mensagens deste projeto:")
        lines.extend(messages[-6:])
    return "\n".join(lines)


def chat_workspace(project: Project, demand: FactoryDemand | None) -> Path:
    paths = ensure_layout(project.local_path)
    if demand is not None and demand.status not in TERMINAL:
        return Path(demand.folder)
    return paths["fonte"]


def order_path_for(workspace: Path) -> Path:
    return workspace / "qa" / "orders" / "pedido.md"


async def create_demand(
    session: AsyncSession,
    project: Project,
    *,
    title: str,
    demand_type: str = "criacao",
    summary: str = "",
    opt_out: bool | None = None,
) -> FactoryDemand:
    if demand_type not in {"criacao", "manutencao", "correcao"}:
        raise DemandError("Tipo de demanda desconhecido.")
    if not (title or "").strip():
        raise DemandError("A demanda precisa de um título.")
    control = _control(project)
    code = await next_code(session, project.id)
    folder = prepare_folder(project, code)
    if opt_out is None:
        opt_out = bool(control["automation"]["novas_entram_manuais"])
    sla = None
    for item in control["slas"]:
        if item["tipo"] == demand_type:
            sla = _now() + timedelta(days=item["dias"])
            break
    demand = FactoryDemand(
        id=str(uuid.uuid4()),
        project_id=project.id,
        code=code,
        title=title.strip(),
        type=demand_type,
        track=track_for(demand_type),
        status="rascunho",
        folder=str(folder),
        summary=summary.strip(),
        opt_out=bool(opt_out),
        sla_due_at=sla,
        dossier={"aceito": "—", "falta": "entendimento.md", "etapa": "—"},
    )
    session.add(demand)
    await session.flush()
    write_dossier_file(demand)
    await bind_demand_run(session, project, demand)
    return demand


def template_for_demand(project: Project, demand: FactoryDemand) -> str:
    from app.modules.factory.esteiras import resolve_template_code

    raw = (project.template_code or "lp-c").strip().lower()
    category = raw.split("-")[0] if raw else "lp"
    return resolve_template_code(category, demand.track)


def _point_run(run, demand: FactoryDemand) -> None:
    run.workspace_path = demand.folder
    meta = dict(run.meta or {})
    meta["demand_id"] = demand.id
    run.meta = meta
    flag_modified(run, "meta")


async def bind_demand_run(session: AsyncSession, project: Project, demand: FactoryDemand) -> None:
    """A esteira desta demanda lê e grava na pasta dela, não na raiz do projeto."""
    if demand.run_id:
        return
    from app.modules.factory.run_service import get_active_run, materialize_run_for_project

    code = template_for_demand(project, demand)
    active = await get_active_run(session, project.id)
    if active is not None:
        owner = str((active.meta or {}).get("demand_id") or "")
        if owner and owner != demand.id:
            return
        if (active.template_code or "").lower() != code:
            return
        _point_run(active, demand)
        demand.run_id = active.id
        return
    run = await materialize_run_for_project(
        session,
        project,
        template_code=code,
        workspace_path=demand.folder,
        demand_id=demand.id,
    )
    owner = str((run.meta or {}).get("demand_id") or "")
    if owner and owner != demand.id:
        return
    _point_run(run, demand)
    demand.run_id = run.id


async def list_demands(session: AsyncSession, project_id: str) -> list[FactoryDemand]:
    rows = (
        await session.execute(
            select(FactoryDemand)
            .where(FactoryDemand.project_id == project_id)
            .order_by(FactoryDemand.created_at.asc())
        )
    ).scalars().all()
    return list(rows)


async def get_demand(session: AsyncSession, demand_id: str) -> FactoryDemand | None:
    return await session.get(FactoryDemand, demand_id)


async def open_demand(session: AsyncSession, project_id: str, demand_id: str | None = None) -> FactoryDemand | None:
    if demand_id:
        row = await get_demand(session, demand_id)
        if row and row.project_id == project_id and row.status not in TERMINAL:
            return row
        if row and row.project_id == project_id:
            return row
    rows = await list_demands(session, project_id)
    for row in reversed(rows):
        if row.status not in TERMINAL:
            return row
    return rows[-1] if rows else None


def _touch(demand: FactoryDemand, **fields) -> None:
    data = dict(demand.dossier or {})
    data.update(fields)
    demand.dossier = data
    flag_modified(demand, "dossier")
    demand.updated_at = _now()
    write_dossier_file(demand)


def _proof_ok(folder: Path, status: str) -> str | None:
    if status == "entendimento" and not (folder / "entendimento.md").is_file():
        return "Falta entendimento.md nesta demanda."
    if status == "refino" and not (folder / "refino.md").is_file():
        return "Falta refino.md nesta demanda."
    if status == "correcao" and (folder / "qa" / "falha.md").is_file() and not (folder / "qa" / "correcao-feita.md").is_file():
        return "A falha está registrada e a correção ainda não foi feita."
    if status == "entrega":
        if not (folder / "changelog.md").is_file() or not (folder / "pacote").is_dir():
            return "A entrega precisa de pacote/ e changelog.md."
    return None


async def _approval(session: AsyncSession, approval_id: str | None) -> Approval | None:
    if not approval_id:
        return None
    return await session.get(Approval, approval_id)


async def _ensure_approval(session: AsyncSession, demand: FactoryDemand, kind: str, title: str) -> Approval:
    data = dict(demand.dossier or {})
    current = await _approval(session, data.get(kind))
    if current and current.status == "pending":
        return current
    approval = Approval(
        id=f"ap-{uuid.uuid4().hex[:8]}",
        title=title,
        type=kind,
        status="pending",
        impact="high",
        reason=f"{demand.code} · {demand.title}",
        description=demand.summary or demand.title,
    )
    session.add(approval)
    await session.flush()
    data[kind] = approval.id
    demand.dossier = data
    flag_modified(demand, "dossier")
    return approval


async def advance(session: AsyncSession, project: Project, demand: FactoryDemand) -> FactoryDemand:
    if demand.project_id != project.id:
        raise DemandError("Esta demanda não pertence ao projeto aberto.")
    if demand.status in TERMINAL or demand.status == "recusada":
        raise DemandError("Esta demanda já encerrou.")
    nxt = NEXT_STATUS.get(demand.status)
    if not nxt:
        raise DemandError("Não há próximo passo.")
    control = _control(project)
    # Sair da compilação prepara a entrega. O interruptor só impede concluir sem aceite.
    skip_flag = demand.status in {"compilacao", "entrega"} and nxt in {"entrega", "concluida"}
    if not skip_flag:
        reason = automation_block_reason(
            control,
            demand_type=demand.type,
            opt_out=bool(demand.opt_out),
            action=ACTION_FOR[nxt],
        )
        if reason:
            raise DemandError(reason)
    folder = Path(demand.folder)
    proof = _proof_ok(folder, demand.status)
    if proof:
        raise DemandError(proof)
    if demand.status == "aceite":
        approval = await _approval(session, (demand.dossier or {}).get("approval_aceite"))
        if approval is None or approval.status != "approved":
            raise DemandError("Sem aceite, a correção e o código não começam.")
        _touch(demand, aceito="aceite do plano", falta="correção com prova, se houver falha")
    if demand.status == "refino":
        await _ensure_approval(session, demand, "approval_aceite", f"Aceite do refino {demand.code}")
        _touch(demand, falta="aceite humano")
    if demand.status == "correcao":
        from app.modules.factory.compile_step import compile_demand

        compile_demand(project, demand)
        _touch(demand, falta="pacote e changelog")
    if demand.status == "compilacao":
        from app.modules.factory.compile_step import publish_package

        publish_package(project, demand)
        if not control["automation"]["auto_entregar"]:
            await _ensure_approval(session, demand, "approval_entrega", f"Entrega {demand.code}")
            demand.status = "entrega"
            _touch(demand, falta="aceite da entrega")
            return demand
    if demand.status == "entrega":
        if not control["automation"]["auto_entregar"]:
            approval = await _approval(session, (demand.dossier or {}).get("approval_entrega"))
            if approval is None or approval.status != "approved":
                raise DemandError("A entrega espera em Aprovações.")
        _touch(demand, aceito="entrega", falta="—")
    demand.status = nxt
    if nxt == "entendimento":
        _touch(demand, falta="entendimento.md")
    elif nxt == "refino":
        _touch(demand, falta="refino.md")
    elif nxt == "correcao":
        _touch(demand, falta="qa/falha.md se houver falha; senão compilação")
    else:
        write_dossier_file(demand)
    return demand


async def reject(session: AsyncSession, project: Project, demand: FactoryDemand, motive: str) -> FactoryDemand:
    if demand.project_id != project.id:
        raise DemandError("Esta demanda não pertence ao projeto aberto.")
    if demand.status not in {"aceite", "entrega"}:
        raise DemandError("Só dá para recusar no aceite ou na entrega.")
    text = (motive or "").strip()
    if not text:
        raise DemandError("A recusa precisa de um motivo.")
    demand.status = "recusada"
    _touch(demand, aceito="recusada", falta="—", motivo=text)
    note = Path(demand.folder) / "dossie.md"
    note.write_text(note.read_text(encoding="utf-8") + f"\n## Recusa\n\n{text}\n", encoding="utf-8")
    return demand


def correction_block(demand: FactoryDemand) -> str | None:
    """A correção só dispara com falha registrada e com o aceite já concedido."""
    if demand.status != "correcao":
        return "Sem aceite, a correção e o código não começam."
    falha = Path(demand.folder) / "qa" / "falha.md"
    if not falha.is_file():
        return "Sem qa/falha.md, a correção não dispara."
    return None


def guard_stage_reason(project: Project, demand: FactoryDemand | None, stage_def_id: str) -> str | None:
    if demand is None:
        return None
    phase = phase_of_stage(stage_def_id)
    if phase is None:
        return None
    if demand.status not in PHASE_ALLOWED[phase]:
        return f"A etapa {stage_def_id} não cabe no status {demand.status}."
    action = ACTION_FOR.get(phase if phase != "aceite" else "aceite", "")
    if phase == "aceite":
        action = "refinar"
    reason = automation_block_reason(
        _control(project),
        demand_type=demand.type,
        opt_out=bool(demand.opt_out),
        action=action,
    )
    if reason:
        return reason
    if phase == "correcao" and demand.status != "correcao":
        return "Sem aceite, a correção e o código não começam."
    return None


def register_failure(demand: FactoryDemand, text: str) -> Path:
    body = (text or "").strip()
    if not body:
        raise DemandError("A falha precisa dizer o que falhou, como falhou e o que ajustar.")
    path = Path(demand.folder) / "qa" / "falha.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    write_dossier_file(demand)
    return path
