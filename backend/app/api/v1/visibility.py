"""Visibility & Knowledge API router — workflows, ideas, integrations, knowledge."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.visibility.repository import (
    WorkflowRepository,
    IdeaRepository,
    IntegrationCheckRepository,
    KnowledgeEntryRepository,
)
from app.models.workflow import Workflow
from app.models.idea import Idea
from app.models.integration_check import IntegrationCheck
from app.models.knowledge_entry import KnowledgeEntry

router = APIRouter(prefix="/api/v1", tags=["visibility"])


# --- Schemas ---

class WorkflowResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str | None = None
    steps: Any | None = None
    trigger_type: str
    status: str
    sort_order: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class IdeaResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    source: str | None = None
    status: str
    priority: str
    project_id: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class IntegrationCheckResponse(BaseModel):
    id: str
    integration_name: str
    status: str
    last_checked_at: datetime | None = None
    response_time_ms: int | None = None
    error_message: str | None = None
    extra_metadata: Any | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class KnowledgeEntryResponse(BaseModel):
    id: str
    title: str
    content: str | None = None
    source_type: str
    source_path: str | None = None
    tags: Any | None = None
    extra_metadata: Any | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Workflows ---

@router.get("/workflows", response_model=list[WorkflowResponse])
async def list_workflows(session: AsyncSession = Depends(get_session)):
    repo = WorkflowRepository(session)
    return await repo.list_all()


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def create_workflow(req: dict, session: AsyncSession = Depends(get_session)):
    workflow = Workflow(
        id=str(uuid.uuid4()),
        name=req["name"],
        category=req.get("category", "general"),
        description=req.get("description"),
        steps=req.get("steps"),
        trigger_type=req.get("trigger_type", "manual"),
        sort_order=req.get("sort_order", 0),
    )
    repo = WorkflowRepository(session)
    created = await repo.create(workflow)
    await session.commit()
    return created


# --- Ideas ---

@router.get("/ideas", response_model=list[IdeaResponse])
async def list_ideas(session: AsyncSession = Depends(get_session)):
    repo = IdeaRepository(session)
    return await repo.list_all()


@router.post("/ideas", response_model=IdeaResponse, status_code=201)
async def create_idea(req: dict, session: AsyncSession = Depends(get_session)):
    idea = Idea(
        id=str(uuid.uuid4()),
        title=req["title"],
        description=req.get("description"),
        source=req.get("source"),
        priority=req.get("priority", "medium"),
        project_id=req.get("project_id"),
    )
    repo = IdeaRepository(session)
    created = await repo.create(idea)
    await session.commit()
    return created


# --- Integration Checks ---

@router.get("/integrations", response_model=list[IntegrationCheckResponse])
async def list_integration_checks(session: AsyncSession = Depends(get_session)):
    repo = IntegrationCheckRepository(session)
    return await repo.list_all()


# --- Knowledge ---

@router.get("/knowledge", response_model=list[KnowledgeEntryResponse])
async def list_knowledge(
    q: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = KnowledgeEntryRepository(session)
    if q:
        return await repo.search(q)
    return await repo.list_all()