"""Leitura e exportação do livro-razão do escritório."""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.clock import now
from app.modules.office.ledger import dump_event, events_on, export_text
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/ledger", tags=["ledger"])


def _day(value: str | None) -> date:
    if not value:
        return now().astimezone(timezone.utc).date()
    return datetime.strptime(value, "%Y-%m-%d").date()


@router.get("")
async def get_ledger(
    day: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    chosen = _day(day)
    rows = await events_on(session, chosen)
    return {"day": chosen.isoformat(), "events": [dump_event(row) for row in rows]}


@router.get("/export")
async def export_ledger(
    day: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    chosen = _day(day)
    rows = await events_on(session, chosen)
    return PlainTextResponse(
        export_text(rows),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ledger-{chosen.isoformat()}.txt"'},
    )
