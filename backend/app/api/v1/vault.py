"""Cofre local. A lista devolve máscara. O valor só sai no reveal explícito."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vault_secret import VaultSecret
from app.modules.office.vault import mask_value, reveal_secret, store_secret
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/vault", tags=["vault"])


class VaultWrite(BaseModel):
    name: str
    value: str
    approval_id: str | None = None


class VaultPublic(BaseModel):
    id: str
    name: str
    masked: str
    approval_id: str | None = None


class VaultRevealed(BaseModel):
    id: str
    name: str
    value: str


def _public(row: VaultSecret) -> VaultPublic:
    return VaultPublic(
        id=row.id,
        name=row.name,
        masked=mask_value(row.value),
        approval_id=row.approval_id,
    )


@router.get("", response_model=list[VaultPublic])
async def list_vault(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(VaultSecret).order_by(VaultSecret.created_at.asc()))).all()
    return [_public(row) for row in rows]


@router.post("", response_model=VaultPublic, status_code=201)
async def create_vault(req: VaultWrite, session: AsyncSession = Depends(get_session)):
    name = req.name.strip()
    if not name or not req.value:
        raise HTTPException(status_code=400, detail="Nome e valor são obrigatórios.")
    row = await store_secret(session, name=name, value=req.value, approval_id=req.approval_id)
    await session.commit()
    await session.refresh(row)
    return _public(row)


@router.post("/{secret_id}/reveal", response_model=VaultRevealed)
async def reveal_vault(secret_id: str, session: AsyncSession = Depends(get_session)):
    row = await reveal_secret(session, secret_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Segredo não encontrado.")
    await session.commit()
    return VaultRevealed(id=row.id, name=row.name, value=row.value)
