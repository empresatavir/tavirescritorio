"""Busca em telas, tasks, agentes, jobs, casos, propostas e base de conhecimento indexada na abertura."""
from __future__ import annotations

from pathlib import Path
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase
from app.models.task import Task

_BOOT_KNOWLEDGE_INDEX: list[dict] = []


def boot_index_knowledge() -> dict:
    """Indexa conhecimento/, sincron-brain/, agentes/escopo/ e projetos isolados na abertura do servidor."""
    global _BOOT_KNOWLEDGE_INDEX
    repo_root = Path(__file__).resolve().parents[4]
    indexed: list[dict] = []

    seed = repo_root / "sincron-brain" / "seed_tier1.md"
    if seed.is_file():
        try:
            text = seed.read_text(encoding="utf-8", errors="ignore")
            indexed.append({
                "kind": "memory",
                "id": "sincron-brain/seed_tier1.md",
                "label": "Sincron Brain · Memórias Tier 1 (Soul, Carlos, Preferências)",
                "href": "/memoria",
                "blob": text.casefold(),
            })
        except OSError:
            pass

    for folder_name, kind_label in (("conhecimento", "knowledge"), ("agentes/escopo", "canon")):
        base = repo_root / folder_name
        if not base.is_dir():
            continue
        for md in base.rglob("*.md"):
            if md.name.startswith("_"):
                continue
            try:
                rel = md.relative_to(repo_root).as_posix()
                content = md.read_text(encoding="utf-8", errors="ignore")
                title = md.stem.replace("-", " ")
                for line in content.splitlines()[:15]:
                    if line.startswith("# "):
                        title = line[2:].strip()
                        break
                indexed.append({
                    "kind": kind_label,
                    "id": rel,
                    "label": f"{title} ({md.parent.name})",
                    "href": "/memoria",
                    "blob": f"{title} {rel} {content[:1200]}".casefold(),
                })
            except OSError:
                continue

    _BOOT_KNOWLEDGE_INDEX = indexed
    return {"total_indexed": len(indexed)}

SCREENS = (
    ("room", "Sala de Operação", "/sala-operacao"),
    ("exec", "Execuções", "/execucoes"),
    ("tasks", "Tasks", "/tasks"),
    ("decisions", "Decisões", "/decisoes"),
    ("agents", "Agentes", "/agentes"),
    ("chat", "Chat", "/chat"),
    ("modhub", "Visão dos módulos", "/modulos"),
    ("raiox", "Raio-X", "/raiox"),
    ("studio", "Studio", "/studio"),
    ("fabrica", "Fábrica", "/fabrica"),
    ("flow", "Flow", "/flow"),
    ("edicao", "Edição", "/edicao"),
    ("funnel", "Funil", "/funil"),
    ("proposals", "Propostas", "/propostas"),
    ("finances", "Finanças", "/finances"),
    ("personas", "Personas", "/personas"),
    ("social", "Perfis e calendário", "/social"),
    ("comms", "Comunicações", "/comunicacoes"),
    ("brain", "Cérebro", "/cerebro"),
    ("memory", "Memória e biblioteca", "/memoria"),
    ("ideas", "Ideias", "/ideias"),
    ("mission", "Mission Control", "/mission-control"),
    ("roadmap", "Roadmap", "/roadmap"),
    ("mapa", "Mapa operacional", "/mapa"),
    ("analytics", "Analytics", "/analytics"),
    ("doctor", "Doctor", "/doctor"),
    ("skills", "Skills", "/skills"),
    ("org", "Org Chart", "/org-chart"),
    ("config", "Configurações", "/configuracoes"),
)


def _needle(q: str) -> str:
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _hit(kind: str, item_id: str, label: str, href: str) -> dict:
    return {"kind": kind, "id": item_id, "label": label, "href": href}


async def search_office(session: AsyncSession, q: str) -> dict:
    term = q.strip()
    if not term:
        return {"q": q, "items": []}
    folded = term.casefold()
    pattern = _needle(term)
    items: list[dict] = []

    for screen_id, label, href in SCREENS:
        if folded in label.casefold():
            items.append(_hit("screen", screen_id, label, href))

    tasks = (
        await session.scalars(
            select(Task).where(or_(Task.title.ilike(pattern, escape="\\"), Task.description.ilike(pattern, escape="\\"))).limit(20)
        )
    ).all()
    for task in tasks:
        items.append(_hit("task", task.id, task.title, "/tasks"))

    agents = (
        await session.scalars(
            select(Agent).where(or_(Agent.name.ilike(pattern, escape="\\"), Agent.role.ilike(pattern, escape="\\"))).limit(20)
        )
    ).all()
    for agent in agents:
        items.append(_hit("agent", agent.id, agent.name, "/agentes"))

    jobs = (
        await session.scalars(
            select(Job)
            .where(or_(Job.error_message.ilike(pattern, escape="\\"), Job.model_name.ilike(pattern, escape="\\")))
            .limit(20)
        )
    ).all()
    for job in jobs:
        items.append(_hit("job", job.id, job.error_message or job.model_name or job.id, "/execucoes"))

    cases = (
        await session.scalars(
            select(RaioxCase)
            .where(or_(RaioxCase.company_name.ilike(pattern, escape="\\"), RaioxCase.objective.ilike(pattern, escape="\\")))
            .limit(20)
        )
    ).all()
    for case in cases:
        items.append(_hit("case", case.id, case.company_name, f"/raiox/{case.id}"))

    proposals = (
        await session.scalars(
            select(Proposal)
            .where(
                or_(
                    Proposal.client.ilike(pattern, escape="\\"),
                    Proposal.num.ilike(pattern, escape="\\"),
                    Proposal.summary.ilike(pattern, escape="\\"),
                )
            )
            .limit(20)
        )
    ).all()
    for proposal in proposals:
        items.append(_hit("proposal", proposal.id, f"{proposal.num} · {proposal.client}", "/propostas"))

    if not _BOOT_KNOWLEDGE_INDEX:
        boot_index_knowledge()
    kn_matches = 0
    for kn in _BOOT_KNOWLEDGE_INDEX:
        if folded in kn["blob"]:
            items.append(_hit(kn["kind"], kn["id"], kn["label"], kn["href"]))
            kn_matches += 1
            if kn_matches >= 20:
                break

    return {"q": term, "items": items}
