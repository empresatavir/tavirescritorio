"""ChatConversation model — thread of conversation between operator and an agent."""
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Any
from app.shared.database import Base


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    settings: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
