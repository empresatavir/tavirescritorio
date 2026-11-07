"""Amostras de custo, tetos e a série de analytics."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.models.job import Job
from app.models.usage_sample import UsageSample
from app.modules.auth.clock import now
from app.modules.auth.service import office_row
from app.modules.office.ledger import record_event

_RANGES = {"14d": 14, "30d": 30}


def _stamp(value: datetime | str | None) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str) and value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


async def set_ceilings(session: AsyncSession, daily_usd: float | None, monthly_usd: float | None) -> dict:
    row = await office_row(session)
    row.daily_ceiling_usd = daily_usd
    row.monthly_ceiling_usd = monthly_usd
    await session.commit()
    return {"daily_ceiling_usd": daily_usd, "monthly_ceiling_usd": monthly_usd}


async def _samples(session: AsyncSession) -> list[UsageSample]:
    return list((await session.scalars(select(UsageSample))).all())


def _on_day(sample: UsageSample, day: datetime) -> bool:
    stamp = _stamp(sample.sampled_at)
    return stamp is not None and stamp.date() == day.date()


def _in_month(sample: UsageSample, moment: datetime) -> bool:
    stamp = _stamp(sample.sampled_at)
    return stamp is not None and stamp.year == moment.year and stamp.month == moment.month


async def record_usage(
    session: AsyncSession,
    *,
    job_id: str,
    cost_usd: float,
    tokens: int,
    model: str | None,
    at: datetime | None,
) -> dict:
    job = await session.get(Job, job_id)
    if job is None:
        return {"ok": False, "status": 404}
    moment = at or now()
    sample = UsageSample(
        id=str(uuid.uuid4()),
        job_id=job.id,
        model_name=model,
        cost_usd=cost_usd,
        tokens=tokens,
        sampled_at=moment,
    )
    session.add(sample)
    job.cost_usd = float(job.cost_usd or 0) + cost_usd
    job.tokens_total = int(job.tokens_total or 0) + tokens
    await session.flush()

    office = await office_row(session)
    rows = await _samples(session)
    day_total = sum(row.cost_usd for row in rows if _on_day(row, moment))
    month_total = sum(row.cost_usd for row in rows if _in_month(row, moment))
    reason = None
    if job.budget_ceiling is not None and float(job.cost_usd) >= float(job.budget_ceiling):
        reason = "Teto do job atingido"
    elif office.daily_ceiling_usd is not None and day_total >= float(office.daily_ceiling_usd):
        reason = "Teto diário atingido"
    elif office.monthly_ceiling_usd is not None and month_total >= float(office.monthly_ceiling_usd):
        reason = "Teto mensal atingido"

    opened = False
    if reason and job.status != "paused":
        job.status = "paused"
        job.error_message = reason
        existing = (
            await session.scalars(
                select(Approval).where(
                    Approval.job_id == job.id,
                    Approval.type == "ceiling",
                    Approval.status == "pending",
                )
            )
        ).first()
        if existing is None:
            session.add(
                Approval(
                    id=str(uuid.uuid4()),
                    title="Teto de gasto",
                    type="ceiling",
                    job_id=job.id,
                    status="pending",
                    reason=reason,
                )
            )
            opened = True
        record_event(session, action="teto.atingido", details=reason, event_type="custo")
    await session.commit()
    return {
        "ok": True,
        "status": 200,
        "job_status": job.status,
        "cost_usd": job.cost_usd,
        "tokens_total": job.tokens_total,
        "gate_opened": opened,
        "reason": reason,
    }


async def cost_series(session: AsyncSession, span: str) -> dict:
    days = _RANGES.get(span)
    if days is None:
        return {"ok": False}
    end = now()
    start = end - timedelta(days=days)
    office = await office_row(session)
    rows = await _samples(session)
    kept = []
    for row in rows:
        stamp = _stamp(row.sampled_at)
        if stamp is not None and start <= stamp <= end:
            kept.append((stamp, row))
    buckets: dict[str, dict] = {}
    for stamp, row in kept:
        key = stamp.date().isoformat()
        bucket = buckets.setdefault(key, {"day": key, "usd": 0.0, "tokens": 0})
        bucket["usd"] += float(row.cost_usd)
        bucket["tokens"] += int(row.tokens)
    return {
        "ok": True,
        "range": span,
        "total_usd": sum(item["usd"] for item in buckets.values()),
        "total_tokens": sum(item["tokens"] for item in buckets.values()),
        "daily_ceiling_usd": office.daily_ceiling_usd,
        "monthly_ceiling_usd": office.monthly_ceiling_usd,
        "days": [buckets[key] for key in sorted(buckets)],
    }
