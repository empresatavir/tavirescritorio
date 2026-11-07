"""Demanda da Fábrica — um trabalho isolado dentro de um projeto."""
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class FactoryDemand(Base):
    __tablename__ = "factory_demands"
    __table_args__ = (UniqueConstraint("project_id", "code", name="uq_demand_project_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="criacao")
    track: Mapped[str] = mapped_column(String(12), nullable=False, default="zero")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="rascunho")
    folder: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    opt_out: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sla_due_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    run_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    dossier: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
