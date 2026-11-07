"""Raio-X TAVIR — caso de diagnóstico de escopo fixo."""
from sqlalchemy import Boolean, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class RaioxCase(Base):
    __tablename__ = "raiox_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    decision_needed: Mapped[str] = mapped_column(Text, nullable=False)
    frontier: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_id: Mapped[str] = mapped_column(String(40), nullable=False, default="diagnostico")
    deep_scan: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    physical_store: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    origin: Mapped[str] = mapped_column(String(20), nullable=False, default="amigo")
    segment: Mapped[str | None] = mapped_column(String(80), nullable=True)
    public_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    package_id: Mapped[str] = mapped_column(String(20), nullable=False, default="basico")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="intake")
    bottleneck: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    priority_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    discarded: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(10), nullable=True)
    next_offer: Mapped[str | None] = mapped_column(String(30), nullable=True)
    debrief_decision: Mapped[str | None] = mapped_column(String(30), nullable=True)
    debrief_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_30: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_60: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_90: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
