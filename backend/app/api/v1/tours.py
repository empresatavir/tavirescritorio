"""Percursos guiados. Concluir grava o percurso visto no escritório."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.settings_office import OFFICE_ID
from app.models.office_settings import OfficeSettings
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/tours", tags=["tours"])

TOUR_KEYS = ("exec", "client")


def _seen(row: OfficeSettings) -> list[str]:
    raw = row.tours_seen if isinstance(row.tours_seen, list) else []
    return [item for item in raw if isinstance(item, str)]


async def _office(session: AsyncSession) -> OfficeSettings:
    row = await session.get(OfficeSettings, OFFICE_ID)
    if row is None:
        row = OfficeSettings(id=OFFICE_ID, perfil_nome="", perfil_email="")
        session.add(row)
        await session.flush()
    return row


@router.get("")
async def list_tours(session: AsyncSession = Depends(get_session)):
    row = await _office(session)
    await session.commit()
    return {"seen": _seen(row)}


@router.post("/{tour_key}/complete")
async def complete_tour(tour_key: str, session: AsyncSession = Depends(get_session)):
    if tour_key not in TOUR_KEYS:
        raise HTTPException(status_code=404, detail="Percurso não encontrado.")
    row = await _office(session)
    seen = _seen(row)
    if tour_key not in seen:
        seen.append(tour_key)
    row.tours_seen = seen
    await session.commit()
    await session.refresh(row)
    return {"seen": _seen(row)}
