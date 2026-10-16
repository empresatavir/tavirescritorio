"""Piece model — content piece produced in Studio pipeline."""
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class Piece(Base):
    __tablename__ = "pieces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    profile_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("profiles.id"), nullable=True
    )
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="article")
    stage: Mapped[str] = mapped_column(String(50), nullable=False, default="idea")
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    published_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )