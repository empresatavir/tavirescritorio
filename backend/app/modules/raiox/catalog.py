"""Catálogo do Raio-X. Nada sai da lista. A ordem é a de caixa da TAVIR."""
from __future__ import annotations

import re
from pathlib import Path

KNOWLEDGE_ROOT = Path(__file__).resolve().parents[4] / "conhecimento"

MODES = ("estudo_rapido", "diagnostico", "completo")

SCAN_FRONTS = (
    {"id": "site", "label": "Site próprio", "physical_only": False},
    {"id": "instagram", "label": "Instagram", "physical_only": False},
    {"id": "google", "label": "Google", "physical_only": False},
    {"id": "maps", "label": "Google Maps", "physical_only": True},
    {"id": "opinioes", "label": "Opinião de cliente", "physical_only": False},
    {"id": "concorrentes", "label": "Concorrentes e diferenciais", "physical_only": False},
)

FRONT_IDS = {item["id"] for item in SCAN_FRONTS}

INFRA = {
    "public_url": "https://raiox.tavir.com.br",
    "database": (
        "O banco do produto publicado continua no Supabase. "
        "O escritório opera o caso e não troca esse apontamento."
    ),
    "mail": "Resend no domínio tavir.com.br. Convite e entrega seguem com segredo e chave separados.",
    "gates": "Aprovar o conteúdo e autorizar o envio continuam sendo dois atos.",
    "improvements": [
        "Vigiar o plano gratuito do Supabase: projeto pausado tira o subdomínio do ar.",
        "Ler os casos publicados no escritório sem migrar a fonte para o SQLite local.",
        "Não enviar ao cliente o alias técnico da Vercel.",
        "Manter a pasta de deploy e as funções de convite, revisão e entrega como estão.",
    ],
}

