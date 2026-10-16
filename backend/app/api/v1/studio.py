"""Studio API router — personas, profiles and pieces CRUD."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.shared.database import get_session
from app.modules.studio.repository import PersonaRepository, ProfileRepository, PieceRepository
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece
import uuid

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
    tone: str | None = None
    guidelines: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class CreateProfileRequest(BaseModel):
    persona_id: str | None = None
    name: str
    platform: str | None = None
    tone: str | None = None
    guidelines: str | None = None


class PieceResponse(BaseModel):
    id: str
    profile_id: str | None = None
    project_id: str | None = None
    title: str
    content_type: str
    stage: str
    body: str | None = None
    status: str
    published_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class CreatePieceRequest(BaseModel):
    profile_id: str | None = None
    project_id: str | None = None
    title: str
    content_type: str = "article"
    body: str | None = None


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
    return created


# --- Profiles ---

@router.get("/profiles", response_model=list[ProfileResponse])
async def list_profiles(session: AsyncSession = Depends(get_session)):
    repo = ProfileRepository(session)
    return await repo.list_all()


@router.post("/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(req: CreateProfileRequest, session: AsyncSession = Depends(get_session)):
    profile = Profile(
        id=str(uuid.uuid4()),
        persona_id=req.persona_id,
        name=req.name,
        platform=req.platform,
        tone=req.tone,
        guidelines=req.guidelines,
    )
    repo = ProfileRepository(session)
    created = await repo.create(profile)
    await session.commit()
    return created


# --- Pieces ---

@router.get("/pieces", response_model=list[PieceResponse])
async def list_pieces(session: AsyncSession = Depends(get_session)):
    repo = PieceRepository(session)
    return await repo.list_all()


@router.post("/pieces", response_model=PieceResponse, status_code=201)
async def create_piece(req: CreatePieceRequest, session: AsyncSession = Depends(get_session)):
    piece = Piece(
        id=str(uuid.uuid4()),
        profile_id=req.profile_id,
        project_id=req.project_id,
        title=req.title,
        content_type=req.content_type,
        body=req.body,
    )
    repo = PieceRepository(session)
    created = await repo.create(piece)
    await session.commit()
    return created