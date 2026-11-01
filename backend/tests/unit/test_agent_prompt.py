"""Compositor de alma, ofício e lição."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.agent import Agent
from app.modules.agents.design_profiles import split_profile
from app.modules.agents.prompt import LESSON_MAP_LINE, agent_id_for_stage, build_agent_prompt, clip
from app.modules.agents.repository import AgentRepository
from app.shared.database import Base


def test_legacy_soul_stays_one_block():
    text = build_agent_prompt(
        name="Tester",
        role="QA",
        soul_text="# Alma de Teste",
    )
    assert "## Alma Operacional" in text
    assert "# Alma de Teste" in text
    assert "## Ofício" not in text
    assert "## Alma\n" not in text


def test_split_sections_keep_order():
    text = build_agent_prompt(
        name="Yuri UX",
        role="Prova Visual",
        sector="Design",
        soul_text="# Lugar\nInterface.",
        craft_text="# Quando entra\nDepois do token.",
        canon_text="Uma skill estética por job.",
        lessons=[
            {"status": "adotada", "title": "Contraste", "lesson": "Devolve o token.", "why": "AA"},
        ],
        project_memory="Memórias aprovadas deste projeto:\n\n## nota.md\nOlhou o dossiê.",
        stage_contract="Grave prototipo/index.html.",
    )
    assert text.index("## Alma") < text.index("## Ofício")
    assert text.index("## Ofício") < text.index("## Cânone de design")
    assert text.index("## Cânone de design") < text.index("## Lições deste papel")
    assert text.index("## Lições deste papel") < text.index("Memórias aprovadas")
    assert text.index("Memórias aprovadas") < text.index("## Contrato da etapa")
    assert "setor Design" in text
    assert LESSON_MAP_LINE in text


def test_proposed_lesson_stays_out_and_cap_is_three():
    lessons = [{"status": "proposta", "title": "Fora", "lesson": "não entra"}]
    lessons += [
        {"status": "adotada", "title": f"L{n}", "lesson": f"lição {n}"}
        for n in range(5)
    ]
    text = build_agent_prompt(
        name="Marina",
        role="Marca",
        soul_text="alma",
        craft_text="ofício",
        lessons=lessons,
    )
    assert "não entra" not in text
    assert "### L0" in text
    assert "### L2" in text
    assert "### L3" not in text


def test_stage_resolution_and_profile_split():
    assert agent_id_for_stage("visual_proof", "enzo") == "ux-ui"
    assert agent_id_for_stage("qa_fe", "validador") is None
    assert agent_id_for_stage("brief", "marina") == "marca"
    soul, craft = split_profile("# Alma\n\n# Lugar\nTela.\n\n# Ofício\n\n# Quando entra\nDepois.\n")
    assert "Lugar" in soul
    assert "Quando entra" in craft
    assert "# Alma" not in soul


def test_clip_adds_ellipsis_without_rewriting_source():
    source = "a" * 20
    assert clip(source, 10).endswith("…")
    assert source == "a" * 20


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as s:
        s.add(
            Agent(
                id="ag-test-1",
                name="Tester",
                role="QA",
                sector="Qualidade",
                status="active",
                soul_text="# Alma de Teste",
            )
        )
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_recording_a_lesson_does_not_change_soul(session):
    repo = AgentRepository(session)
    before = (await repo.get_by_id("ag-test-1")).soul_text
    await repo.add_lesson("ag-test-1", "Devolver contraste.", evidence="ap-1")
    await session.commit()
    agent = await repo.get_by_id("ag-test-1")
    assert agent.soul_text == before
    assert agent.soul_locked is True
    assert agent.craft_text is None
