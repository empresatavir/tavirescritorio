"""Notificações derivadas de gate pendente, job falho e SLA estourado."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.models.factory_demand import FactoryDemand
from app.models.job import Job
from app.models.notification_read import NotificationRead
from app.modules.auth.clock import now

_CLOSED_DEMAND = {"concluido", "concluida", "cancelado", "cancelada"}


def _stamp(value: datetime | str | None) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


async def list_notifications(session: AsyncSession) -> dict:
    current = now()
    reads = {row.id for row in (await session.scalars(select(NotificationRead))).all()}
    items: list[dict] = []

    approvals = (await session.scalars(select(Approval).where(Approval.status == "pending"))).all()
    for approval in approvals:
        items.append(
            {
                "id": f"gate_{approval.id}",
                "kind": "gate",
                "source_id": approval.id,
                "title": approval.title or "Gate pendente",
                "detail": approval.reason or approval.description or "Decisão esperando você",
            }
        )

    jobs = (await session.scalars(select(Job).where(Job.status == "failed"))).all()
    for job in jobs:
        items.append(
            {
                "id": f"job_{job.id}",
                "kind": "job",
                "source_id": job.id,
                "title": "Job falhou",
                "detail": job.error_message or "A execução parou com erro",
            }
        )

    demands = (await session.scalars(select(FactoryDemand))).all()
    for demand in demands:
        if (demand.status or "").lower() in _CLOSED_DEMAND:
            continue
        due = _stamp(demand.sla_due_at)
        if due is None or due >= current:
            continue
        items.append(
            {
                "id": f"sla_{demand.id}",
                "kind": "sla",
                "source_id": demand.id,
                "title": demand.title,
                "detail": f"SLA estourou em {due.isoformat()}",
            }
        )

    for item in items:
        item["read"] = item["id"] in reads
    unread = sum(1 for item in items if not item["read"])
    return {"unread_count": unread, "items": items}


async def mark_read(session: AsyncSession, notification_id: str) -> NotificationRead:
    row = await session.get(NotificationRead, notification_id)
    if row is None:
        row = NotificationRead(id=notification_id, read_at=now())
        session.add(row)
        await session.commit()
    return row
