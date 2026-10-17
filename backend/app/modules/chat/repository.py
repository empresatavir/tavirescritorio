"""Chat repository — async CRUD for conversations and messages."""
from datetime import datetime, timezone
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.chat_conversation import ChatConversation
from app.models.chat_message import ChatMessage


class ChatRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_conversations(self, agent_id: str | None = None) -> list[ChatConversation]:
        query = select(ChatConversation)
        if agent_id:
            query = query.where(ChatConversation.agent_id == agent_id)
        query = query.order_by(ChatConversation.updated_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_conversation(self, conv_id: str) -> ChatConversation | None:
        return await self.session.get(ChatConversation, conv_id)

    async def get_messages(self, conv_id: str) -> list[ChatMessage]:
        query = select(ChatMessage).where(ChatMessage.conversation_id == conv_id).order_by(ChatMessage.created_at.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create_conversation(
        self,
        agent_id: str,
        title: str,
        settings: dict[str, Any] | None = None,
        conv_id: str | None = None,
    ) -> ChatConversation:
        default_settings = {
            "model": "claude-sonnet-4",
            "effort": "médio",
            "time": "2 min",
            "tokens": "1024",
            "insp": 30,
            "memory": True,
            "vault": True,
            "tasks": True,
        }
        if settings:
            default_settings.update(settings)

        conversation = ChatConversation(
            id=conv_id or f"cv-{str(uuid.uuid4())[:8]}",
            agent_id=agent_id,
            title=title,
            settings=default_settings,
        )
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def update_settings(self, conv_id: str, settings: dict[str, Any]) -> ChatConversation | None:
        conv = await self.get_conversation(conv_id)
        if not conv:
            return None
        current = dict(conv.settings or {})
        current.update(settings)
        conv.settings = current
        conv.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return conv

    async def add_message(
        self,
        conv_id: str,
        role: str,
        text: str,
        meta: str | None = None,
        msg_id: str | None = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            id=msg_id or f"m-{str(uuid.uuid4())[:8]}",
            conversation_id=conv_id,
            role=role,
            text=text,
            meta=meta,
        )
        self.session.add(msg)

        # Update conversation updated_at
        conv = await self.get_conversation(conv_id)
        if conv:
            conv.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        return msg

    async def delete_conversation(self, conv_id: str) -> bool:
        conv = await self.get_conversation(conv_id)
        if not conv:
            return False
        # Delete related messages first
        messages = await self.get_messages(conv_id)
        for m in messages:
            await self.session.delete(m)
        await self.session.delete(conv)
        await self.session.flush()
        return True
