"""Factory API router — engineering templates CRUD."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.shared.database import get_session
from app.modules.factory.repository import TemplateRepository
from app.models.template import EngineeringTemplate

router = APIRouter(prefix="/api/v1/factory/templates", tags=["factory"])


class TemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    mode: str
    description: str | None = None
    stages: Any | None = None
    owner_role: str | None = None
    default_commands: Any | None = None
    gate_required: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateTemplateRequest(BaseModel):
    name: str
    category: str
    mode: str
    description: str | None = None
    stages: Any | None = None
    owner_role: str | None = None
    default_commands: Any | None = None
    gate_required: bool = False
    sort_order: int = 0


@router.get("/", response_model=list[TemplateResponse])
async def list_templates(session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    return await repo.list_all()


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, session: AsyncSession = Depends(get_session)):
    repo = TemplateRepository(session)
    template = await repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return template


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(req: CreateTemplateRequest, session: AsyncSession = Depends(get_session)):
    import uuid
    template = EngineeringTemplate(
        id=str(uuid.uuid4()),
        name=req.name,
        category=req.category,
        mode=req.mode,
        description=req.description,
        stages=req.stages,
        owner_role=req.owner_role,
        default_commands=req.default_commands,
        gate_required=req.gate_required,
        sort_order=req.sort_order,
    )
    repo = TemplateRepository(session)
    created = await repo.create(template)
    await session.commit()
    return created