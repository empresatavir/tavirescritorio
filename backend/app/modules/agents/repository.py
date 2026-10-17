"""Agent repository — async CRUD, search and soul management for agents table."""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.agent import Agent


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

    async def update_soul(self, agent_id: str, soul_text: str) -> Agent | None:
        agent = await self.get_by_id(agent_id)
        if not agent:
            return None
        agent.soul_text = soul_text
        await self.session.flush()
        return agent

    async def delete(self, agent_id: str) -> bool:
        agent = await self.get_by_id(agent_id)
        if not agent:
            return False
        await self.session.delete(agent)
        await self.session.flush()
        return True