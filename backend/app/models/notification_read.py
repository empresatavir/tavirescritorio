"""Leitura persistida de uma notificação derivada."""
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
