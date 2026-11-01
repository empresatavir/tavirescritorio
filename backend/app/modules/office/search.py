"""Busca em telas, tasks, agentes, jobs, casos e propostas."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase
from app.models.task import Task

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

    return {"q": term, "items": items}
