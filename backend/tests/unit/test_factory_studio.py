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
from app.modules.studio.repository import ProfileRepository, PieceRepository


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
