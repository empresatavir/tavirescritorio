"""Agent repository — async CRUD, search and soul management for agents table."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.agent import Agent
from app.models.agent_lesson import AgentLesson


class AgentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        sector: str | None = None,
        search: str | None = None,
        status: str | None = None,
    ) -> list[Agent]:
        query = select(Agent)
        if sector and sector.lower() != "todos":
            query = query.where(Agent.sector == sector)
        if status:
            query = query.where(Agent.status == status)
        if search:
            pattern = f"%{search.lower()}%"
            query = query.where(
                or_(
                    Agent.name.ilike(pattern),
                    Agent.role.ilike(pattern),
                    Agent.sector.ilike(pattern),
                    Agent.skills.ilike(pattern),
                )
            )

        query = query.order_by(Agent.id.asc(), Agent.name.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, agent_id: str) -> Agent | None:
        return await self.session.get(Agent, agent_id)

    async def create(self, agent: Agent) -> Agent:
        self.session.add(agent)
        await self.session.flush()
        return agent

    async def update(self, agent_id: str, **kwargs: Any) -> Agent | None:
        agent = await self.get_by_id(agent_id)
        if not agent:
            return None
        for key, val in kwargs.items():
            if hasattr(agent, key) and val is not None:
                setattr(agent, key, val)
        await self.session.flush()
        return agent

    async def update_soul(
        self,
        agent_id: str,
        soul_text: str,
        craft_text: str | None = None,
        *,
        update_craft: bool = False,
    ) -> Agent | None:
        """Gravação explícita do editor. Job e fábrica não chamam este método."""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return None
        agent.soul_text = soul_text
        if update_craft:
            agent.craft_text = craft_text
        await self.session.flush()
        return agent

    async def list_lessons(self, agent_id: str) -> list[AgentLesson]:
        query = (
            select(AgentLesson)
            .where(AgentLesson.agent_id == agent_id)
            .order_by(AgentLesson.created_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def add_lesson(
        self,
        agent_id: str,
        lesson: str,
        *,
        agent_role: str | None = None,
        situation: str | None = None,
        why: str | None = None,
        how_to_apply: str | None = None,
        evidence: str | None = None,
        approval_id: str | None = None,
        status: str = "proposta",
    ) -> AgentLesson:
        row = AgentLesson(
            id=f"ls-{uuid.uuid4().hex[:8]}",
            agent_id=agent_id,
            agent_role=agent_role,
            situation=situation,
            lesson=lesson,
            why=why,
            how_to_apply=how_to_apply,
            evidence=evidence,
            approval_id=approval_id,
            status=status,
            adopted_at=datetime.now(timezone.utc) if status == "adotada" else None,
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def set_lesson_status(self, lesson_id: str, status: str) -> AgentLesson | None:
        row = await self.session.get(AgentLesson, lesson_id)
        if row is None or status not in {"proposta", "adotada", "aposentada"}:
            return None
        row.status = status
        row.adopted_at = datetime.now(timezone.utc) if status == "adotada" else None
        await self.session.flush()
        return row

    async def delete(self, agent_id: str) -> bool:
        agent = await self.get_by_id(agent_id)
        if not agent:
            return False
        await self.session.delete(agent)
        await self.session.flush()
        return True