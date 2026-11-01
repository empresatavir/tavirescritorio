"""Livro-razão do escritório. Segredo de cofre não entra em details."""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event

_SECRET_MARKERS = ("secret", "senha", "password", "token", "vault", "supabase_url", "api_key", "chave")


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _stamp(value: datetime | str | None) -> datetime | None:
    if isinstance(value, datetime):
        return _as_utc(value)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return _as_utc(parsed)
    return None


def redact_details(details: str | None) -> str | None:
    if not details:
        return details
    try:
        data = json.loads(details)
    except json.JSONDecodeError:
        return details
    if not isinstance(data, dict):
        return details
    clean = {
        key: value
        for key, value in data.items()
        if not any(marker in key.lower() for marker in _SECRET_MARKERS)
    }
    return json.dumps(clean, ensure_ascii=False)


def record_event(
    session: AsyncSession,
    *,
    action: str,
    details: str | None = None,
    event_type: str = "escritorio",
    actor: str = "operador",
) -> Event:
    event = Event(
        id=str(uuid.uuid4()),
        event_type=event_type,
        actor=actor,
        action=action,
        details=redact_details(details),
    )
    session.add(event)
    return event


async def events_on(session: AsyncSession, day: date) -> list[Event]:
    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    rows = (await session.scalars(select(Event).order_by(Event.created_at.asc()))).all()
    found: list[Event] = []
    for row in rows:
        stamp = _stamp(row.created_at)
        if stamp is None:
            continue
        if start <= stamp < end:
            found.append(row)
    return found


def dump_event(event: Event) -> dict:
    stamp = _stamp(event.created_at)
    created_at = stamp.isoformat() if stamp else None
    return {
        "id": event.id,
        "created_at": created_at,
        "event_type": event.event_type,
        "actor": event.actor,
        "action": event.action,
        "details": event.details,
    }


def export_text(rows: list[Event]) -> str:
    lines = ["created_at\taction\tdetails"]
    for event in rows:
        item = dump_event(event)
        lines.append(f"{item['created_at']}\t{item['action']}\t{item['details'] or ''}")
    return "\n".join(lines) + "\n"
