"""Agents API router — management, soul editor and roster query."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.shared.database import get_session
from app.modules.agents.repository import AgentRepository
from app.api.v1.schemas import AgentResponse

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


class UpdateAgentRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    sector: str | None = None
    status: str | None = None
    skills: str | None = None
    model_provider: str | None = None
    soul_text: str | None = None
    avatar_color: str | None = None
    initials: str | None = None

    model_config = {"protected_namespaces": ()}


class SoulRequest(BaseModel):
    soul_text: str


class SoulResponse(BaseModel):
    agent_id: str
    soul_text: str | None = None


@router.get("/", response_model=list[AgentResponse])
async def list_agents(
    sector: str | None = Query(None),
    q: str | None = Query(None),
    status: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    return await repo.list_all(sector=sector, search=q, status=status)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, session: AsyncSession = Depends(get_session)):
    repo = AgentRepository(session)
    agent = await repo.get_by_id(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    req: UpdateAgentRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    updates = req.model_dump(exclude_unset=True)
    agent = await repo.update(agent_id, **updates)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/{agent_id}/soul", response_model=SoulResponse)
async def get_agent_soul(agent_id: str, session: AsyncSession = Depends(get_session)):
    repo = AgentRepository(session)
    agent = await repo.get_by_id(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return SoulResponse(agent_id=agent.id, soul_text=agent.soul_text)


@router.put("/{agent_id}/soul", response_model=SoulResponse)
async def update_agent_soul(
    agent_id: str,
    req: SoulRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    agent = await repo.update_soul(agent_id, req.soul_text)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    await session.commit()
    await session.refresh(agent)
    return SoulResponse(agent_id=agent.id, soul_text=agent.soul_text)