"""Approvals API router — human-in-the-loop decisions and governance."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.approvals.repository import ApprovalRepository
from app.modules.jobs.runner import JobRunner
from app.models.approval import Approval
from app.models.job import Job

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])


class CreateApprovalRequest(BaseModel):
    title: str
    type: str = "authorization"
    job_id: str | None = None
    task_id: str | None = None
    requester_agent_id: str | None = None
    impact: str = "medium"
    reason: str | None = None
    description: str | None = None
    on_approve_text: str | None = None
    on_reject_text: str | None = None


class DecideApprovalRequest(BaseModel):
    decision: str  # "approve" | "reject"
    decided_by: str = "CEO"
    justification: str | None = None


class ApprovalResponse(BaseModel):
    id: str
    title: str | None = None
    type: str | None = None
    job_id: str | None = None
    task_id: str | None = None
    requester_agent_id: str | None = None
    status: str
    impact: str | None = None
    reason: str | None = None
    description: str | None = None
    on_approve_text: str | None = None
    on_reject_text: str | None = None
    decided_by: str | None = None
    justification: str | None = None
    decided_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[ApprovalResponse])
async def list_approvals(
    status: str | None = Query(None),
    impact: str | None = Query(None),
    approval_type: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = ApprovalRepository(session)
    return await repo.list_all(status=status, impact=impact, approval_type=approval_type)


@router.post("/", response_model=ApprovalResponse, status_code=201)
async def create_approval(
    req: CreateApprovalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ApprovalRepository(session)
    approval = Approval(
        id=f"ap-{str(uuid.uuid4())[:8]}",
        title=req.title,
        type=req.type,
        job_id=req.job_id,
        task_id=req.task_id,
        requester_agent_id=req.requester_agent_id,
        impact=req.impact,
        reason=req.reason,
        description=req.description,
        on_approve_text=req.on_approve_text,
        on_reject_text=req.on_reject_text,
        status="pending",
    )
    await repo.create(approval)
    await session.commit()
    await session.refresh(approval)
    return approval


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, session: AsyncSession = Depends(get_session)):
    repo = ApprovalRepository(session)
    approval = await repo.get_by_id(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")
    return approval


@router.post("/{approval_id}/decide", response_model=ApprovalResponse)
async def decide_approval(
    approval_id: str,
    req: DecideApprovalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ApprovalRepository(session)
    approval = await repo.decide(
        approval_id=approval_id,
        decision=req.decision,
        decided_by=req.decided_by,
        justification=req.justification,
    )
    if not approval:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")

    # If approved and linked to a job that was failed, auto-retry the job
    if req.decision.lower() in ("approve", "approved") and approval.job_id:
        job = await session.get(Job, approval.job_id)
        if job and job.status == "failed":
            runner = JobRunner(session)
            await runner.retry_job(job.id)

    await session.commit()
    await session.refresh(approval)
    return approval