CATALOG: list[dict] = [
    {
        "id": "estudo_rapido",
        "kind": "modo",
        "cash_rank": 1,
        "name": "Estudo rápido",
        "cash_why": "Abre caixa nesta semana: uma leitura curta para um conhecido, com preço pequeno e escopo que cabe numa conversa.",
        "promise": "Uma lacuna visível e um próximo passo. Serve para a empresa de um amigo ou para marcar a conversa paga.",
        "includes": [
            "Sinais públicos que o dono reconhece",
            "Uma lacuna na jornada",
            "Decisão de parar ou seguir para o diagnóstico pago",
        ],
        "holds": [
            "Varredura de canais",
            "Mapa de marca",
            "Implantação",
        ],
        "status": "vendavel_agora",
        "vault": [
            "negocios/perguntas-mom-test",
            "negocios/jornada-fisica-cliente-loja",
            "mercados/avaliacoes-google-no-ponto-de-venda",
        ],
        "defaults": {
            "objective": "Ver, numa leitura curta, onde a empresa perde a próxima conversa.",
            "decision_needed": "Se vale abrir um diagnóstico pago ou parar por aqui.",
            "frontier": "Sinais públicos e o que o dono confirmar. Sem varredura e sem implantação.",
        },
    },
    {
        "id": "diagnostico",
        "kind": "modo",
        "cash_rank": 2,
        "name": "Diagnóstico",
        "cash_why": "É o produto de escopo fixo que já tem subdomínio, banco, convite e entrega. O caixa entra quando a devolutiva vira uma proposta.",
        "promise": "Onde a jornada perde demanda, conversa ou pedido, e qual oferta única vem primeiro.",
        "includes": [
            "Fronteira da coleta",
            "Evidência classificada",
            "Uma prioridade",
            "Devolutiva: proposta de uma oferta ou não emitir",
        ],
        "holds": [
            "Deep scan",
            "Pacote de várias implantações",
            "Construção de página, catálogo ou atendimento",
        ],
        "status": "vendavel_agora",
        "vault": [
            "negocios/pre-mortem",
            "frameworks/framework-mom-test",
            "negocios/distribuicao-vendas",
        ],
        "defaults": {
            "objective": "Descobrir onde a jornada perde demanda, conversa ou pedido.",
            "decision_needed": "Qual oferta única contratar primeiro, ou não emitir proposta.",
            "frontier": "Presença pública, relato do dono e acessos autorizados. Uma prioridade.",
        },
    },
    {
        "id": "presenca_local",
        "kind": "entrega",
        "cash_rank": 3,
        "name": "Presença Local",
        "cash_why": "É a implantação que o diagnóstico já apontou em caso real: ser encontrado no Google antes de produzir mais conteúdo.",
        "promise": "Google, dados da loja, fotos e um caminho de contato que funciona.",
        "includes": ["Ficha local", "Telefone e horário", "Fotos do ponto", "Caminho até o WhatsApp"],
        "holds": ["Diagnóstico novo", "Site completo", "Anúncio"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "mercados/avaliacoes-google-no-ponto-de-venda",
            "negocios/jornada-fisica-cliente-loja",
            "mercados/criterios-priorizacao-canal-vendas",
        ],
        "defaults": {},
    },
    {
        "id": "atendimento",
        "kind": "entrega",
        "cash_rank": 4,
        "name": "Atendimento",
        "cash_why": "Recorrência. Entra quando a conversa esfria antes do pedido e o dono aceita mudar a resposta.",
        "promise": "Quem chama recebe resposta, qualificação e um próximo passo.",
        "includes": ["Roteiro de resposta", "Qualificação", "Encaminhamento do pedido"],
        "holds": ["Robô no lugar do atendimento ainda não medido", "Catálogo", "Marca"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "psicologia/prova-social",
            "copywriting/alcance-quente",
        ],
        "defaults": {},
    },
    {
        "id": "pagina_vendas",
        "kind": "entrega",
        "cash_rank": 5,
        "name": "Página de vendas",
        "cash_why": "Projeto fechado com uma oferta e um destino. Só depois que a prioridade for venda, não presença.",
        "promise": "Uma página, uma oferta, um pedido.",
        "includes": ["Promessa", "Prova", "Preço", "Chamada para o pedido"],
        "holds": ["Site institucional inteiro", "Várias ofertas na mesma página"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "copywriting/valor-equation",
            "copywriting/nomenclatura-oferta",
            "frameworks/framework-100m-offers",
        ],
        "defaults": {},
    },
    {
        "id": "landing",
        "kind": "entrega",
        "cash_rank": 6,
        "name": "Landing page",
        "cash_why": "Peça de campanha com começo e fim. Cobra à parte da página de vendas permanente.",
        "promise": "Uma página para uma campanha ou uma oferta datada.",
        "includes": ["Uma promessa", "Uma prova", "Um prazo", "Um destino"],
        "holds": ["Marca completa", "Catálogo"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "copywriting/valor-equation",
            "psicologia/escassez",
            "copywriting/garantias-reversao-risco",
        ],
        "defaults": {},
    },
    {
        "id": "criacao_oferta",
        "kind": "entrega",
        "cash_rank": 7,
        "name": "Criação de oferta",
        "cash_why": "Empacota o que o diagnóstico achou numa oferta que dá para cobrar. O método vem do wiki compilado, não do texto integral dos livros.",
        "promise": "Nome, promessa, prova, garantia e preço de uma oferta.",
        "includes": ["Equação de valor", "O que entra e o que sai", "Garantia", "Nome"],
        "holds": ["Página", "Anúncio", "Atendimento"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "frameworks/framework-100m-offers",
            "copywriting/trim-and-stack",
            "copywriting/valor-equation",
            "negocios/grand-slam-offer",
        ],
        "defaults": {},
    },
    {
        "id": "catalogo",
        "kind": "entrega",
        "cash_rank": 8,
        "name": "Catálogo",
        "cash_why": "Vende quando o pedido trava porque o cliente não vê o que comprar.",
        "promise": "O que se vende, com preço e caminho de pedido, num lugar só.",
        "includes": ["Itens", "Preço", "Pedido"],
        "holds": ["Marca", "Tráfego", "Atendimento automatizado"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "mercados/historia-de-vendas",
            "copywriting/nomenclatura-oferta",
        ],
        "defaults": {},
    },
    {
        "id": "completo",
        "kind": "modo",
        "cash_rank": 9,
        "name": "Leitura completa",
        "cash_why": "Ticket maior. Pauta venda, posição e marca. Só abre quando o dono já aceita agir sobre a primeira prioridade.",
        "promise": "O que a empresa precisa ajustar em venda, posicionamento e marca, e qual implantação vem primeiro.",
        "includes": [
            "Mapa de vendas",
            "Posicionamento",
            "Leitura de marca",
            "Uma oferta seguinte, não o pacote inteiro",
        ],
        "holds": [
            "Executar página, catálogo e atendimento dentro da mesma leitura",
            "Nota mágica de maturidade",
        ],
        "status": "vendavel_com_escopo",
        "vault": [
            "frameworks/framework-posicionamento-dunford",
            "mercados/cinco-componentes-posicionamento",
            "mercados/alternativas-competitivas",
            "negocios/preco-premium",
        ],
        "defaults": {
            "objective": "Pautar vendas, posicionamento e marca, e indicar a primeira implantação.",
            "decision_needed": "O que muda primeiro, e qual oferta única executar.",
            "frontier": "Venda, posição e marca. A implantação fica na oferta seguinte.",
        },
    },
    {
        "id": "deep_scan",
        "kind": "recurso",
        "cash_rank": 10,
        "name": "Deep scan",
        "cash_why": "Entra só dentro da leitura completa. A varredura aumenta o preço da coleta; não substitui a proposta.",
        "promise": "Varredura dos canais, da opinião e de quem concorre, com diferencial apontado.",
        "includes": [
            "Site",
            "Instagram",
            "Google",
            "Google Maps quando houver loja física",
            "Opinião de cliente",
            "Quem são os concorrentes e o que os diferencia",
        ],
        "holds": [
            "Disparo automático para o prospect",
            "Varredura sem alguém conferir antes da devolutiva",
        ],
        "status": "dentro_da_leitura_completa",
        "vault": [
            "mercados/alternativas-competitivas",
            "mercados/avaliacoes-google-no-ponto-de-venda",
            "psicologia/prova-social",
        ],
        "defaults": {},
    },
    {
        "id": "branding",
        "kind": "entrega",
        "cash_rank": 11,
        "name": "Branding",
        "cash_why": "Implantação de marca. A leitura completa pode apontar a marca; a execução só se vende se a prioridade for essa.",
        "promise": "Nome, voz e sistema visual suficientes para a oferta que já foi escolhida.",
        "includes": ["Posição", "Voz", "Aplicação na peça que vende"],
        "holds": ["Manual infinito", "Campanha", "Site"],
        "status": "vender_se_a_prioridade_for_marca",
        "vault": [
            "mercados/posicionamento-como-contexto",
            "mercados/estilos-de-posicionamento",
            "design/dials-de-intencao-design",
        ],
        "defaults": {},
    },
    {
        "id": "atendimento_automatizado",
        "kind": "entrega",
        "cash_rank": 12,
        "name": "Atendimento automatizado",
        "cash_why": "Vem depois que o atendimento humano mostrou volume e roteiro. Automatizar antes disso cobra retrabalho.",
        "promise": "A primeira resposta e a qualificação seguem o roteiro já provado.",
        "includes": ["Roteiro estável", "Primeira resposta", "Passagem para uma pessoa quando o caso sai do roteiro"],
        "holds": ["Substituir o dono sem roteiro", "Catálogo", "Anúncio"],
        "status": "vender_depois_do_atendimento",
        "vault": [
            "frameworks/hook-model",
            "psicologia/fogg-behavior-model",
        ],
        "defaults": {},
    },
    {
        "id": "comercio",
        "kind": "entrega",
        "cash_rank": 13,
        "name": "Comércio digital",
        "cash_why": "Checkout e pedido. Só quando o gargalo já é a compra, não o encontro nem a conversa.",
        "promise": "O cliente escolhe e pede sem depender de uma conversa para cada item.",
        "includes": ["Pedido", "Preço", "Confirmação"],
        "holds": ["Marca", "Tráfego frio"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "negocios/jornada-compra-ideal",
            "copywriting/valor-equation",
        ],
        "defaults": {},
    },
    {
        "id": "crescimento",
        "kind": "entrega",
        "cash_rank": 14,
        "name": "Crescimento",
        "cash_why": "Retainer. Só com funil já medido. Antes disso é promessa sem base.",
        "promise": "Acompanhar o funil que já existe e ajustar o que a medição mostrar.",
        "includes": ["Medição", "Ajuste de uma etapa", "Revisão do período"],
        "holds": ["Diagnóstico inicial", "Página do zero"],
        "status": "vender_com_base_medida",
        "vault": [
            "frameworks/core-four",
            "frameworks/framework-100m-leads",
        ],
        "defaults": {},
    },
    {
        "id": "conteudo",
        "kind": "entrega",
        "cash_rank": 15,
        "name": "Conteúdo",
        "cash_why": "Peça editorial depois da prioridade. Não entra no preço da leitura.",
        "promise": "Uma peça que sustenta a oferta já escolhida.",
        "includes": ["Uma peça", "Um canal", "Uma chamada"],
        "holds": ["Calendário infinito", "Diagnóstico"],
        "status": "entrega_posterior",
        "vault": [
            "copywriting/conteudo-gratuito",
            "negocios/agencia-como-professor",
        ],
        "defaults": {},
    },
    {
        "id": "video",
        "kind": "entrega",
        "cash_rank": 16,
        "name": "Vídeo e Reels",
        "cash_why": "Serviço de cortes numa quantidade fechada. A bancada produz. O cliente não recebe acesso à ferramenta.",
        "promise": "Os vídeos combinados, prontos para publicar.",
        "includes": ["Quantidade fechada", "Cortes a partir do material do cliente"],
        "holds": ["Login do DocuFlow", "Calendário de postagem", "Pacote ouro"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "copywriting/conteudo-gratuito",
        ],
        "defaults": {},
    },
    {
        "id": "proposta",
        "kind": "entrega",
        "cash_rank": 17,
        "name": "Proposta com link",
        "cash_why": "Um link com prazo para o cliente ler e aceitar. O comprovante com hash continua fora até o apontamento sair da conta pessoal.",
        "promise": "Uma proposta com endereço e data de validade.",
        "includes": ["Texto da proposta", "Link", "Prazo"],
        "holds": ["Aceite com hash", "Portal de módulos", "Pacote ouro"],
        "status": "vender_depois_da_devolutiva",
        "vault": [
            "copywriting/valor-equation",
            "mercados/historia-de-vendas",
        ],
        "defaults": {},
    },
]

