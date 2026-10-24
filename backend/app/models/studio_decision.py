"""Studio decision checkpoint — pauta options or final package review."""
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database import Base


class StudioDecision(Base):
    __tablename__ = "studio_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id"), nullable=False, index=True
    )
    run_id: Mapped[str] = mapped_column(String(50), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # pauta | revisao
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | resolved | dismissed
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    selected_option_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    piece_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("pieces.id"), nullable=True
    )
    waiting_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    platform_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
