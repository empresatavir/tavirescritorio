"""Cockpit API router — operational summary for Sala de Operação."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.shared.database import get_session
from app.modules.cockpit.service import CockpitService

router = APIRouter(prefix="/api/v1/cockpit", tags=["cockpit"])


@router.get("/summary")
async def get_cockpit_summary(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    service = CockpitService(session)
    return await service.get_summary()
