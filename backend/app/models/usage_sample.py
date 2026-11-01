"""Amostra de custo de um job."""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class UsageSample(Base):
    __tablename__ = "usage_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sampled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
