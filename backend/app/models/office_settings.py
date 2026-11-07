"""Ajustes do escritório: perfil, foco e blocos da sala."""
from sqlalchemy import DateTime, Float, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class OfficeSettings(Base):
    __tablename__ = "office_settings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    perfil_nome: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    perfil_email: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    perfil_idioma: Mapped[str] = mapped_column(String(8), nullable=False, default="pt")
    overview: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    focused_project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    focused_demand_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    operator_secret_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_expires_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    onboarding_completed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tours_seen: Mapped[list | None] = mapped_column(JSON, nullable=True)
    daily_ceiling_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    monthly_ceiling_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