SELL_OFFERS = tuple(item["id"] for item in CATALOG if item["kind"] == "entrega")
_BY_ID = {item["id"]: item for item in CATALOG}
_PAGE = re.compile(r"^[a-z0-9-]+/[a-z0-9-]+$")


PLANOS: dict[str, dict] = {
    "estudo_rapido": {
        "quando": "agora",
        "objetivo": "Cobrar uma leitura curta, ou usá-la para marcar o diagnóstico pago, com um decisor na conversa.",
        "temos": [
            "O caso abre no escritório: fronteira, evidência, uma prioridade e devolutiva.",
            "O wiki já tem Mom Test, jornada de loja e avaliações no ponto de venda.",
            "A porta pública raiox.tavir.com.br existe se a conversa for formalizar.",
        ],
        "precisa": [
            "Um texto de uma página para deixar com o dono: a lacuna e o próximo passo.",
            "Preço decidido na hora de orçar. Não há tabela publicada.",
            "O decisor precisa aceitar ouvir e dizer se corrige a primeira lacuna.",
        ],
        "ferramentas": [
            "Escritório e navegador, para sinais públicos.",
            "Não contratar varredura, anúncio nem ferramenta de ranking.",
        ],
        "investimento": "Horas de uma conversa. Nenhuma assinatura nova. O preço sai no orçamento do caso, não de uma tabela.",
        "estrutura": "Um caso, fronteira curta, uma prioridade, devolutiva que para ou segue para o diagnóstico.",
        "criar": [
            "A folha de uma página já cabe na devolutiva. O texto que se envia é o que falta produzir no caso, sem sistema novo.",
        ],
        "mobile": "No celular, depois: empresa, lacuna e próximo passo. A leitura e o preço ficam no PC.",
    },
    "diagnostico": {
        "quando": "agora",
        "objetivo": "Entregar a leitura paga e sair com uma proposta de uma oferta só.",
        "temos": [
            "Produto publicado: formulário, Resend, PDF, aprovação separada do envio e Supabase.",
            "Console do escritório com as mesmas regras de evidência, prioridade e devolutiva.",
            "Ficha da oferta e dois diagnósticos reais no histórico. A amostra ainda não fecha preço nem capacidade.",
        ],
        "precisa": [
            "A proposta com valor continua no orçamento. A devolutiva registra a decisão e ainda não é o documento de preço.",
            "O escritório não lê os casos do Supabase. As duas pontas convivem; a fonte publicada não muda.",
            "Capacidade só fica publicável depois de 3 a 5 casos com horas medidas.",
        ],
        "ferramentas": [
            "raiox.tavir.com.br, Supabase, Resend no domínio tavir.com.br e o escritório.",
            "A auditoria de Instagram por API só entra em caso pago, com a contagem de pedidos exata.",
        ],
        "investimento": "Manter o Supabase acordado: no plano gratuito, projeto pausado tira o subdomínio do ar. Sem ferramenta nova e sem preço publicado.",
        "estrutura": "Intake no site publicado. Operação e devolutiva no escritório. Uma oferta seguinte.",
        "criar": [
            "Nada de banco, domínio ou fila nova. O passo é orçar a oferta que a devolutiva escolheu.",
        ],
        "mobile": "No celular, depois: status, data da devolutiva e oferta recomendada. Envio e preço ficam no PC.",
    },
    "presenca_local": {
        "quando": "agora",
        "objetivo": "Entregar a primeira implantação já apontada por caso real: a empresa ser encontrada e o contato funcionar.",
        "temos": [
            "Ficha da oferta, com promessa de ativos entregues e sem promessa de ranking ou leads.",
            "Um diagnóstico real que apontou presença antes de mais conteúdo.",
            "Google Business Profile e WhatsApp são contas do cliente.",
        ],
        "precisa": [
            "Checklist de entrega no escritório, ainda manual.",
            "Perfil da empresa no nome do cliente, com horário, telefone, área e fotos.",
            "Alguém do lado do cliente para atender o contato que passar a chegar.",
        ],
        "ferramentas": [
            "Perfil da Empresa no Google e WhatsApp, ambos do cliente.",
            "Escritório para o checklist. Nenhuma ferramenta de posição no Google.",
        ],
        "investimento": "Horas de implantação. Domínio, fotos e verificação são custo do cliente, separados da receita. A capacidade ainda não é publicável; estima-se pela lista de ativos.",
        "estrutura": "Um conjunto nomeado de ativos, revisão e entrega dos acessos ao titular.",
        "criar": [
            "O checklist de presença dentro do caso: ficha, dados consistentes, fotos, destino do contato. Publicação automática fica de fora.",
        ],
        "mobile": "No celular, em campo: foto da fachada, horário, telefone e link do WhatsApp. Texto e publicação ficam no PC.",
    },
    "atendimento": {
        "quando": "agora",
        "objetivo": "Cobrar o roteiro e a operação humana quando a conversa esfria antes do pedido.",
        "temos": [
            "Ficha da oferta e o escritório já consegue apontar Atendimento como a oferta seguinte.",
            "Envelope interno de horas, de 2026-07-05: 15 a 25 h no starter e 4 a 9 h por mês. Isso não é preço, SLA nem margem.",
        ],
        "precisa": [
            "Volume, dono do processo e uma pessoa de fallback.",
            "Canal no nome do cliente. O teste de ponta a ponta ainda limita vender autonomia.",
        ],
        "ferramentas": [
            "WhatsApp do cliente e o roteiro guardado no caso.",
            "Não abrir conta de API da Meta nem bot neste ciclo.",
        ],
        "investimento": "Horas de roteiro e de operação. A conta do canal é do cliente. O envelope de horas não vira tabela.",
        "estrutura": "Roteiro, o que a resposta pode e não pode dizer, e um humano quando o caso sai do roteiro.",
        "criar": [
            "O roteiro no próprio caso. A automação é outro item e não entra na base de fim de ano.",
        ],
        "mobile": "No celular, o operador vê o que responder e responde. O robô não nasce no telefone.",
    },
    "pagina_vendas": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "Cobrar uma página permanente com uma oferta e um destino de pedido.",
        "temos": [
            "A Fábrica no escritório já tem trilha de oferta, promessa e preço.",
            "O wiki tem equação de valor e nomenclatura de oferta.",
            "Na arquitetura da marca, página é componente, não uma segunda marca.",
        ],
        "precisa": [
            "Oferta nomeada, prova, preço orçado e um destino: WhatsApp ou pedido.",
            "Texto e imagens aprovados pelo cliente.",
        ],
        "ferramentas": [
            "Fábrica. Hospedagem que o portfólio já usa, só com cliente pagante.",
            "Domínio do cliente. Nenhum construtor novo.",
        ],
        "investimento": "Horas de uma página. Domínio e fotos são do cliente. Mídia paga não entra neste item.",
        "estrutura": "Uma URL, uma promessa, uma prova, um preço e um destino.",
        "criar": [
            "A página na Fábrica, puxada da oferta do caso. Sem gerador solto no Raio-X.",
        ],
        "mobile": "O celular não constrói a página. Pode guardar o link publicado e o destino do pedido.",
    },
    "landing": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "Cobrar uma página de campanha, com prazo, separada da página permanente.",
        "temos": [
            "A mesma Fábrica e o wiki de escassez e garantia.",
            "A diferença para a página de vendas é o prazo e o fim da campanha.",
        ],
        "precisa": [
            "Uma oferta datada, uma prova e a data em que a página sai do ar ou perde o bônus.",
        ],
        "ferramentas": [
            "Fábrica e o domínio ou caminho do cliente.",
            "Nenhuma ferramenta de anúncio neste item.",
        ],
        "investimento": "Horas de uma página com data. A verba de mídia, se existir, é do cliente e não entra nesta cobrança.",
        "estrutura": "Uma promessa, uma prova, um prazo e um destino.",
        "criar": [
            "A mesma trilha da página de vendas, com campo de prazo. Sem produto novo.",
        ],
        "mobile": "O celular guarda o link e a data de fim. A página se faz no PC.",
    },
    "criacao_oferta": {
        "quando": "agora",
        "objetivo": "Fechar uma oferta cobrável antes de construir página, catálogo ou anúncio.",
        "temos": [
            "Wiki compilado de oferta, equação de valor, o que entra e o que sai, e preço premium.",
            "A devolutiva já escolhe uma oferta seguinte.",
            "A Fábrica tem estágio de viabilidade e preço.",
        ],
        "precisa": [
            "O dono decide o que entra e o que fica de fora.",
            "Uma prova real, não um depoimento inventado.",
            "O preço sai no orçamento do caso.",
        ],
        "ferramentas": [
            "Wiki e o caso no escritório.",
            "Nenhuma planilha ou software de precificação novo.",
        ],
        "investimento": "Horas de uma sessão. Sem assinatura. O número do preço não está publicado e não entra no módulo.",
        "estrutura": "Uma ficha: nome, promessa, prova, garantia, preço e o que ficou de fora.",
        "criar": [
            "A ficha nasce na devolutiva do caso. É o papel que autoriza a segunda cobrança.",
        ],
        "mobile": "O celular mostra o nome da oferta e o próximo passo. Promessa, prova e preço ficam no PC.",
    },
    "catalogo": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "O cliente ver o que se vende, o preço e como pede, sem abrir uma loja.",
        "temos": [
            "A ficha de Comércio Digital descreve o projeto maior. Não há catálogo publicado da TAVIR.",
            "O WhatsApp do cliente já serve de destino de pedido.",
        ],
        "precisa": [
            "Lista de itens com preço, quem atualiza e o caminho do pedido.",
            "Checkout, estoque e frete ficam no Comércio Digital, fora desta base.",
        ],
        "ferramentas": [
            "Lista no caso e uma página ou mensagem com os itens.",
            "Nenhum gateway neste ciclo.",
        ],
        "investimento": "Horas da lista. Meio de pagamento, se um dia entrar, é conta e custo do cliente.",
        "estrutura": "Itens, preço e um destino. Quem mantém a lista fica nomeado.",
        "criar": [
            "A lista de itens no caso, exportável para a página ou para o WhatsApp. A loja não se constrói agora.",
        ],
        "mobile": "No celular, consultar item e preço e mandar o pedido no WhatsApp. Cadastro e alteração ficam no PC.",
    },
    "completo": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "Cobrar a leitura maior, de venda, posição e marca, e ainda assim indicar uma implantação só.",
        "temos": [
            "O modo já abre no escritório, com fronteira própria.",
            "O wiki de posicionamento Dunford e de preço premium.",
            "A regra da marca: mais de um gargalo não vira pacote. O Raio-X ordena.",
        ],
        "precisa": [
            "O dono já disposto a agir sobre a primeira prioridade.",
            "Mais tempo de coleta e acessos autorizados.",
            "Preço maior só depois de orçar. Não há série de horas.",
        ],
        "ferramentas": [
            "As mesmas do diagnóstico e o wiki.",
            "Nenhuma ferramenta de marca ou de varredura automática.",
        ],
        "investimento": "Mais horas que o diagnóstico. Sem assinatura nova. O preço não está publicado.",
        "estrutura": "O mesmo caso, fronteira maior, uma prioridade e uma oferta seguinte.",
        "criar": [
            "Nada além do modo que já existe. A devolutiva cita venda, posição e marca e escolhe um passo.",
        ],
        "mobile": "O celular mostra a prioridade e a oferta. O mapa de marca fica no PC.",
    },
    "deep_scan": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "Cobrar a coleta larga dentro da leitura completa, com alguém conferindo cada canal.",
        "temos": [
            "O checklist no caso: site, Instagram, Google, opinião e concorrentes. Maps entra se for loja física.",
            "A proposta não sai enquanto uma frente obrigatória estiver vazia.",
        ],
        "precisa": [
            "Uma pessoa olhando cada canal. Não há robô de varredura.",
            "Perfis públicos ou acesso autorizado. Loja física real para o Maps.",
            "Concorrentes nomeados e um diferencial observado, não um ranking.",
        ],
        "ferramentas": [
            "Navegador, Google e Instagram público.",
            "API de Instagram só com contagem exata de pedidos, em caso pago.",
            "Não comprar ferramenta de concorrente nem de menções.",
        ],
        "investimento": "Horas de coleta. Nenhuma assinatura nova neste ciclo. Automação só depois que 3 leituras pagas mostrarem o que se repete.",
        "estrutura": "Uma evidência utilizável por frente. Fonte indisponível não conta.",
        "criar": [
            "A coleta permanece manual. O checklist que já trava a proposta é a estrutura.",
        ],
        "mobile": "No celular, marcar a frente em campo, com a fonte e o que foi visto. A conferência da proposta fica no PC.",
    },
    "branding": {
        "quando": "depois_da_base",
        "objetivo": "Executar voz e aplicação visual só quando o diagnóstico mostrar que a marca é o gargalo.",
        "temos": [
            "Regra aprovada em 2026-08-04: branding completo só depois do diagnóstico.",
            "O design system do escritório é o da TAVIR, não o do cliente.",
            "Wiki de posicionamento e de intenção de design.",
        ],
        "precisa": [
            "Evidência de que marca, e não presença ou conversa, é a primeira perda.",
            "Nome, voz e uma peça da oferta. Manual longo não entra.",
            "Fotos profissionais, se faltarem, são item e custo à parte do cliente.",
        ],
        "ferramentas": [
            "Escritório e Fábrica.",
            "Nenhum software novo de brand kit.",
        ],
        "investimento": "Horas de uma peça. Sem lançar identidade paralela. A arquitetura é branded house: uma marca-mãe, a TAVIR.",
        "estrutura": "Posição, voz e aplicação na peça que vende.",
        "criar": [
            "Checklist de marca no caso. Fora da base de fim de ano, salvo se a prioridade comprovada for essa.",
        ],
        "mobile": "O celular não desenha a marca. Pode mostrar a peça aprovada.",
    },
    "atendimento_automatizado": {
        "quando": "depois_da_base",
        "objetivo": "Automatizar a primeira resposta depois que o roteiro humano estiver estável e medido.",
        "temos": [
            "A ficha de Atendimento já veta autonomia em área regulada, disparo em massa e canal sem titular.",
            "Não há bot no escritório.",
        ],
        "precisa": [
            "Roteiro provado, volume, humano de fallback, política de privacidade e teste de ponta a ponta.",
            "Canal e templates no nome do cliente.",
        ],
        "ferramentas": [
            "O canal do cliente. Plataforma de bot não se contrata antes do roteiro.",
            "O escritório guarda o roteiro e os casos de teste.",
        ],
        "investimento": "Conta, templates e conversas são do cliente. Horas de piloto da TAVIR. Sem SLA publicável.",
        "estrutura": "Roteiro, casos de teste e passagem para uma pessoa.",
        "criar": [
            "Nada neste ano. O item existe na fila para não sumir, e a venda espera o atendimento humano.",
        ],
        "mobile": "Fora do app. Operação de bot não começa no telefone.",
    },
    "comercio": {
        "quando": "depois_da_base",
        "objetivo": "Implantar pedido e pagamento quando o gargalo já for a compra, não o encontro nem a conversa.",
        "temos": [
            "Ficha da oferta. Um case de construção, sem série comparável de horas.",
            "O degrau cobrável antes da loja é o catálogo com pedido no WhatsApp.",
        ],
        "precisa": [
            "Itens, preço, estoque, frete, troca e um responsável.",
            "Conta de gateway no nome do cliente. A TAVIR não promete aprovação nem venda.",
        ],
        "ferramentas": [
            "Plataforma escolhida no projeto e o gateway do cliente.",
            "Não construir loja própria neste ciclo.",
        ],
        "investimento": "Projeto por módulo, horas ainda sem P80. Contas de terceiro ficam separadas da receita.",
        "estrutura": "Trilha, quantidade de itens, checkout, teste e entrega dos acessos.",
        "criar": [
            "Fora da base de fim de ano. Até lá, o pedido mora no catálogo simples.",
        ],
        "mobile": "Fora do app neste ciclo. Acompanhamento de pedido só depois da loja existir.",
    },
    "crescimento": {
        "quando": "depois_da_base",
        "objetivo": "Cobrar um bloco mensal com um experimento, quando oferta, destino, atendimento e medição já existem.",
        "temos": [
            "Ficha da oferta e a regra de 2026-08-04: marketing só entra como Crescimento com a base pronta.",
            "Sem série de ciclos para publicar capacidade.",
        ],
        "precisa": [
            "Taxa por etapa do funil, verba do cliente e quem aprova a peça.",
            "Destino e atendimento capazes de receber o que o teste trouxer.",
        ],
        "ferramentas": [
            "A conta de anúncio é do cliente.",
            "Uma leitura mensal no escritório basta. Nenhuma ferramenta de mídia nova.",
        ],
        "investimento": "Verba de mídia é do cliente e não é receita. Horas do bloco sem preço publicado.",
        "estrutura": "Uma hipótese, uma métrica, uma janela e a decisão de manter, iterar ou reverter.",
        "criar": [
            "Fora da base. Não vender crescimento sem funil medido.",
        ],
        "mobile": "No celular, depois da base: a métrica do mês e a decisão. A peça e a verba ficam no PC.",
    },
    "conteudo": {
        "quando": "depois_da_primeira_receita",
        "objetivo": "Cobrar uma peça que sustenta a oferta já escolhida.",
        "temos": [
            "O Studio no escritório.",
            "Wiki de conteúdo gratuito. O dossiê editorial do projeto antigo não entra no preço do Raio-X.",
        ],
        "precisa": [
            "Oferta, canal, chamada e aprovação.",
            "Não abrir calendário infinito.",
        ],
        "ferramentas": [
            "Studio. Nenhuma esteira nova de publicação.",
        ],
        "investimento": "Horas de uma peça. Sem ferramenta de agendamento nova.",
        "estrutura": "Uma peça, um canal e uma chamada.",
        "criar": [
            "Produzir no Studio quando houver oferta paga. Sem produto editorial novo.",
        ],
        "mobile": "O celular pode aprovar a peça. A produção fica no PC.",
    },
    "video": {
        "quando": "agora",
        "objetivo": "Cobrar uma quantidade fechada de cortes e Reels quando a dor for edição, não presença.",
        "temos": [
            "O DocuFlow como bancada interna de edição.",
            "A devolutiva do escritório pode apontar este serviço.",
        ],
        "precisa": [
            "Material do cliente e a quantidade combinada.",
            "O cliente não entra na bancada.",
        ],
        "ferramentas": [
            "DocuFlow no PC da TAVIR.",
            "Nenhum login entregue ao cliente.",
        ],
        "investimento": "Horas dos cortes. Sem assinatura nova e sem pacote ouro.",
        "estrutura": "Uma quantidade, um prazo e os arquivos entregues.",
        "criar": [
            "Nada de portal. A oferta seguinte do caso basta.",
        ],
        "mobile": "O celular não edita. Pode receber o arquivo pronto.",
    },
    "proposta": {
        "quando": "agora",
        "objetivo": "Cobrar o envio de uma proposta com link e prazo quando a venda trava no aceite.",
        "temos": [
            "O escopo do aceite eletrônico no projeto anterior.",
            "A devolutiva do escritório pode apontar este serviço.",
        ],
        "precisa": [
            "Texto, preço orçado fora do módulo e uma data de validade.",
            "O comprovante com hash espera o apontamento sair da conta pessoal da Vercel.",
        ],
        "ferramentas": [
            "Um link com prazo, enviado por e-mail.",
            "O aceite com hash não entra neste pacote.",
        ],
        "investimento": "Horas de uma proposta. Sem portal e sem pacote ouro.",
        "estrutura": "Um documento, um endereço e uma data.",
        "criar": [
            "O registro da oferta no caso. A publicação do aceite fica no projeto antigo.",
        ],
        "mobile": "O cliente abre o link. A montagem fica no PC.",
    },
}

