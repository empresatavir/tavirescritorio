from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece
from app.models.studio_decision import StudioDecision


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

    async def update(self, profile_id: str, **fields) -> Profile | None:
        profile = await self.get_by_id(profile_id)
        if not profile:
            return None
        for key, value in fields.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        await self.session.flush()
        return profile


class PieceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        profile_id: str | None = None,
        stage: str | None = None,
        net: str | None = None,
    ) -> list[Piece]:
        stmt = select(Piece)
        if profile_id:
            stmt = stmt.where(Piece.profile_id == profile_id)
        if stage:
            stmt = stmt.where(Piece.stage == stage)
        if net:
            stmt = stmt.where(Piece.net == net)
        stmt = stmt.order_by(Piece.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, piece_id: str) -> Piece | None:
        piece = await self.session.get(Piece, piece_id)
        if not piece:
            stmt = select(Piece).where(Piece.num == piece_id)
            res = await self.session.execute(stmt)
            piece = res.scalars().first()
        return piece

    async def get_next_num(self) -> str:
        res = await self.session.execute(select(func.count(Piece.id)))
        count = res.scalar() or 0
        return f"ST-{count + 31:03d}"

    async def create(self, piece: Piece) -> Piece:
        if not piece.num:
            piece.num = await self.get_next_num()
        if not piece.timeline:
            piece.timeline = [
                [datetime.now().strftime("%d/%m %H:%M"), "Operador", "Peça criada no Studio"]
            ]
        self.session.add(piece)
        await self.session.flush()
        return piece

    async def move_stage(self, piece_id: str, new_stage: str) -> Piece | None:
        piece = await self.get_by_id(piece_id)
        if not piece:
            return None
        old_stage = piece.stage
        piece.stage = new_stage
        if new_stage == "done" and not piece.published_at:
            piece.published_at = datetime.utcnow()
            piece.status = "published"
        cur_timeline = list(piece.timeline) if piece.timeline else []
        cur_timeline.append(
            [
                datetime.now().strftime("%d/%m %H:%M"),
                "Pipeline",
                f"Movido de {old_stage} para {new_stage}",
            ]
        )
        piece.timeline = cur_timeline
        return piece

    async def update_content(
        self,
        piece_id: str,
        title: str | None = None,
        script: str | None = None,
        caption: str | None = None,
        tags: str | None = None,
        body: str | None = None,
        subtitle: str | None = None,
        cta: str | None = None,
        slides: list | None = None,
        progress: int | None = None,
        squad: str | None = None,
        needs: bool | None = None,
    ) -> Piece | None:
        piece = await self.get_by_id(piece_id)
        if not piece:
            return None
        if title is not None:
            piece.title = title
        if script is not None:
            piece.script = script
        if caption is not None:
            piece.caption = caption
        if tags is not None:
            piece.tags = tags
        if body is not None:
            piece.body = body
        if subtitle is not None:
            piece.subtitle = subtitle
        if cta is not None:
            piece.cta = cta
        if slides is not None:
            piece.slides = slides
        if progress is not None:
            piece.progress = progress
        if squad is not None:
            piece.squad = squad
        if needs is not None:
            piece.needs = needs
        return piece

    async def publish(self, piece_id: str, url: str | None = None) -> Piece | None:
        piece = await self.get_by_id(piece_id)
        if not piece:
            return None
        piece.stage = "done"
        piece.status = "published"
        piece.needs = False
        piece.published_at = datetime.utcnow()
        piece.published_url = url or f"https://tavir.io/content/{piece.num or piece.id}"
        cur_timeline = list(piece.timeline) if piece.timeline else []
        cur_timeline.append(
            [
                datetime.now().strftime("%d/%m %H:%M"),
                "Publicador",
                f"Conteúdo publicado: {piece.published_url}",
            ]
        )
        piece.timeline = cur_timeline
        return piece


class DecisionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        profile_id: str | None = None,
        status: str | None = None,
    ) -> list[StudioDecision]:
        stmt = select(StudioDecision)
        if profile_id:
            stmt = stmt.where(StudioDecision.profile_id == profile_id)
        if status:
            stmt = stmt.where(StudioDecision.status == status)
        stmt = stmt.order_by(StudioDecision.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, decision_id: str) -> StudioDecision | None:
        return await self.session.get(StudioDecision, decision_id)

    async def create(self, decision: StudioDecision) -> StudioDecision:
        self.session.add(decision)
        await self.session.flush()
        return decision

    async def next_run_id(self) -> str:
        res = await self.session.execute(select(func.count(StudioDecision.id)))
        count = res.scalar() or 0
        return f"TVR-{2800 + count + 1}"
