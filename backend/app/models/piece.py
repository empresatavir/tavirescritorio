"""Piece model — content piece produced in Studio pipeline."""
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, JSON, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class Piece(Base):
    __tablename__ = "pieces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    num: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ex: ST-031
    profile_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("profiles.id"), nullable=True
    )
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(300), nullable=True)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="article")
    net: Mapped[str | None] = mapped_column(String(20), nullable=True)  # li, ig, yt, tt
    stage: Mapped[str] = mapped_column(
        String(50), nullable=False, default="idea"
    )  # idea, pauta, prod, review, pub, done, error
    needs: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    script: Mapped[str | None] = mapped_column(Text, nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    cta: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
    slides: Mapped[list | None] = mapped_column(JSON, nullable=True)
    images: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timeline: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    progress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    squad: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    published_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
