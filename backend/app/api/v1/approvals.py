"""Approvals API router — human-in-the-loop decisions and governance."""
from datetime import datetime, timezone
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
    group: str | None = None
    kind: str | None = None
    question: str | None = None
    yes_steps: str | None = None
    no_steps: str | None = None
    sla_hours: int | None = None


class DecideApprovalRequest(BaseModel):
    decision: str  # "approve" | "reject"
    decided_by: str = "CEO"
    justification: str | None = None
    vault_name: str | None = None
    vault_value: str | None = None


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
    group: str | None = None
    kind: str | None = None
    question: str | None = None
    yes_steps: str | None = None
    no_steps: str | None = None
    sla_hours: int | None = None
    opened_at: datetime | None = None
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
        group=req.group,
        kind=req.kind,
        question=req.question,
        yes_steps=req.yes_steps,
        no_steps=req.no_steps,
        sla_hours=req.sla_hours,
        opened_at=datetime.now(timezone.utc),
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

    from app.modules.office.decisions import apply_decision
    from app.modules.office.vault import store_secret

    if req.decision.lower() in ("approve", "approved") and req.vault_name and req.vault_value:
        await store_secret(
            session,
            name=req.vault_name,
            value=req.vault_value,
            approval_id=approval.id,
        )

    await apply_decision(session, approval, req.decision)

    from app.modules.agents.lessons import propose_role_lesson

    await propose_role_lesson(
        session,
        approval.requester_agent_id,
        situation=approval.title or "Decisão de gate",
        lesson=req.justification or approval.justification or "",
        evidence=req.justification,
        approval_id=approval.id,
    )

    # If approved and linked to a job that was failed, auto-retry the job
    if req.decision.lower() in ("approve", "approved") and approval.job_id:
        job = await session.get(Job, approval.job_id)
        if job and job.status == "failed":
            runner = JobRunner(session)
            await runner.retry_job(job.id)

    await session.commit()
    await session.refresh(approval)
    return approval
