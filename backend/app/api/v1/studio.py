"""Studio API router — personas, profiles, pieces, decisions and oracle runs."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.studio.repository import (
    PersonaRepository,
    ProfileRepository,
    PieceRepository,
    DecisionRepository,
)
from app.modules.studio.oracle_service import OracleService
from app.modules.studio.production_service import (
    ProductionService,
    SQUAD_LABELS,
    resolve_squad_id,
)
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece
from app.models.studio_decision import StudioDecision

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
    handle: str | None = None
    company: str | None = None
    platform: str | None = None
    niche: str | None = None
    audience: str | None = None
    tone: str | None = None
    context: str | None = None
    color: str | None = None
    initials: str | None = None
    networks: Any | None = None
    design_system: Any | None = None
    cycle_goal: int = 12
    cycle_done: int = 0
    guidelines: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateProfileRequest(BaseModel):
    id: str | None = None
    persona_id: str | None = None
    name: str
    handle: str | None = None
    company: str | None = None
    platform: str | None = None
    niche: str | None = None
    audience: str | None = None
    tone: str | None = None
    context: str | None = None
    color: str | None = None
    initials: str | None = None
    networks: list[dict[str, Any]] | None = None
    design_system: dict[str, Any] | None = None
    cycle_goal: int | None = 12
    cycle_done: int | None = 0
    guidelines: str | None = None
    status: str | None = "active"


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    handle: str | None = None
    company: str | None = None
    niche: str | None = None
    audience: str | None = None
    tone: str | None = None
    context: str | None = None
    color: str | None = None
    initials: str | None = None
    networks: list[dict[str, Any]] | None = None
    design_system: dict[str, Any] | None = None
    cycle_goal: int | None = None
    cycle_done: int | None = None
    guidelines: str | None = None
    status: str | None = None


class PieceResponse(BaseModel):
    id: str
    num: str | None = None
    profile_id: str | None = None
    project_id: str | None = None
    title: str
    subtitle: str | None = None
    content_type: str
    net: str | None = None
    stage: str
    needs: bool
    body: str | None = None
    script: str | None = None
    caption: str | None = None
    cta: str | None = None
    tags: str | None = None
    slides: Any | None = None
    images: Any | None = None
    timeline: Any | None = None
    progress: int | None = None
    squad: str | None = None
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
    subtitle: str | None = None
    net: str = "li"
    content_type: str = "article"
    stage: str = "idea"
    script: str | None = None
    caption: str | None = None
    cta: str | None = None
    tags: str | None = None
    slides: list[str] | None = None
    images: list[str] | None = None
    progress: int | None = None
    squad: str | None = None
    needs: bool = False


class UpdatePieceStageRequest(BaseModel):
    stage: str


class UpdatePieceContentRequest(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    script: str | None = None
    caption: str | None = None
    cta: str | None = None
    tags: str | None = None
    body: str | None = None
    slides: list[str] | None = None
    progress: int | None = None
    squad: str | None = None
    needs: bool | None = None


class PublishPieceRequest(BaseModel):
    url: str | None = None


class DecisionResponse(BaseModel):
    id: str
    profile_id: str
    run_id: str
    kind: str
    title: str
    subtitle: str | None = None
    status: str
    options: Any | None = None
    selected_option_id: str | None = None
    piece_id: str | None = None
    waiting_label: str | None = None
    platform_label: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SelectDecisionRequest(BaseModel):
    option_id: str
    squad_id: str | None = None  # visual squad after pauta; defaults by net


class ProducePieceRequest(BaseModel):
    squad_id: str | None = None
    theme: str | None = None
    guidance: str | None = None  # ajuste fino / orientação


class OracleRunRequest(BaseModel):
    net: str = "ig"
    theme: str | None = None
    start_point_id: str | None = None


class CreateProductionRequest(BaseModel):
    profile_id: str
    platform: str = Field(description="ig | yt | li")
    squad_id: str = "oraculo"
    start_point_id: str = "autonoma"
    theme: str | None = None


class ProductionResponse(BaseModel):
    piece: PieceResponse
    decision: DecisionResponse | None = None


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


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: str, session: AsyncSession = Depends(get_session)):
    repo = ProfileRepository(session)
    profile = await repo.get_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile {profile_id} not found")
    return profile


@router.post("/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(req: CreateProfileRequest, session: AsyncSession = Depends(get_session)):
    profile = Profile(
        id=req.id or str(uuid.uuid4()),
        persona_id=req.persona_id,
        name=req.name,
        handle=req.handle,
        company=req.company,
        platform=req.platform or "multi",
        niche=req.niche,
        audience=req.audience,
        tone=req.tone,
        context=req.context,
        color=req.color or "#1BC5BD",
        initials=req.initials or req.name[:2].upper(),
        networks=req.networks,
        design_system=req.design_system,
        cycle_goal=req.cycle_goal if req.cycle_goal is not None else 12,
        cycle_done=req.cycle_done if req.cycle_done is not None else 0,
        guidelines=req.guidelines or req.context,
        status=req.status or "active",
    )
    repo = ProfileRepository(session)
    created = await repo.create(profile)
    await session.commit()
    await session.refresh(created)
    return created


@router.patch("/profiles/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str,
    req: UpdateProfileRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProfileRepository(session)
    updated = await repo.update(profile_id, **req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Profile {profile_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/profiles/{profile_id}/oracle/runs", response_model=DecisionResponse, status_code=201)
async def run_oracle(
    profile_id: str,
    req: OracleRunRequest,
    session: AsyncSession = Depends(get_session),
):
    profiles = ProfileRepository(session)
    profile = await profiles.get_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile {profile_id} not found")
    oracle = OracleService(session)
    decision = await oracle.run(
        profile,
        net=req.net,
        theme=req.theme,
        start_point_id=req.start_point_id,
    )
    await session.commit()
    await session.refresh(decision)
    return decision


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
        subtitle=req.subtitle,
        net=req.net,
        content_type=req.content_type,
        stage=req.stage,
        needs=req.needs,
        script=req.script,
        caption=req.caption,
        cta=req.cta,
        tags=req.tags,
        slides=req.slides,
        images=req.images or [],
        progress=req.progress,
        squad=req.squad,
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
    updated = await repo.update_content(piece_id, **req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/pieces/{piece_id}/produce", response_model=PieceResponse)
async def produce_piece(
    piece_id: str,
    req: ProducePieceRequest,
    session: AsyncSession = Depends(get_session),
):
    """(Re)gera pacote visual via squad LLM e abre/atualiza checkpoint de revisão."""
    pieces = PieceRepository(session)
    profiles = ProfileRepository(session)
    decisions = DecisionRepository(session)
    piece = await pieces.get_by_id(piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail=f"Piece {piece_id} not found")
    if not piece.profile_id:
        raise HTTPException(status_code=400, detail="Piece has no profile_id")
    profile = await profiles.get_by_id(piece.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Dismiss prior pending review for this piece
    pending = await decisions.list_all(profile_id=piece.profile_id, status="pending")
    for d in pending:
        if d.kind == "revisao" and d.piece_id == piece.id:
            d.status = "dismissed"

    option = {
        "title": piece.title,
        "hook": piece.caption or piece.subtitle,
        "angle": piece.script,
        "style": "PRÁTICO",
    }
    production = ProductionService(session)
    piece, _review = await production.produce(
        piece,
        profile,
        option=option,
        squad_id=req.squad_id,
        theme=req.theme or piece.title,
        guidance=req.guidance,
        create_review=True,
    )
    await session.commit()
    await session.refresh(piece)
    return piece


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


# --- Decisions ---

@router.get("/decisions", response_model=list[DecisionResponse])
async def list_decisions(
    profile_id: str | None = Query(None),
    status: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = DecisionRepository(session)
    return await repo.list_all(profile_id=profile_id, status=status)


@router.post("/decisions/{decision_id}/select", response_model=DecisionResponse)
async def select_decision(
    decision_id: str,
    req: SelectDecisionRequest,
    session: AsyncSession = Depends(get_session),
):
    decisions = DecisionRepository(session)
    pieces = PieceRepository(session)
    profiles = ProfileRepository(session)
    decision = await decisions.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    if decision.kind != "pauta":
        raise HTTPException(status_code=400, detail="Only pauta decisions accept option select")

    options = decision.options or []
    option = next((o for o in options if o.get("id") == req.option_id), None)
    if not option:
        raise HTTPException(status_code=400, detail=f"Option {req.option_id} not found")

    profile = await profiles.get_by_id(decision.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    decision.selected_option_id = req.option_id
    decision.status = "resolved"

    title = option.get("title") or decision.title
    pl = (decision.platform_label or "ig").lower()
    if pl in ("ig", "yt", "li", "tt"):
        net = pl
    elif "youtube" in pl:
        net = "yt"
    elif "linkedin" in pl:
        net = "li"
    else:
        net = "ig"

    squad_id = resolve_squad_id(req.squad_id, net)

    # Reuse piece linked at production start, otherwise create
    piece = await pieces.get_by_id(decision.piece_id) if decision.piece_id else None
    if piece:
        piece.title = title
        piece.subtitle = option.get("hook") or piece.subtitle or "Pauta aprovada"
        piece.net = net
        piece.script = option.get("angle")
        piece.caption = option.get("hook")
        piece.stage = "prod"
        piece.needs = False
        cur = list(piece.timeline) if piece.timeline else []
        cur.append(
            [
                datetime.now().strftime("%d/%m %H:%M"),
                "Oráculo",
                f"Pauta aprovada: {option.get('label')}",
            ]
        )
        piece.timeline = cur
    else:
        piece = Piece(
            id=str(uuid.uuid4()),
            num=await pieces.get_next_num(),
            profile_id=decision.profile_id,
            title=title,
            subtitle=option.get("hook") or "Pauta aprovada",
            net=net,
            content_type="post",
            stage="prod",
            needs=False,
            script=option.get("angle"),
            caption=option.get("hook"),
            squad=SQUAD_LABELS.get(squad_id, squad_id),
            timeline=[
                [
                    datetime.now().strftime("%d/%m %H:%M"),
                    "Oráculo",
                    f"Pauta aprovada: {option.get('label')}",
                ]
            ],
        )
        piece = await pieces.create(piece)
        decision.piece_id = piece.id

    production = ProductionService(session)
    piece, _review = await production.produce(
        piece,
        profile,
        option=option,
        squad_id=squad_id,
        theme=title,
        create_review=True,
    )
    decision.piece_id = piece.id

    await session.commit()
    await session.refresh(decision)
    return decision


@router.post("/decisions/{decision_id}/approve-package", response_model=DecisionResponse)
async def approve_package(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
):
    decisions = DecisionRepository(session)
    pieces = PieceRepository(session)
    decision = await decisions.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    if decision.kind != "revisao":
        raise HTTPException(status_code=400, detail="Only revisao decisions can approve packages")
    if decision.piece_id:
        await pieces.publish(decision.piece_id)
    decision.status = "resolved"
    await session.commit()
    await session.refresh(decision)
    return decision


@router.post("/decisions/{decision_id}/dismiss", response_model=DecisionResponse)
async def dismiss_decision(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
):
    decisions = DecisionRepository(session)
    decision = await decisions.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    decision.status = "dismissed"
    await session.commit()
    await session.refresh(decision)
    return decision


@router.post("/decisions/{decision_id}/return-oracle", response_model=DecisionResponse)
async def return_to_oracle(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Dismiss current decision and spawn a fresh oracle run for the same profile."""
    decisions = DecisionRepository(session)
    profiles = ProfileRepository(session)
    decision = await decisions.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    decision.status = "dismissed"
    profile = await profiles.get_by_id(decision.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    net = "ig"
    if decision.platform_label and decision.platform_label.lower() in ("ig", "yt", "li", "tt"):
        net = decision.platform_label.lower()
    oracle = OracleService(session)
    fresh = await oracle.run(profile, net=net)
    await session.commit()
    await session.refresh(fresh)
    return fresh


# --- Productions ---

@router.post("/productions", response_model=ProductionResponse, status_code=201)
async def create_production(
    req: CreateProductionRequest,
    session: AsyncSession = Depends(get_session),
):
    profiles = ProfileRepository(session)
    pieces = PieceRepository(session)
    profile = await profiles.get_by_id(req.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile {req.profile_id} not found")

    stage = "idea"
    needs = False
    title = req.theme.strip() if req.theme and req.theme.strip() else "Nova produção"
    visual_direct = req.squad_id in ("ig-studio", "yt-roteirista", "carrosseis", "ads")
    if req.squad_id == "oraculo" or req.start_point_id in ("autonoma", "manual"):
        stage = "pauta"
        needs = True
        if not req.theme:
            title = "Pauta em pesquisa pelo Oráculo"
    elif visual_direct:
        stage = "prod"
        needs = False

    piece = Piece(
        id=str(uuid.uuid4()),
        num=await pieces.get_next_num(),
        profile_id=req.profile_id,
        title=title,
        subtitle="Nova produção",
        net=req.platform,
        content_type="post",
        stage=stage,
        needs=needs,
        squad=SQUAD_LABELS.get(req.squad_id, req.squad_id),
        script=req.theme,
        timeline=[
            [
                datetime.now().strftime("%d/%m %H:%M"),
                "Operador",
                f"Produção iniciada · squad {req.squad_id}",
            ]
        ],
    )
    created_piece = await pieces.create(piece)

    decision = None
    if req.squad_id == "oraculo" or (
        req.start_point_id in ("autonoma", "manual") and not visual_direct
    ):
        oracle = OracleService(session)
        decision = await oracle.run(
            profile,
            net=req.platform,
            theme=req.theme,
            start_point_id=req.start_point_id,
        )
        decision.piece_id = created_piece.id
    elif visual_direct:
        # Skip oracle — produce package immediately from theme
        production = ProductionService(session)
        option = {
            "title": title,
            "hook": req.theme or title,
            "angle": req.theme or "",
            "style": "PRÁTICO",
        }
        created_piece, decision = await production.produce(
            created_piece,
            profile,
            option=option,
            squad_id=req.squad_id,
            theme=req.theme or title,
            create_review=True,
        )

    await session.commit()
    await session.refresh(created_piece)
    if decision:
        await session.refresh(decision)

    return ProductionResponse(piece=created_piece, decision=decision)
