"""Plataformas sociais: a lista nasce desconectada e Conectar grava a linha."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social_connection import SocialConnection
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/social", tags=["social"])

PLATFORMS = (
    ("instagram", "Instagram"),
    ("linkedin", "LinkedIn"),
    ("youtube", "YouTube"),
    ("tiktok", "TikTok"),
)
KNOWN = {key for key, _label in PLATFORMS}


@router.get("/connections")
async def list_connections(session: AsyncSession = Depends(get_session)):
    rows = list((await session.scalars(select(SocialConnection))).all())
    by_platform = {row.platform: row for row in rows}
    return {
        "connections": [
            {
                "platform": key,
                "label": label,
                "status": by_platform[key].status if key in by_platform else "disconnected",
            }
            for key, label in PLATFORMS
        ]
    }


@router.post("/connections/{platform}/connect")
async def connect_platform(platform: str, session: AsyncSession = Depends(get_session)):
    key = platform.strip().lower()
    if key not in KNOWN:
        raise HTTPException(status_code=404, detail="Plataforma desconhecida.")
    row = (
        await session.scalars(select(SocialConnection).where(SocialConnection.platform == key))
    ).first()
    if row is None:
        row = SocialConnection(id=str(uuid.uuid4()), platform=key, status="connected")
        session.add(row)
    else:
        row.status = "connected"
    await session.commit()
    await session.refresh(row)
    label = dict(PLATFORMS)[key]
    return {"platform": row.platform, "label": label, "status": row.status}
