"""Efeito de uma decisão humana: retoma o job, solta o gate e grava o livro."""
from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.models.job import Job
from app.models.task import Task
from app.modules.jobs.runner import JobRunner
from app.modules.office.ledger import record_event

_APPROVE = {"approve", "approved"}


def _approved(decision: str) -> bool:
    return decision.lower() in _APPROVE


async def apply_decision(session: AsyncSession, approval: Approval, decision: str) -> None:
    approved = _approved(decision)
    record_event(
        session,
        action="decisao.aprovada" if approved else "decisao.recusada",
        event_type="decisao",
        actor="operador",
        details=json.dumps(
            {
                "approval_id": approval.id,
                "kind": approval.kind,
                "group": approval.group,
                "question": approval.question,
            },
            ensure_ascii=False,
        ),
    )
    if not approved:
        return
    if approval.task_id:
        task = await session.get(Task, approval.task_id)
        if task is not None and task.gate_held:
            task.gate_held = False
            session.add(task)
    if approval.job_id:
        job = await session.get(Job, approval.job_id)
        if job is not None and job.status == "paused":
            await JobRunner(session).resume_job(job.id)
