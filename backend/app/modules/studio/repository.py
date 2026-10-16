"""Studio repository — async CRUD for personas, profiles and pieces."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece


class PersonaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Persona]:
        result = await self.session.execute(select(Persona).order_by(Persona.name))
        return list(result.scalars().all())

    async def get_by_id(self, persona_id: str) -> Persona | None:
        return await self.session.get(Persona, persona_id)

    async def create(self, persona: Persona) -> Persona:
        self.session.add(persona)
        await self.session.flush()
        return persona


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Profile]:
        result = await self.session.execute(select(Profile).order_by(Profile.name))
        return list(result.scalars().all())

    async def get_by_id(self, profile_id: str) -> Profile | None:
        return await self.session.get(Profile, profile_id)

    async def create(self, profile: Profile) -> Profile:
        self.session.add(profile)
        await self.session.flush()
        return profile


class PieceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Piece]:
        result = await self.session.execute(select(Piece).order_by(Piece.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_id(self, piece_id: str) -> Piece | None:
        return await self.session.get(Piece, piece_id)

    async def create(self, piece: Piece) -> Piece:
        self.session.add(piece)
        await self.session.flush()
        return piece