CICLO = {
    "janela": "De 26 de outubro de 2026 ao fim do ano.",
    "foco": "Uma leitura que vira proposta e uma implantação que dá para entregar com o que já está de pé.",
    "escritorio": [
        {
            "ordem": 1,
            "titulo": "Estudo rápido e diagnóstico",
            "entrega": "Já abrem no escritório. A meta é uma devolutiva com uma oferta e um passo de 30 dias.",
        },
        {
            "ordem": 2,
            "titulo": "Ficha da oferta na devolutiva",
            "entrega": "Nome, promessa, prova, garantia e o que fica de fora. O preço continua no orçamento, fora do módulo.",
        },
        {
            "ordem": 3,
            "titulo": "Checklist de Presença Local",
            "entrega": "Entrega manual: ficha, dados, fotos e destino. Sem publicação automática.",
        },
        {
            "ordem": 4,
            "titulo": "Página única na Fábrica",
            "entrega": "Só depois da oferta e do destino fechados. Uma URL, um pedido.",
        },
    ],
    "mobile": {
        "estado": "Não há app da TAVIR neste escritório nem um app Flutter da TAVIR na pasta de projetos. Os apps Flutter ao redor são outros produtos.",
        "leva": [
            "Casos abertos, a prioridade e o próximo passo.",
            "Checklist de campo da Presença Local: foto, horário, telefone e WhatsApp.",
            "Frente do deep scan anotada no local, quando essa leitura estiver paga.",
        ],
        "fica_no_pc": [
            "Preço, proposta e envio.",
            "Método do wiki, varredura conferida e construção de página, catálogo ou roteiro.",
            "Gates de aprovação e o banco publicado.",
        ],
    },
}


