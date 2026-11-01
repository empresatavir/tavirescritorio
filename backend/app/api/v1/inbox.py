"""Caixa de entrada: responder e encaminhar grava o status da mensagem."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inbox_message import InboxMessage
from app.modules.raiox.repository import RaioxRepository
from app.modules.raiox.service import RaioxError, RaioxService
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])


class ReplyBody(BaseModel):
    text: str


class ForwardBody(BaseModel):
    to: str


def _payload(row: InboxMessage) -> dict:
    return {
        "id": row.id,
        "sender": row.sender,
        "body": row.body,
        "status": row.status,
        "reply_text": row.reply_text,
        "forward_to": row.forward_to,
        "kind": row.kind,
        "raiox_case_id": row.raiox_case_id,
    }


async def _get(session: AsyncSession, message_id: str) -> InboxMessage:
    row = await session.get(InboxMessage, message_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")
    return row


@router.get("/messages")
async def list_messages(session: AsyncSession = Depends(get_session)):
    rows = list((await session.scalars(select(InboxMessage).order_by(InboxMessage.created_at))).all())
    return {"messages": [_payload(row) for row in rows]}


@router.post("/messages/{message_id}/reply")
async def reply_message(message_id: str, body: ReplyBody, session: AsyncSession = Depends(get_session)):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Informe a resposta.")
    row = await _get(session, message_id)
    row.reply_text = text
    row.status = "replied"
    await session.commit()
    await session.refresh(row)
    return _payload(row)


@router.post("/messages/{message_id}/forward")
async def forward_message(message_id: str, body: ForwardBody, session: AsyncSession = Depends(get_session)):
    dest = body.to.strip()
    if not dest:
        raise HTTPException(status_code=400, detail="Informe o destino.")
    row = await _get(session, message_id)
    row.forward_to = dest
    row.status = "forwarded"
    await session.commit()
    await session.refresh(row)
    return _payload(row)


@router.post("/messages/{message_id}/case")
async def open_case(message_id: str, session: AsyncSession = Depends(get_session)):
    row = await _get(session, message_id)
    if row.kind != "new":
        raise HTTPException(status_code=409, detail="Esta mensagem não é de cliente novo.")
    if row.raiox_case_id:
        return {"case_id": row.raiox_case_id, "company_name": row.sender}
    try:
        payload = await RaioxService(RaioxRepository(session)).create_case(
            company_name=row.sender,
            contact_name=row.sender,
            objective=row.body,
            decision_needed="Decidir se este cliente entra no Raio-X.",
            origin="amigo",
        )
    except RaioxError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.message) from exc
    row.raiox_case_id = payload["id"]
    await session.commit()
    await session.refresh(row)
    return {"case_id": row.raiox_case_id, "company_name": payload["company_name"]}
