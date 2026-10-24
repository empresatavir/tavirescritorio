"""Project model — canonical project entity for TAVIR."""
from sqlalchemy import String, Text, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    client: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    template_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # lp-c, lp-m, etc.
    stages_done: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_stages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    local_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    deploy_target: Mapped[str | None] = mapped_column(String(200), nullable=True)
    stack: Mapped[str | None] = mapped_column(String(200), nullable=True)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    scope_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pendencies: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    kanban_cards: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    files: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    keys: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    event_log: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )