"""Mensagem da caixa de entrada do escritório."""
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class InboxMessage(Base):
    __tablename__ = "inbox_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    sender: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="received")
    reply_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    forward_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="existing")
    raiox_case_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
