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
    craft_text: str | None = None


class SoulResponse(BaseModel):
    agent_id: str
    soul_text: str | None = None
    craft_text: str | None = None


class LessonResponse(BaseModel):
    id: str
    agent_id: str
    situation: str | None = None
    lesson: str
    why: str | None = None
    how_to_apply: str | None = None
    evidence: str | None = None
    approval_id: str | None = None
    status: str
    created_at: Any = None


class LessonStatusRequest(BaseModel):
    status: str


@router.get("/", response_model=list[AgentResponse])
async def list_agents(
    sector: str | None = Query(None),
    q: str | None = Query(None),
    status: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    return await repo.list_all(sector=sector, search=q, status=status)


@router.get("/sectors")
async def list_sectors(session: AsyncSession = Depends(get_session)):
    agents = await AgentRepository(session).list_all()
    grouped: dict[str, list[dict[str, str]]] = {}
    for agent in agents:
        grouped.setdefault(agent.sector, []).append(
            {"id": agent.id, "name": agent.name, "role": agent.role}
        )
    return {
        "sectors": [
            {"name": name, "agents": rows}
            for name, rows in sorted(grouped.items(), key=lambda item: item[0].lower())
        ]
    }


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
    updates.pop("soul_text", None)
    updates.pop("craft_text", None)
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
    return SoulResponse(agent_id=agent.id, soul_text=agent.soul_text, craft_text=agent.craft_text)


def _lesson_out(row) -> LessonResponse:
    return LessonResponse(
        id=row.id,
        agent_id=row.agent_id,
        situation=row.situation,
        lesson=row.lesson,
        why=row.why,
        how_to_apply=row.how_to_apply,
        evidence=row.evidence,
        approval_id=row.approval_id,
        status=row.status,
        created_at=row.created_at,
    )


@router.get("/{agent_id}/lessons", response_model=list[LessonResponse])
async def list_agent_lessons(agent_id: str, session: AsyncSession = Depends(get_session)):
    repo = AgentRepository(session)
    agent = await repo.get_by_id(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return [_lesson_out(row) for row in await repo.list_lessons(agent_id)]


@router.post("/{agent_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def set_agent_lesson_status(
    agent_id: str,
    lesson_id: str,
    req: LessonStatusRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    agent = await repo.get_by_id(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    row = await repo.set_lesson_status(lesson_id, req.status)
    if row is None or row.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Lição não encontrada")
    await session.commit()
    await session.refresh(row)
    return _lesson_out(row)


@router.put("/{agent_id}/soul", response_model=SoulResponse)
async def update_agent_soul(
    agent_id: str,
    req: SoulRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = AgentRepository(session)
    data = req.model_dump(exclude_unset=True)
    agent = await repo.update_soul(
        agent_id,
        data.get("soul_text", ""),
        data.get("craft_text"),
        update_craft="craft_text" in data,
    )
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    await session.commit()
    await session.refresh(agent)
    return SoulResponse(agent_id=agent.id, soul_text=agent.soul_text, craft_text=agent.craft_text)