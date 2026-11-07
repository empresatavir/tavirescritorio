"""Lição de papel. Nasce como proposta no gate e só entra no prompt se adotada."""
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class AgentLesson(Base):
    __tablename__ = "agent_lessons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False)
    agent_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    situation: Mapped[str | None] = mapped_column(Text, nullable=True)
    lesson: Mapped[str] = mapped_column(Text, nullable=False)
    why: Mapped[str | None] = mapped_column(Text, nullable=True)
    how_to_apply: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="proposta")
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    adopted_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
