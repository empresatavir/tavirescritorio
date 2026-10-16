"""Agents API router — read endpoints for agent roster."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_session
from app.modules.agents.repository import AgentRepository
from app.api.v1.schemas import AgentResponse

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("/", response_model=list[AgentResponse])
async def list_agents(session: AsyncSession = Depends(get_session)):
    repo = AgentRepository(session)
    agents = await repo.list_all()
    return agents