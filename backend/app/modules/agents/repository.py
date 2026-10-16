"""Agent repository — async CRUD for agents table."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.agent import Agent


class AgentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Agent]:
        result = await self.session.execute(select(Agent).order_by(Agent.name))
        return list(result.scalars().all())

    async def get_by_id(self, agent_id: str) -> Agent | None:
        return await self.session.get(Agent, agent_id)

    async def create(self, agent: Agent) -> Agent:
        self.session.add(agent)
        await self.session.flush()
        return agent