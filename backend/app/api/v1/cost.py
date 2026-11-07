"""Tetos de gasto e série de custo."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.office.cost import cost_series, record_usage, set_ceilings
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1", tags=["cost"])


class CeilingBody(BaseModel):
    daily_usd: float | None = None
    monthly_usd: float | None = None


class UsageBody(BaseModel):
    job_id: str
    cost_usd: float
    tokens: int = 0
    model: str | None = None
    at: str | None = None


def _at(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed


@router.put("/analytics/ceilings")
async def put_ceilings(body: CeilingBody, session: AsyncSession = Depends(get_session)):
    return await set_ceilings(session, body.daily_usd, body.monthly_usd)


@router.post("/usage")
async def post_usage(body: UsageBody, session: AsyncSession = Depends(get_session)):
    result = await record_usage(
        session,
        job_id=body.job_id,
        cost_usd=body.cost_usd,
        tokens=body.tokens,
        model=body.model,
        at=_at(body.at),
    )
    if result["status"] == 404:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return result


@router.get("/analytics/cost")
async def get_cost(span: str = Query(default="14d", alias="range"), session: AsyncSession = Depends(get_session)):
    result = await cost_series(session, span)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail="range deve ser 14d ou 30d.")
    result.pop("ok", None)
    return result
