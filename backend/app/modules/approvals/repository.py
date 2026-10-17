"""Approval repository — async CRUD and human decision records for approvals table."""
from datetime import datetime, timezone
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.approval import Approval
from app.models.event import Event


class ApprovalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        status: str | None = None,
        impact: str | None = None,
        approval_type: str | None = None,
    ) -> list[Approval]:
        query = select(Approval)
        if status:
            query = query.where(Approval.status == status)
        if impact:
            query = query.where(Approval.impact == impact)
        if approval_type:
            query = query.where(Approval.type == approval_type)

        query = query.order_by(Approval.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, approval_id: str) -> Approval | None:
        return await self.session.get(Approval, approval_id)

    async def create(self, approval: Approval) -> Approval:
        self.session.add(approval)
        await self.session.flush()
        return approval

    async def decide(
        self,
        approval_id: str,
        decision: str,
        decided_by: str = "CEO",
        justification: str | None = None,
    ) -> Approval | None:
        approval = await self.get_by_id(approval_id)
        if not approval:
            return None

        previous_status = approval.status
        new_status = "approved" if decision.lower() in ("approve", "approved") else "rejected"

        approval.status = new_status
        approval.decided_by = decided_by
        approval.justification = justification
        approval.decided_at = datetime.now(timezone.utc)

        # Audit event recording
        event = Event(
            id=str(uuid.uuid4()),
            approval_id=approval.id,
            job_id=approval.job_id,
            task_id=approval.task_id,
            event_type=f"approval_{new_status}",
            previous_state=previous_status,
            new_state=new_status,
            actor=decided_by,
            action=f"Decisão humana: {new_status.upper()}",
            details=justification or f"Aprovação {approval.id} marcada como {new_status}",
        )
        self.session.add(event)

        await self.session.flush()
        return approval
