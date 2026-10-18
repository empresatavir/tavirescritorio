"""Proposal model — commercial proposals and client agreement pipeline."""
from sqlalchemy import String, Text, Float, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from typing import Any
from app.shared.database import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    num: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # ex: PRO-001
    client: Mapped[str] = mapped_column(String(200), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False, default="progress")  # progress, pending, done
    status: Mapped[str] = mapped_column(String(200), nullable=False, default="Em elaboração")
    tone: Mapped[str] = mapped_column(String(20), nullable=False, default="work")  # work, wait, ok, lost
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    validity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    items: Mapped[Any | None] = mapped_column(JSON, nullable=True)  # [{desc: str, value: float}]
    collected: Mapped[Any | None] = mapped_column(JSON, nullable=True)  # [[label, value], ...]
    changes: Mapped[Any | None] = mapped_column(JSON, nullable=True)  # [{at, target, agent, text, status}]
    timeline: Mapped[Any | None] = mapped_column(JSON, nullable=True)  # [[at, author, event], ...]
    send_info: Mapped[Any | None] = mapped_column(JSON, nullable=True)  # {link, sentTo, sentAt, opened, accept}
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
