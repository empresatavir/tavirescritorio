"""Lista e leitura das notificações do escritório."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.office.notifications import list_notifications, mark_read
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(session: AsyncSession = Depends(get_session)):
    return await list_notifications(session)


@router.post("/{notification_id}/read")
async def post_read(notification_id: str, session: AsyncSession = Depends(get_session)):
    await mark_read(session, notification_id)
    return await list_notifications(session)
