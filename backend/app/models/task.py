"""Task model — kanban entity for TAVIR."""
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from typing import Any
from app.shared.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    seq: Mapped[int | None] = mapped_column(Integer, nullable=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    assignee_agent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("agents.id"), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    escalation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    handoffs: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    gates: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    active_job_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )