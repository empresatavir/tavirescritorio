"""Unit tests for Factory and Studio repositories."""
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.shared.database import Base
from app.models.template import EngineeringTemplate
from app.models.project import Project
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece
from app.modules.factory.repository import TemplateRepository
from app.modules.studio.repository import ProfileRepository, PieceRepository, DecisionRepository
from app.modules.studio.oracle_service import OracleService, _fallback_options
from app.modules.studio.production_service import (
    ProductionService,
    fallback_ads,
    fallback_carousel,
    fallback_yt_script,
    resolve_squad_id,
)
from app.models.studio_decision import StudioDecision


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as s:
        # Template
        tpl = EngineeringTemplate(
            id="lp-c",
            name="TAVIR Fábrica · LPs · Criação",
            category="lp",
            mode="c",
            stages=["Demanda", "Construção", "QA", "Handoff"],
            mesas=["Dora", "Diego"],
            gate_required=True,
            sort_order=1,
        )
        s.add(tpl)

        # Factory Project
        proj = Project(
            id="fp-test-1",
            slug="lp-teste",
            name="LP Teste",
            client="Cliente Teste",
            company="Cliente Teste",
            template_code="lp-c",
            stages_done=1,
            total_stages=4,
            status="paused",
            pendencies=[{"id": "pnd-test", "title": "Aprovação de copy", "from": "Revisor"}],
            event_log=[["agora", "Operação", "Projeto criado"]],
        )
        s.add(proj)

        # Profile
        profile = Profile(
            id="pf-test",
            name="Perfil Teste",
            niche="Tecnologia",
            color="#B7F34A",
            initials="PT",
        )
        s.add(profile)
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_factory_repository_flow(session):
    repo = TemplateRepository(session)

    # Buscar template por código
    tpl = await repo.get_by_code("lp-c")
    assert tpl is not None
    assert tpl.name == "TAVIR Fábrica · LPs · Criação"
    assert len(tpl.stages) == 4

    # Listar projetos da fábrica
    projs = await repo.list_factory_projects()
    assert len(projs) == 1
    assert projs[0].id == "fp-test-1"

    # Atualizar estágio
    updated_proj = await repo.update_project_stage("fp-test-1", 3)
    await session.commit()
    assert updated_proj.stages_done == 3

    # Resolver pendência
    resolved_proj = await repo.resolve_project_pendency("fp-test-1", "pnd-test", "Aprovado pelo CEO")
    await session.commit()
    assert len(resolved_proj.pendencies) == 0
    assert resolved_proj.status == "running"  # retomou de paused para running


@pytest.mark.asyncio
async def test_studio_repository_flow(session):
    repo = PieceRepository(session)

    # Criar nova peça com numeração incremental automática
    piece = Piece(
        id="pc-test-1",
        profile_id="pf-test",
        title="Post sobre automação de tarefas",
        net="li",
        stage="idea",
    )
    created = await repo.create(piece)
    await session.commit()

    assert created.num.startswith("ST-")
    assert len(created.timeline) == 1

    # Mover etapa no Kanban
    moved = await repo.move_stage("pc-test-1", "prod")
    await session.commit()
    assert moved.stage == "prod"
    assert len(moved.timeline) == 2

    # Atualizar copy
    updated = await repo.update_content("pc-test-1", script="Novo roteiro", caption="Nova legenda")
    await session.commit()
    assert updated.script == "Novo roteiro"
    assert updated.caption == "Nova legenda"

    # Publicar
    published = await repo.publish("pc-test-1", "https://tavir.io/content/ST-031")
    await session.commit()
    assert published.stage == "done"
    assert published.status == "published"
    assert published.published_at is not None


@pytest.mark.asyncio
async def test_oracle_fallback_creates_decision(session, monkeypatch):
    async def _offline(**_kwargs):
        raise RuntimeError("teste sem motor")

    monkeypatch.setattr("app.modules.studio.oracle_service.chat_completion", _offline)
    profiles = ProfileRepository(session)
    profile = await profiles.get_by_id("pf-test")
    assert profile is not None

    opts = _fallback_options(profile, "Tema de teste", "ig")
    assert len(opts) == 3
    assert opts[0]["style"] == "CONTRARIAN"

    oracle = OracleService(session)
    decision = await oracle.run(profile, net="ig", theme="Tema de teste")
    await session.commit()
    assert decision.kind == "pauta"
    assert decision.status == "pending"
    assert len(decision.options) == 3
    assert decision.run_id.startswith("TVR-")

    dec_repo = DecisionRepository(session)
    listed = await dec_repo.list_all(profile_id="pf-test", status="pending")
    assert any(d.id == decision.id for d in listed)


def test_resolve_squad_and_fallbacks():
    assert resolve_squad_id(None, "yt") == "yt-roteirista"
    assert resolve_squad_id(None, "ig") == "ig-studio"
    assert resolve_squad_id("ads", "ig") == "ads"
    assert resolve_squad_id("Instagram Studio", "ig") == "ig-studio"


@pytest.mark.asyncio
async def test_production_fallback_creates_review(session, monkeypatch):
    async def _offline(**_kwargs):
        raise RuntimeError("teste sem motor")

    monkeypatch.setattr("app.modules.studio.production_service.chat_completion", _offline)
    profiles = ProfileRepository(session)
    pieces = PieceRepository(session)
    profile = await profiles.get_by_id("pf-test")
    assert profile is not None

    car = fallback_carousel(profile, {"title": "Tese X", "hook": "Hook", "angle": "Ângulo", "style": "PRÁTICO"})
    assert car["kind"] == "carousel"
    assert len(car["slides"]) >= 5

    yt = fallback_yt_script(profile, {"title": "Ep YT", "hook": "H", "angle": "A", "style": "BASTIDORES"})
    assert yt["kind"] == "yt_script"
    assert "HOOK" in yt["script"]

    ads = fallback_ads(profile, {"title": "Ads", "hook": "H", "angle": "A", "style": "CONTRARIAN"})
    assert ads["kind"] == "ads"
    assert len(ads["slides"]) == 3

    piece = Piece(
        id="pc-prod-1",
        num="ST-099",
        profile_id="pf-test",
        title="Peça em produção",
        net="ig",
        content_type="post",
        stage="prod",
        needs=False,
    )
    await pieces.create(piece)

    production = ProductionService(session)
    updated, review = await production.produce(
        piece,
        profile,
        option={"title": "Tese X", "hook": "Hook", "angle": "Ângulo", "style": "PRÁTICO"},
        squad_id="ig-studio",
        create_review=True,
    )
    await session.commit()
    assert updated.stage == "review"
    assert updated.slides and len(updated.slides) >= 5
    assert updated.caption
    assert updated.cta
    assert review is not None
    assert review.kind == "revisao"
    assert review.status == "pending"
    assert review.piece_id == updated.id
