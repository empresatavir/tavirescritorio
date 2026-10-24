"""Profile model — studio profile for content creation (D4: separate from Persona with FK)."""
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    persona_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("personas.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    handle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    niche: Mapped[str | None] = mapped_column(String(200), nullable=True)
    audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    tone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    initials: Mapped[str | None] = mapped_column(String(10), nullable=True)
    networks: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    design_system: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cycle_goal: Mapped[int] = mapped_column(Integer, nullable=False, default=12, server_default="12")
    cycle_done: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    guidelines: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
