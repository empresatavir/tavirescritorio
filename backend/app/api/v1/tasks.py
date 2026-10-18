"""Tasks API router — CRUD and kanban status transitions for operational tasks."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.tasks.repository import TaskRepository
from app.models.task import Task

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


class CreateTaskRequest(BaseModel):
    project_id: str = "tavir-core"
    title: str
    description: str | None = None
    status: str = "pending"
    priority: str = "medium"
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    seq: int | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    active_job_id: str | None = None


class TaskResponse(BaseModel):
    id: str
    seq: int | None = None
    project_id: str
    title: str
    description: str | None = None
    status: str
    priority: str
    assignee_agent_id: str | None = None
    sector: str | None = None
    escalation: str | None = None
    handoffs: Any | None = None
    gates: Any | None = None
    tags: Any | None = None
    active_job_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    project_id: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = TaskRepository(session)
    return await repo.list_all(status=status, priority=priority, project_id=project_id)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(req: CreateTaskRequest, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    task = Task(
        id=str(uuid.uuid4()),
        project_id=req.project_id,
        title=req.title,
        description=req.description,
        status=req.status,
        priority=req.priority,
        assignee_agent_id=req.assignee_agent_id,
        sector=req.sector,
        escalation=req.escalation,
        handoffs=req.handoffs,
        gates=req.gates,
        tags=req.tags,
        seq=req.seq,
    )
    await repo.create(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    req: UpdateTaskStatusRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TaskRepository(session)
    task = await repo.update_status(task_id, req.status)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    req: UpdateTaskRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = TaskRepository(session)
    updates = req.model_dump(exclude_unset=True)
    task = await repo.update(task_id, **updates)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    await session.commit()
    await session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_session)):
    repo = TaskRepository(session)
    deleted = await repo.delete(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    await session.commit()
    return None
