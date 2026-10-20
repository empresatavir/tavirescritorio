"""FactoryStageInstance — etapa materializada de um FactoryRun."""
from sqlalchemy import String, Integer, Boolean, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class FactoryStageInstance(Base):
    __tablename__ = "factory_stages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("factory_runs.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    stage_def_id: Mapped[str] = mapped_column(String(64), nullable=False)
    code: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    agent: Mapped[str | None] = mapped_column(String(120), nullable=True)
    agent_role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_gate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    topology: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, default="queued"
    )  # queued | running | awaiting_gate | done | failed | blocked | skipped
    expected_artifacts: Mapped[list | None] = mapped_column(JSON, nullable=True)
    artifact_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
