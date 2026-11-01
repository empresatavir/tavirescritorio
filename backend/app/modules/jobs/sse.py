"""Payload de SSE. Evento sem created_at interpretável não sai no fluxo."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def parse_created_at(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if value is None:
        return None
    raw = str(value).strip()
    if not raw or raw.lower() in {"none", "null", "undefined", "invalid date"}:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def event_payload(row: dict) -> dict | None:
    created = parse_created_at(row.get("created_at"))
    if created is None:
        return None
    return {
        "id": row.get("id"),
        "event_type": row.get("event_type"),
        "previous_state": row.get("previous_state"),
        "new_state": row.get("new_state"),
        "actor": row.get("actor"),
        "action": row.get("action"),
        "details": row.get("details"),
        "created_at": created.isoformat(),
    }


async def read_event_rows(session: AsyncSession, job_id: str) -> list[dict]:
    result = await session.execute(
        text(
            "SELECT id, event_type, previous_state, new_state, actor, action, details, created_at "
            "FROM events WHERE job_id = :job_id ORDER BY rowid"
        ),
        {"job_id": job_id},
    )
    keys = ["id", "event_type", "previous_state", "new_state", "actor", "action", "details", "created_at"]
    return [dict(zip(keys, row)) for row in result.all()]
