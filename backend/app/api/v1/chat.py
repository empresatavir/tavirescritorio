"""Chat API router — conversations, messaging and agent settings."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.shared.database import get_session
from app.modules.chat.repository import ChatRepository
from app.modules.chat.service import ChatService

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    text: str
    meta: str | None = None
    images: list[dict[str, str]] | None = None
    actions: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatConversationResponse(BaseModel):
    id: str
    agent_id: str
    title: str
    settings: Any | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatConversationDetailResponse(BaseModel):
    conversation: ChatConversationResponse
    messages: list[ChatMessageResponse]


class CreateConversationRequest(BaseModel):
    agent_id: str
    title: str
    settings: dict[str, Any] | None = None


class UpdateSettingsRequest(BaseModel):
    settings: dict[str, Any]


class ChatImageUpload(BaseModel):
    name: str = "imagem"
    data_url: str


class SendMessageRequest(BaseModel):
    text: str = ""
    images: list[ChatImageUpload] | None = None


class SendMessageResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse


@router.get("/conversations", response_model=list[ChatConversationResponse])
async def list_conversations(
    agent_id: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = ChatRepository(session)
    return await repo.list_conversations(agent_id=agent_id)


@router.post("/conversations", response_model=ChatConversationResponse, status_code=201)
async def create_conversation(
    req: CreateConversationRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ChatRepository(session)
    conv = await repo.create_conversation(
        agent_id=req.agent_id,
        title=req.title,
        settings=req.settings,
    )
    await session.commit()
    await session.refresh(conv)
    return conv


@router.get("/conversations/{conv_id}", response_model=ChatConversationDetailResponse)
async def get_conversation(conv_id: str, session: AsyncSession = Depends(get_session)):
    repo = ChatRepository(session)
    conv = await repo.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation {conv_id} not found")
    messages = await repo.get_messages(conv_id)
    return ChatConversationDetailResponse(
        conversation=ChatConversationResponse.model_validate(conv),
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )


@router.patch("/conversations/{conv_id}/settings", response_model=ChatConversationResponse)
async def update_conversation_settings(
    conv_id: str,
    req: UpdateSettingsRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ChatRepository(session)
    conv = await repo.update_settings(conv_id, req.settings)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation {conv_id} not found")
    await session.commit()
    await session.refresh(conv)
    return conv


@router.post("/conversations/{conv_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conv_id: str,
    req: SendMessageRequest,
    session: AsyncSession = Depends(get_session),
):
    service = ChatService(session)
    try:
        uploads = [item.model_dump() for item in req.images or []]
        user_msg, assistant_msg = await service.process_user_message(conv_id, req.text, uploads)
        await session.commit()
        await session.refresh(user_msg)
        await session.refresh(assistant_msg)
        return SendMessageResponse(
            user_message=ChatMessageResponse.model_validate(user_msg),
            assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        )
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation(conv_id: str, session: AsyncSession = Depends(get_session)):
    repo = ChatRepository(session)
    conv = await repo.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation {conv_id} not found")
    title = conv.title
    deleted = await repo.delete_conversation(conv_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Conversation {conv_id} not found")
    from app.modules.office.ledger import record_event

    record_event(
        session,
        action="chat.apagada",
        details=json.dumps({"conversation_id": conv_id, "title": title}, ensure_ascii=False),
    )
    await session.commit()
    from app.modules.chat.images import remove_conversation_images

    remove_conversation_images(conv_id)
    return None


@router.get("/images/{conv_id}/{name}")
async def get_chat_image(conv_id: str, name: str):
    from app.modules.chat.images import resolve_image

    path = resolve_image(conv_id, name)
    if path is None:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return FileResponse(path)
