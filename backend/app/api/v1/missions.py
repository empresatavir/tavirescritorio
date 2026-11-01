"""Progresso de missão: concluir um marco muda a fração gravada."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import Milestone, Mission
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/missions", tags=["missions"])


class MilestoneUpdate(BaseModel):
    done: bool


def _payload(mission: Mission, milestones: list[Milestone]) -> dict:
    done = sum(1 for row in milestones if row.done)
    total = len(milestones)
    return {
        "id": mission.id,
        "title": mission.title,
        "period": mission.period,
        "done": done,
        "total": total,
        "progress": f"{done}/{total}",
        "milestones": [
            {"id": row.id, "title": row.title, "done": bool(row.done)}
            for row in milestones
        ],
    }


async def _milestones(session: AsyncSession, mission_id: str) -> list[Milestone]:
    rows = await session.scalars(
        select(Milestone).where(Milestone.mission_id == mission_id).order_by(Milestone.position)
    )
    return list(rows.all())


@router.get("")
async def list_missions(session: AsyncSession = Depends(get_session)):
    missions = list((await session.scalars(select(Mission).order_by(Mission.title))).all())
    return {"missions": [_payload(mission, await _milestones(session, mission.id)) for mission in missions]}


@router.patch("/{mission_id}/milestones/{milestone_id}")
async def update_milestone(
    mission_id: str,
    milestone_id: str,
    body: MilestoneUpdate,
    session: AsyncSession = Depends(get_session),
):
    mission = await session.get(Mission, mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="Missão não encontrada.")
    milestone = await session.get(Milestone, milestone_id)
    if milestone is None or milestone.mission_id != mission_id:
        raise HTTPException(status_code=404, detail="Marco não encontrado.")
    milestone.done = body.done
    await session.commit()
    await session.refresh(milestone)
    return _payload(mission, await _milestones(session, mission.id))
