"""Demandas isoladas, controle do projeto, cerca, memória e pedido por pasta."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.factory_run import FactoryRun
from app.models.project import Project
from app.modules.cursor_link.client import order_destination, workspace_slot
from app.modules.factory.compile_step import CompileError, compile_demand, filter_refino
from app.modules.factory.demands import (
    DemandError,
    advance,
    correction_block,
    create_demand,
    portrait,
)
from app.modules.factory.esteiras import stage_definitions
from app.modules.factory.knowledge_map import pages_prompt
from app.modules.factory.memory_store import approve, indexed_names, propose
from app.modules.factory.project_control import (
    ControlError,
    automation_block_reason,
    validate_control,
)
from app.shared.database import Base


def _flags(**overrides) -> dict:
    automation = {
        "auto_entender": True,
        "auto_refinar": True,
        "auto_corrigir": True,
        "auto_compilar": True,
        "auto_entregar": False,
        "novas_entram_manuais": False,
    }
    automation.update(overrides)
    return automation


@pytest.fixture
async def session(tmp_path):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as opened:
        opened.info["root"] = tmp_path
        yield opened
    await engine.dispose()


def _project(root, name: str, slug: str, control: dict | None = None) -> Project:
    folder = root / slug
    folder.mkdir()
    return Project(
        id=slug,
        slug=slug,
        name=name,
        template_code="lp-c",
        stages_done=0,
        total_stages=12,
        local_path=str(folder),
        status="active",
        control=control
        or {
            "automation": _flags(),
            "auto_types": [],
            "build_command": "python -c \"print(1)\"",
            "build_artifact": "dist/app.bin",
            "bases": [],
        },
    )


@pytest.mark.asyncio
async def test_demanda_isola_pasta_e_retrato(session, tmp_path):
    alpha = _project(tmp_path, "Alpha", "alpha")
    beta = _project(tmp_path, "Beta", "beta")
    session.add_all([alpha, beta])
    await session.commit()

    one = await create_demand(session, alpha, title="Landing", demand_type="criacao", opt_out=False)
    two = await create_demand(session, beta, title="Outra", demand_type="manutencao", opt_out=False)
    secret = tmp_path / "beta" / "fonte" / "segredo.txt"
    secret.parent.mkdir(parents=True, exist_ok=True)
    secret.write_text("SEGREDO-BETA", encoding="utf-8")
    await session.commit()

    assert one.code == "DEM-001"
    assert two.code == "DEM-001"
    assert str(tmp_path / "alpha" / "demandas" / "DEM-001") in one.folder
    assert "beta" not in one.folder
    assert (tmp_path / "alpha" / "fonte").is_dir()
    assert (tmp_path / "alpha" / "entrega").is_dir()
    assert (tmp_path / "alpha" / "memory" / "projeto").is_dir()
    text = portrait(alpha, one)
    assert "DEM-001" in text
    assert "Alpha" in text
    assert "SEGREDO-BETA" not in text
    assert "beta" not in text.lower()
    assert str(tmp_path) not in text
    run_one = await session.get(FactoryRun, one.run_id)
    run_two = await session.get(FactoryRun, two.run_id)
    assert run_one is not None and run_one.workspace_path == one.folder
    assert run_one.meta["demand_id"] == one.id
    assert run_one.template_code == "lp-c"
    assert run_two is not None and run_two.workspace_path == two.folder
    assert run_two.template_code == "lp-m"
    assert "beta" not in (run_one.workspace_path or "")


def test_controle_recusa_compilar_sem_comando():
    with pytest.raises(ControlError):
        validate_control({"automation": {"auto_compilar": True}, "build_command": "", "build_artifact": ""})


def test_opt_out_e_tipo_fora_da_lista():
    control = {"automation": _flags(), "auto_types": ["manutencao"]}
    assert "fora da automação" in automation_block_reason(
        control, demand_type="criacao", opt_out=True, action="refinar"
    )
    assert "tipo" in automation_block_reason(
        control, demand_type="criacao", opt_out=False, action="refinar"
    )
    assert automation_block_reason(control, demand_type="manutencao", opt_out=False, action="refinar") is None


def test_pedidos_de_pastas_diferentes_nao_se_misturam(tmp_path):
    alpha = tmp_path / "alpha"
    beta = tmp_path / "beta"
    alpha.mkdir()
    beta.mkdir()
    (alpha / "dossie.md").write_text("a", encoding="utf-8")
    (beta / "dossie.md").write_text("b", encoding="utf-8")
    order_a = order_destination(str(alpha), ask=False)
    order_b = order_destination(str(beta), ask=False)
    order_a.write_text("pedido-alpha", encoding="utf-8")
    order_b.write_text("pedido-beta", encoding="utf-8")
    assert order_a.name == "pedido.md"
    assert order_a.read_text(encoding="utf-8") == "pedido-alpha"
    assert order_b.read_text(encoding="utf-8") == "pedido-beta"
    with workspace_slot(str(alpha)):
        with pytest.raises(RuntimeError, match="esta demanda já está em execução"):
            with workspace_slot(str(alpha)):
                pass
        with workspace_slot(str(beta)):
            pass


def test_trilhas_nao_trocam_etapa():
    criacao = {item["id"] for item in stage_definitions("lp-c")}
    manutencao = {item["id"] for item in stage_definitions("lp-m")}
    assert "brief" in criacao
    assert "m_gate0" not in criacao
    assert "m_gate0" in manutencao
    assert "brief" not in manutencao


@pytest.mark.asyncio
async def test_avanco_exige_arquivo_e_aceite(session, tmp_path):
    project = _project(tmp_path, "Alpha", "alpha")
    session.add(project)
    await session.commit()
    demand = await create_demand(session, project, title="Peça", opt_out=False)
    await session.commit()

    await advance(session, project, demand)
    assert demand.status == "entendimento"
    with pytest.raises(DemandError, match="entendimento.md"):
        await advance(session, project, demand)

    (tmp_path / "alpha" / "demandas" / demand.code / "entendimento.md").write_text("o que é", encoding="utf-8")
    await advance(session, project, demand)
    assert demand.status == "refino"
    (tmp_path / "alpha" / "demandas" / demand.code / "refino.md").write_text(
        "### 1. Fica\n\n### 2. Sai\n",
        encoding="utf-8",
    )
    await advance(session, project, demand)
    assert demand.status == "aceite"
    with pytest.raises(DemandError, match="Sem aceite"):
        await advance(session, project, demand)
    assert correction_block(demand)


def test_compilacao_recusa_artefato_antigo(tmp_path):
    folder = tmp_path / "demandas" / "DEM-001"
    folder.mkdir(parents=True)
    artifact = folder / "dist" / "app.bin"
    artifact.parent.mkdir()
    artifact.write_bytes(b"velho")
    old = (datetime.now() - timedelta(hours=2)).timestamp()
    os.utime(artifact, (old, old))
    project = _project(
        tmp_path,
        "Alpha",
        "alpha",
        {
            "automation": _flags(),
            "build_command": f"\"{sys.executable}\" -c \"print(1)\"",
            "build_artifact": str(artifact),
        },
    )
    demand = type("Row", (), {"folder": str(folder)})()
    with pytest.raises(CompileError, match="não é novo"):
        compile_demand(project, demand)


def test_secao_excluida_nao_entra_no_pacote():
    text = "### 1. Fica\nsim\n### 2. Sai\nnao\n"
    assert "Sai" not in filter_refino(text, [2])
    assert "Fica" in filter_refino(text, [2])


def test_memoria_candidata_fica_fora_do_indice(tmp_path):
    root = tmp_path / "alpha"
    root.mkdir()
    propose(str(root), "Caminho do build", "O comando gera dist/app.bin.")
    assert indexed_names(str(root)) == []
    other = tmp_path / "beta"
    other.mkdir()
    propose(str(other), "Segredo beta", "não vaza")
    saved = approve(str(root), "caminho-do-build.md")
    assert saved.name == "caminho-do-build.md"
    assert indexed_names(str(root)) == ["caminho-do-build.md"]
    assert "segredo-beta.md" not in indexed_names(str(root))
    assert indexed_names(str(other)) == []


def test_vault_respeita_dominio_do_projeto():
    blocked = pages_prompt("visual_proof", ["negocios"])
    assert "checklist-pre-entrega-ui" not in blocked
    allowed = pages_prompt("brief", ["negocios"])
    assert "perguntas-mom-test" in allowed
    assert "checklist-pre-entrega-ui" not in allowed


def test_aprovacao_nao_sobrescreve_edicao_manual(tmp_path):
    root = tmp_path / "alpha"
    root.mkdir()
    propose(str(root), "Nota", "versão do agente")
    projeto = root / "memory" / "projeto"
    projeto.mkdir(parents=True, exist_ok=True)
    (projeto / "nota.md").write_text("edição da pessoa\n", encoding="utf-8")
    saved = approve(str(root), "nota.md")
    assert saved.name == "nota-2.md"
    assert (projeto / "nota.md").read_text(encoding="utf-8") == "edição da pessoa\n"
