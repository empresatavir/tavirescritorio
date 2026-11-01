"""Segredo do cofre. O valor fica na tabela e não entra no livro nem no chat."""
from __future__ import annotations

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vault_secret import VaultSecret
from app.modules.office.ledger import record_event


def mask_value(value: str) -> str:
    raw = value or ""
    if len(raw) <= 4:
        return "••••"
    return raw[:4] + "•" * min(10, len(raw) - 4)


async def store_secret(
    session: AsyncSession,
    *,
    name: str,
    value: str,
    approval_id: str | None = None,
) -> VaultSecret:
    row = VaultSecret(
        id=f"vault-{uuid.uuid4().hex[:8]}",
        name=name.strip(),
        value=value,
        approval_id=approval_id,
    )
    session.add(row)
    record_event(
        session,
        action="cofre.gravado",
        event_type="cofre",
        details=json.dumps({"name": row.name, "approval_id": approval_id}, ensure_ascii=False),
    )
    await session.flush()
    return row


async def reveal_secret(session: AsyncSession, secret_id: str) -> VaultSecret | None:
    row = await session.get(VaultSecret, secret_id)
    if row is None:
        return None
    record_event(
        session,
        action="cofre.revelado",
        event_type="cofre",
        details=json.dumps({"name": row.name}, ensure_ascii=False),
    )
    await session.flush()
    return row
