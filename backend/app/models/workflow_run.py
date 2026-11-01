"""Execução manual de um workflow. Para no primeiro gate e não segue sozinha."""
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="waiting_gate")
    step_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gate: Mapped[str | None] = mapped_column(String(300), nullable=True)
    approval_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("approvals.id"), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
