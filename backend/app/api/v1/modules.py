"""Números do hub. Cada contagem lê a tabela do módulo."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edit_render import EditRender
from app.models.factory_run import FactoryRun
from app.models.piece import Piece
from app.models.raiox_case import RaioxCase
from app.models.workflow import Workflow
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/modules", tags=["modules"])

_MODULES = (
    ("raiox", "Raio-X", "/raiox", RaioxCase),
    ("studio", "Studio", "/studio", Piece),
    ("fabrica", "Fábrica", "/fabrica", FactoryRun),
    ("flow", "Flow", "/flow", Workflow),
    ("edicao", "Edição", "/edicao", EditRender),
)


@router.get("/summary")
async def modules_summary(session: AsyncSession = Depends(get_session)):
    items = []
    for module_id, label, href, model in _MODULES:
        count = await session.scalar(select(func.count()).select_from(model))
        items.append({"id": module_id, "label": label, "href": href, "count": int(count or 0)})
    return {"modules": items}
