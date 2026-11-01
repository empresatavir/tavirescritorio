"""Regras de produto do Raio-X."""
import pytest

from app.modules.raiox.catalog import CATALOG, catalog_payload, read_method
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.raiox_case import RaioxCase
from app.models.raiox_evidence import RaioxEvidence
from app.modules.raiox.repository import RaioxRepository
from app.modules.raiox.service import RaioxError, RaioxService
from app.shared.database import Base


@pytest.fixture
async def service():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield RaioxService(RaioxRepository(session))
        await session.commit()
    await engine.dispose()


@pytest.mark.asyncio
async def test_raiox_recusa_prioridade_sem_evidencia_util(service: RaioxService):
    created = await service.create_case(
        company_name="Depósito Norte",
        objective="Saber onde perde pedido",
        decision_needed="Qual oferta contratar primeiro",
    )
    assert created["status"] == "intake"

    with pytest.raises(RaioxError, match="evidência utilizável"):
        await service.set_priority(
            created["id"],
            priority_stage="atender",
            bottleneck="Demora no WhatsApp",
            priority_rationale="O contato chega e não é respondido",
            confidence="media",
        )

    collected = await service.add_evidence(
        created["id"],
        stage="atender",
        source="Dono, em conversa",
        claim="Mensagens ficam sem resposta no fim do dia",
        classification="indisponivel",
    )
    assert collected["status"] == "coleta"
    with pytest.raises(RaioxError, match="indisponível"):
        await service.set_priority(
            created["id"],
            priority_stage="atender",
            bottleneck="Demora no WhatsApp",
            priority_rationale="O contato chega e não é respondido",
            confidence="media",
        )


@pytest.mark.asyncio
async def test_raiox_devolutiva_exige_uma_oferta_e_o_passo_de_30_dias(service: RaioxService):
    created = await service.create_case(
        company_name="Depósito Norte",
        objective="Saber onde perde pedido",
        decision_needed="Qual oferta contratar primeiro",
        frontier="Só presença pública e relato do dono",
    )
    case_id = created["id"]
    await service.add_evidence(
        case_id,
        stage="encontrar",
        source="Google Maps",
        claim="Perfil sem horário e sem telefone clicável",
        classification="observado",
    )
    mapped = await service.add_evidence(
        case_id,
        stage="atender",
        source="Dono",
        claim="Quem chama no WhatsApp espera até o dia seguinte",
        classification="informado",
    )
    assert mapped["status"] == "mapa"

    prioritized = await service.set_priority(
        case_id,
        priority_stage="atender",
        bottleneck="A conversa esfria antes do pedido",
        priority_rationale="Ser encontrado já acontece; a perda está na resposta",
        confidence="alta",
        discarded="Presença Local fica para depois",
    )
    assert prioritized["status"] == "prioridade"
    assert prioritized["debrief_decision"] is None

    with pytest.raises(RaioxError, match="oferta seguinte"):
        await service.set_debrief(
            case_id,
            decision="proposta_emitida",
            reason="O dono quer corrigir o atendimento",
            next_offer="nenhuma",
            plan_30="Responder em horário combinado",
        )

    debrief = await service.set_debrief(
        case_id,
        decision="proposta_emitida",
        reason="O dono quer corrigir o atendimento",
        next_offer="atendimento",
        plan_30="Combinar quem responde e em qual janela",
    )
    assert debrief["status"] == "devolutiva"
    assert debrief["next_offer"] == "atendimento"

    closed = await service.close_case(case_id)
    assert closed["status"] == "fechado"


@pytest.mark.asyncio
async def test_raiox_nao_emitir_nao_carrega_oferta(service: RaioxService):
    created = await service.create_case(
        company_name="Loja Sul",
        objective="Decidir se vale investir agora",
        decision_needed="Seguir ou parar",
    )
    case_id = created["id"]
    await service.add_evidence(
        case_id,
        stage="vender",
        source="Dono",
        claim="Não há decisor disponível neste mês",
        classification="informado",
    )
    await service.set_priority(
        case_id,
        priority_stage="vender",
        bottleneck="Sem decisor para a próxima oferta",
        priority_rationale="O diagnóstico não tem quem receba a proposta",
        confidence="baixa",
    )
    stopped = await service.set_debrief(
        case_id,
        decision="nao_emitir",
        reason="Sem decisor, a proposta não tem destinatário",
        next_offer="crescimento",
        plan_30="Ignorado",
    )
    assert stopped["next_offer"] == "nenhuma"
    assert stopped["plan_30"] is None
    assert stopped["status"] == "devolutiva"