def catalog_payload() -> dict:
    items = []
    for item in CATALOG:
        plano = PLANOS[item["id"]]
        items.append({**item, "plano": plano})
    return {"infra": INFRA, "ciclo": CICLO, "items": items}


def get_item(item_id: str) -> dict | None:
    return _BY_ID.get(item_id)


def product_name(product_id: str) -> str:
    item = _BY_ID.get(product_id)
    return item["name"] if item else product_id


def required_fronts(deep_scan: bool, physical_store: bool) -> list[dict]:
    if not deep_scan:
        return []
    return [
        item
        for item in SCAN_FRONTS
        if not item["physical_only"] or physical_store
    ]


def method_pages(product_id: str, deep_scan: bool) -> list[dict]:
    paths: list[str] = []
    item = _BY_ID.get(product_id)
    if item:
        paths.extend(item["vault"])
    if deep_scan:
        paths.extend(_BY_ID["deep_scan"]["vault"])
    seen: list[str] = []
    for path in paths:
        if path not in seen:
            seen.append(path)
    pages = []
    for path in seen:
        pages.append({"path": path, "title": _page_title(path)})
    return pages


def read_method(page: str) -> dict:
    if not _PAGE.match(page) or page not in _allowed_pages():
        raise ValueError("Página fora do método do Raio-X.")
    file_path = KNOWLEDGE_ROOT / f"{page}.md"
    if not file_path.is_file():
        raise ValueError("Página do método não encontrada.")
    text = file_path.read_text(encoding="utf-8")
    return {
        "path": page,
        "title": _title_from_text(text, page),
        "definition": _definition(text),
    }


def _allowed_pages() -> set[str]:
    pages: set[str] = set()
    for item in CATALOG:
        pages.update(item["vault"])
    return pages


def _page_title(page: str) -> str:
    file_path = KNOWLEDGE_ROOT / f"{page}.md"
    if not file_path.is_file():
        return page.rsplit("/", 1)[-1].replace("-", " ")
    return _title_from_text(file_path.read_text(encoding="utf-8"), page)


def _title_from_text(text: str, page: str) -> str:
    for line in text.splitlines():
        if line.startswith("title:"):
            return line.split(":", 1)[1].strip().strip('"')
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return page.rsplit("/", 1)[-1].replace("-", " ")


def _definition(text: str) -> str:
    body = text.split("---", 2)[-1] if text.startswith("---") else text
    marker = "## Definição"
    if marker not in body:
        paragraphs = [block.strip() for block in body.split("\n\n") if block.strip() and not block.startswith("#")]
        return paragraphs[0][:900] if paragraphs else ""
    chunk = body.split(marker, 1)[1]
    chunk = chunk.split("\n## ", 1)[0]
    return chunk.strip()[:1200]
