"""Lição de papel. Nasce proposta. Não grava alma nem ofício."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_lesson import AgentLesson
from app.modules.agents.repository import AgentRepository


async def propose_role_lesson(
    session: AsyncSession,
    agent_id: str | None,
    *,
    situation: str,
    lesson: str,
    evidence: str | None = None,
    approval_id: str | None = None,
) -> AgentLesson | None:
    text = (lesson or "").strip()
    if not agent_id or not text:
        return None
    agent = await session.get(Agent, agent_id)
    if agent is None:
        return None
    if approval_id:
        found = await session.execute(
            select(AgentLesson).where(AgentLesson.approval_id == approval_id)
        )
        if found.scalar_one_or_none() is not None:
            return None
    before = agent.soul_text
    row = await AgentRepository(session).add_lesson(
        agent_id,
        text[:400],
        agent_role=agent.role,
        situation=situation[:300],
        why=text[:400],
        how_to_apply="Aplicar na próxima entrega do mesmo tipo, se o CEO adotar.",
        evidence=(evidence or text)[:1000],
        approval_id=approval_id,
        status="proposta",
    )
    agent.soul_text = before
    return row