@pytest.mark.asyncio
async def test_raiox_deep_scan_so_na_leitura_completa_e_exige_frentes(service: RaioxService):
    with pytest.raises(RaioxError, match="leitura completa"):
        await service.create_case(
            company_name="Oficina",
            objective="Estudo de amigo",
            decision_needed="Se vale seguir",
            product_id="estudo_rapido",
            deep_scan=True,
        )

    created = await service.create_case(
        company_name="Oficina de Moda",
        objective="Pautar venda e marca",
        decision_needed="Qual oferta única vem primeiro",
        product_id="completo",
        deep_scan=True,
        physical_store=True,
    )
    case_id = created["id"]
    assert created["deep_scan"] is True
    assert [item["id"] for item in created["scan"]] == [
        "site",
        "instagram",
        "google",
        "maps",
        "opinioes",
        "concorrentes",
    ]

    await service.add_evidence(
        case_id,
        stage="encontrar",
        source="Fachada",
        claim="A loja depende do Instagram",
        classification="observado",
        front="site",
    )
    await service.set_priority(
        case_id,
        priority_stage="encontrar",
        bottleneck="Quem procura a loja não acha um site",
        priority_rationale="A reputação existe e o caminho próprio não",
        confidence="media",
    )
    with pytest.raises(RaioxError, match="deep scan"):
        await service.set_debrief(
            case_id,
            decision="proposta_emitida",
            reason="O dono quer ser encontrado fora do Instagram",
            next_offer="presenca_local",
            plan_30="Publicar ficha e telefone",
        )

    for front, claim in (
        ("instagram", "O perfil não leva a um site"),
        ("google", "A busca local não mostra a loja com telefone"),
        ("maps", "A ficha não tem horário"),
        ("opinioes", "As avaliações falam de atendimento e não de site"),
        ("concorrentes", "Duas lojas vizinhas têm site e a Oficina não"),
    ):
        await service.add_evidence(
            case_id,
            stage="encontrar",
            source="Varredura",
            claim=claim,
            classification="observado",
            front=front,
        )

    closed = await service.set_debrief(
        case_id,
        decision="proposta_emitida",
        reason="O dono quer ser encontrado fora do Instagram",
        next_offer="presenca_local",
        plan_30="Publicar ficha e telefone",
    )
    assert closed["status"] == "devolutiva"
    assert all(item["covered"] for item in closed["scan"])


def test_raiox_catalogo_nao_deixa_peca_de_fora_e_ordena_por_caixa():
    ids = [item["id"] for item in CATALOG]
    assert ids == [
        "estudo_rapido",
        "diagnostico",
        "presenca_local",
        "atendimento",
        "pagina_vendas",
        "landing",
        "criacao_oferta",
        "catalogo",
        "completo",
        "deep_scan",
        "branding",
        "atendimento_automatizado",
        "comercio",
        "crescimento",
        "conteudo",
        "video",
        "proposta",
    ]
    ranks = [item["cash_rank"] for item in CATALOG]
    assert ranks == list(range(1, len(CATALOG) + 1))
    payload = catalog_payload()
    assert set(payload["ciclo"]["mobile"]) == {"estado", "leva", "fica_no_pc"}
    for item in payload["items"]:
        plano = item["plano"]
        assert plano["objetivo"]
        assert plano["temos"] and plano["precisa"] and plano["ferramentas"] and plano["criar"]
        assert plano["investimento"] and plano["estrutura"] and plano["mobile"]
        assert plano["quando"] in {"agora", "depois_da_primeira_receita", "depois_da_base"}
    page = read_method("copywriting/valor-equation")
    assert "Valor" in page["definition"]
    with pytest.raises(ValueError):
        read_method("raw/livros/100-million-offer-alex-hormozi--fonte")
    assert "video" in {item["id"] for item in CATALOG if item["kind"] == "entrega"}
    assert "proposta" in {item["id"] for item in CATALOG if item["kind"] == "entrega"}


@pytest.mark.asyncio
async def test_raiox_recusa_origem_invalida_e_pacote_fora_do_basico(service: RaioxService):
    with pytest.raises(RaioxError, match="Origem"):
        await service.create_case(
            company_name="Loja do Amigo",
            objective="Ver onde a venda trava",
            decision_needed="Qual serviço contratar",
            origin="instagram",
        )
    with pytest.raises(RaioxError, match="básico"):
        await service.create_case(
            company_name="Loja do Amigo",
            objective="Ver onde a venda trava",
            decision_needed="Qual serviço contratar",
            package_id="ouro",
        )
    created = await service.create_case(
        company_name="Loja do Amigo",
        objective="Ver onde a venda trava",
        decision_needed="Qual serviço contratar",
        origin="amigo",
        segment="Roupa online",
        public_link="https://instagram.com/loja",
    )
    assert created["origin"] == "amigo"
    assert created["segment"] == "Roupa online"
    assert created["public_link"] == "https://instagram.com/loja"
    assert created["package_id"] == "basico"


@pytest.mark.asyncio
async def test_raiox_aceita_video_e_proposta_como_oferta_seguinte(service: RaioxService):
    for offer in ("video", "proposta"):
        created = await service.create_case(
            company_name=f"Prova {offer}",
            objective="Fechar uma entrega",
            decision_needed="Qual serviço sai primeiro",
            origin="rua",
            segment="Serviço",
        )
        case_id = created["id"]
        await service.add_evidence(
            case_id,
            stage="vender",
            source="Dono",
            claim="A proposta não volta e o vídeo não sai",
            classification="informado",
        )
        await service.set_priority(
            case_id,
            priority_stage="vender",
            bottleneck="A entrega prometida não chega na mão do cliente",
            priority_rationale="Há relato do dono nesta etapa",
            confidence="media",
        )
        debrief = await service.set_debrief(
            case_id,
            decision="proposta_emitida",
            reason="Uma entrega fecha a prova",
            next_offer=offer,
            plan_30="Entregar a quantidade combinada",
        )
        assert debrief["next_offer"] == offer
        assert debrief["package_id"] == "basico"
