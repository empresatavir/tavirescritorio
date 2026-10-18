"""Studio API router — personas, profiles and pieces CRUD."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.studio.repository import PersonaRepository, ProfileRepository, PieceRepository
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece

router = APIRouter(prefix="/api/v1/studio", tags=["studio"])


# --- Schemas ---

class PersonaResponse(BaseModel):
    id: str
    name: str
    archetype: str | None = None
    pain_points: str | None = None
    goals: str | None = None
    demographics: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreatePersonaRequest(BaseModel):
    name: str
    archetype: str | None = None
    pain_points: str | None = None
    goals: str | None = None
    demographics: str | None = None


class ProfileResponse(BaseModel):
    id: str
    persona_id: str | None = None
    name: str
    platform: str | None = None
    niche: str | None = None
    audience: str | None = None
    tone: str | None = None
    context: str | None = None
    color: str | None = None
    initials: str | None = None
    networks: Any | None = None
    guidelines: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateProfileRequest(BaseModel):
    id: str | None = None
    persona_id: str | None = None
    name: str
    platform: str | None = None
    niche: str | None = None
    audience: str | None = None
    tone: str | None = None
    context: str | None = None
    color: str | None = None
    initials: str | None = None
    networks: list[dict[str, Any]] | None = None
    guidelines: str | None = None


class PieceResponse(BaseModel):
    id: str
    num: str | None = None
    profile_id: str | None = None
    project_id: str | None = None
    title: str
    content_type: str
    net: str | None = None
    stage: str
    needs: bool
    body: str | None = None
    script: str | None = None
    caption: str | None = None
    tags: str | None = None
    images: Any | None = None
    timeline: Any | None = None
    status: str
    published_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreatePieceRequest(BaseModel):
    profile_id: str
    project_id: str | None = None
    title: str
    net: str = "li"  # ig, yt, tt, li
    content_type: str = "article"
    stage: str = "idea"
    script: str | None = None
    caption: str | None = None
    tags: str | None = None
    images: list[str] | None = None


class UpdatePieceStageRequest(BaseModel):
    stage: str  # idea, pauta, prod, review, pub, done


class UpdatePieceContentRequest(BaseModel):
    title: str | None = None
    script: str | None = None
    caption: str | None = None
    tags: str | None = None
    body: str | None = None


class PublishPieceRequest(BaseModel):
    url: str | None = None


# --- Personas ---

@router.get("/personas", response_model=list[PersonaResponse])
async def list_personas(session: AsyncSession = Depends(get_session)):
    repo = PersonaRepository(session)
    return await repo.list_all()


@router.post("/personas", response_model=PersonaResponse, status_code=201)
async def create_persona(req: CreatePersonaRequest, session: AsyncSession = Depends(get_session)):
    persona = Persona(
        id=str(uuid.uuid4()),
        name=req.name,
        archetype=req.archetype,
        pain_points=req.pain_points,
        goals=req.goals,
        demographics=req.demographics,
    )
    repo = PersonaRepository(session)
    created = await repo.create(persona)
    await session.commit()
    await session.refresh(created)
    return created


# --- Profiles ---

@router.get("/profiles", response_model=list[ProfileResponse])
async def list_profiles(session: AsyncSession = Depends(get_session)):
    repo = ProfileRepository(session)
    return await repo.list_all()


@router.post("/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(req: CreateProfileRequest, session: AsyncSession = Depends(get_session)):
    profile = Profile(
        id=req.id or str(uuid.uuid4()),
        persona_id=req.persona_id,
        name=req.name,
        platform=req.platform,
        niche=req.niche,
        audience=req.audience,
        tone=req.tone,
        context=req.context,
        color=req.color or "#1BC5BD",
        initials=req.initials or req.name[:2].upper(),
        networks=req.networks,
        guidelines=req.guidelines,
    )
    repo = ProfileRepository(session)
    created = await repo.create(profile)
    await session.commit()
    await session.refresh(created)
    return created


# --- Pieces ---

@router.get("/pieces", response_model=list[PieceResponse])
async def list_pieces(
    profile_id: str | None = Query(None),
    stage: str | None = Query(None),
    net: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = PieceRepository(session)
    return await repo.list_all(profile_id=profile_id, stage=stage, net=net)


@router.get("/pieces/{piece_id}", response_model=PieceResponse)
async def get_piece(piece_id: str, session: AsyncSession = Depends(get_session)):
    repo = PieceRepository(session)
    piece = await repo.get_by_id(piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    return piece


@router.post("/pieces", response_model=PieceResponse, status_code=201)
async def create_piece(req: CreatePieceRequest, session: AsyncSession = Depends(get_session)):
    repo = PieceRepository(session)
    num = await repo.get_next_num()
    piece = Piece(
        id=str(uuid.uuid4()),
        num=num,
        profile_id=req.profile_id,
        project_id=req.project_id,
        title=req.title,
        net=req.net,
        content_type=req.content_type,
        stage=req.stage,
        needs=False,
        script=req.script,
        caption=req.caption,
        tags=req.tags,
        images=req.images or [],
        timeline=[[datetime.now().strftime("%d/%m %H:%M"), "Operador", "Peça criada no Studio"]],
    )
    created = await repo.create(piece)
    await session.commit()
    await session.refresh(created)
    return created


@router.patch("/pieces/{piece_id}/stage", response_model=PieceResponse)
async def move_piece_stage(
    piece_id: str,
    req: UpdatePieceStageRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = PieceRepository(session)
    updated = await repo.move_stage(piece_id, req.stage)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.patch("/pieces/{piece_id}", response_model=PieceResponse)
async def update_piece_content(
    piece_id: str,
    req: UpdatePieceContentRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = PieceRepository(session)
    updated = await repo.update_content(
        piece_id,
        title=req.title,
        script=req.script,
        caption=req.caption,
        tags=req.tags,
        body=req.body,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/pieces/{piece_id}/publish", response_model=PieceResponse)
async def publish_piece(
    piece_id: str,
    req: PublishPieceRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = PieceRepository(session)
    updated = await repo.publish(piece_id, req.url)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated