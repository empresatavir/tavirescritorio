"""Profile model — studio profile for content creation (D4: separate from Persona with FK)."""
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    persona_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("personas.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    guidelines: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )