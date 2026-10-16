"""EngineeringTemplate model — factory template definitions for TAVIR."""
from sqlalchemy import String, Text, DateTime, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class EngineeringTemplate(Base):
    __tablename__ = "engineering_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # lp, oferta, sistemas
    mode: Mapped[str] = mapped_column(String(20), nullable=False)  # criacao, manutencao
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    stages: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Ordered list of stage defs
    owner_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_commands: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    gate_required: Mapped[bool] = mapped_column(default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )