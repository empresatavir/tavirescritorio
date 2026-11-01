"""Exportação de legenda .srt e fila de render da Edição."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edit_cue import EditCue
from app.models.edit_render import EditRender
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/edit", tags=["edit"])


def srt_time(ms: int) -> str:
    total = max(0, int(ms))
    hours, rem = divmod(total, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    seconds, millis = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def render_srt(cues: list[EditCue]) -> str:
    blocks = []
    for index, cue in enumerate(cues, start=1):
        blocks.append(f"{index}\n{srt_time(cue.start_ms)} --> {srt_time(cue.end_ms)}\n{cue.text.strip()}")
    return "\n\n".join(blocks) + ("\n" if blocks else "")


@router.get("/projects")
async def list_projects(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(EditCue).order_by(EditCue.project_id.asc(), EditCue.seq.asc()))).all()
    grouped: dict[str, dict] = {}
    for row in rows:
        item = grouped.setdefault(
            row.project_id,
            {"id": row.project_id, "label": row.project_label, "cues": []},
        )
        item["cues"].append({"seq": row.seq, "start_ms": row.start_ms, "end_ms": row.end_ms, "text": row.text})
    return {"projects": list(grouped.values())}


@router.post("/projects/{project_id}/srt")
async def export_srt(project_id: str, session: AsyncSession = Depends(get_session)):
    rows = (
        await session.scalars(
            select(EditCue).where(EditCue.project_id == project_id).order_by(EditCue.seq.asc())
        )
    ).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Projeto sem legenda.")
    body = render_srt(list(rows))
    filename = f"{project_id}.srt"
    return PlainTextResponse(
        body,
        media_type="application/x-subrip; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class RenderBody(BaseModel):
    label: str = ""


@router.get("/renders")
async def list_renders(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(EditRender).order_by(EditRender.label.asc()))).all()
    return {
        "renders": [
            {"id": row.id, "label": row.label, "progress": row.progress, "status": row.status}
            for row in rows
        ]
    }


@router.post("/renders", status_code=201)
async def enqueue_render(body: RenderBody, session: AsyncSession = Depends(get_session)):
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Informe o nome do render.")
    row = EditRender(id=str(uuid.uuid4()), label=label, progress=0, status="queued")
    session.add(row)
    await session.commit()
    return {"id": row.id, "label": row.label, "progress": row.progress, "status": row.status}
