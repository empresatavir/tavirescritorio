"""Funil comercial: quatro números lidos dos casos e das propostas."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase
from app.modules.commercial.funnel import summarize
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/commercial", tags=["commercial"])


@router.get("/funnel")
async def commercial_funnel(session: AsyncSession = Depends(get_session)):
    cases = list((await session.scalars(select(RaioxCase))).all())
    proposals = list((await session.scalars(select(Proposal))).all())
    return summarize(cases, proposals)
