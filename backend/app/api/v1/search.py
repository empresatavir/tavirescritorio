"""Busca global do escritório."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.office.search import search_office
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def get_search(q: str = Query(default=""), session: AsyncSession = Depends(get_session)):
    return await search_office(session, q)
