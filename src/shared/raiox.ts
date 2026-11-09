export const RAIOX_STAGES = ['encontrar', 'conversar', 'atender', 'vender', 'medir'] as const;
export type RaioxStage = typeof RAIOX_STAGES[number];
export const RAIOX_STAGE_LABEL: Record<RaioxStage, string> = { encontrar: 'Encontrar', conversar: 'Conversar', atender: 'Atender', vender: 'Vender', medir: 'Medir' };

export const RAIOX_CLASSES = ['observado', 'informado', 'inferido', 'indisponivel'] as const;
export type RaioxClass = typeof RAIOX_CLASSES[number];
export const RAIOX_CLASS_LABEL: Record<RaioxClass, string> = { observado: 'Observado', informado: 'Informado', inferido: 'Inferido', indisponivel: 'Indisponível' };

export const RAIOX_ORIGINS = ['amigo', 'rua', 'formulario', 'indicacao'] as const;
export type RaioxOrigin = typeof RAIOX_ORIGINS[number];

export const RAIOX_MODES = ['estudo_rapido', 'diagnostico', 'completo'] as const;
export type RaioxMode = typeof RAIOX_MODES[number];

export const RAIOX_STATUS = ['fronteira', 'coleta', 'jornada', 'prioridade', 'devolutiva', 'fechado'] as const;
export type RaioxStatus = typeof RAIOX_STATUS[number];
export const RAIOX_STATUS_LABEL: Record<RaioxStatus, string> = { fronteira: 'Fronteira', coleta: 'Coleta', jornada: 'Jornada', prioridade: 'Prioridade', devolutiva: 'Devolutiva', fechado: 'Fechado' };

export const RAIOX_CONFIDENCE = ['alta', 'media', 'baixa'] as const;
export type RaioxConfidence = typeof RAIOX_CONFIDENCE[number];

export const RAIOX_DEPTHS = ['guiado', 'piloto', 'junto', 'para_voce'] as const;
export type RaioxDepth = typeof RAIOX_DEPTHS[number];
export const RAIOX_DEPTH_LABEL: Record<RaioxDepth, string> = { guiado: 'Guiado (o dono faz)', piloto: 'Piloto declarado', junto: 'Fazemos junto', para_voce: 'Fazemos para você' };

export const RAIOX_FRONTS = [
  { id: 'site', label: 'Site próprio', physicalOnly: false },
  { id: 'instagram', label: 'Instagram', physicalOnly: false },
  { id: 'google', label: 'Google', physicalOnly: false },
  { id: 'maps', label: 'Google Maps', physicalOnly: true },
  { id: 'opinioes', label: 'Opinião de cliente', physicalOnly: false },
  { id: 'concorrentes', label: 'Concorrentes e diferenciais', physicalOnly: false },
] as const;

/** Estados do caso no Supabase publicado (enum public.raiox_case_status). */
export const RAIOX_REMOTE_STATUS = ['draft', 'form_1_sent', 'form_1_received', 'form_2_sent', 'form_2_received', 'awaiting_approval', 'analysing', 'review', 'ready', 'sent', 'closed'] as const;
export type RaioxRemoteStatus = typeof RAIOX_REMOTE_STATUS[number];
export const RAIOX_REMOTE_LABEL: Record<RaioxRemoteStatus, string> = {
  draft: 'Rascunho', form_1_sent: 'Convite enviado', form_1_received: 'Formulário 1 recebido',
  form_2_sent: 'Formulário 2 enviado', form_2_received: 'Formulário recebido',
  awaiting_approval: 'Aguardando autorizar análise', analysing: 'Em análise', review: 'Documentos em revisão',
  ready: 'Pronto para entregar', sent: 'Entregue', closed: 'Encerrado',
};

export interface RaioxGap { id: string; label: string; stage: RaioxStage; offerId: string; wave: 1 | 2 | 3 | 4; }
export const RAIOX_GAPS: RaioxGap[] = [
  { id: "google-perfil-fraco", label: "Perfil Google fraco", stage: "encontrar", offerId: "presenca_local", wave: 1 },
  { id: "reputacao-fraca", label: "Reputação fraca", stage: "encontrar", offerId: "presenca_local", wave: 1 },
  { id: "instagram-sem-destino", label: "Instagram sem destino", stage: "encontrar", offerId: "crescimento", wave: 1 },
  { id: "whatsapp-lento", label: "WhatsApp lento", stage: "conversar", offerId: "atendimento", wave: 1 },
  { id: "sem-roteiro-venda", label: "Sem roteiro de venda", stage: "atender", offerId: "atendimento", wave: 2 },
  { id: "orcamento-esquecido", label: "Orçamento esquecido", stage: "atender", offerId: "atendimento", wave: 2 },
  { id: "sem-canal-pedido", label: "Sem canal de pedido", stage: "vender", offerId: "catalogo", wave: 2 },
  { id: "sem-agendamento", label: "Sem agendamento", stage: "atender", offerId: "atendimento", wave: 2 },
  { id: "oferta-confusa", label: "Oferta confusa", stage: "vender", offerId: "criacao_oferta", wave: 3 },
  { id: "ticket-baixo", label: "Ticket médio baixo", stage: "vender", offerId: "criacao_oferta", wave: 3 },
  { id: "sem-cadastro-recompra", label: "Sem cadastro/recompra", stage: "medir", offerId: "crescimento", wave: 3 },
  { id: "nao-mede", label: "Não mede nada", stage: "medir", offerId: "crescimento", wave: 3 },
  { id: "sem-pagina-vendas", label: "Sem página de vendas", stage: "vender", offerId: "pagina_vendas", wave: 4 },
  { id: "invisivel-na-busca", label: "Invisível na busca", stage: "encontrar", offerId: "presenca_local", wave: 4 },
  { id: "conteudo-irregular", label: "Conteúdo irregular", stage: "medir", offerId: "conteudo", wave: 4 },
  { id: "marca-inconsistente", label: "Marca inconsistente", stage: "encontrar", offerId: "branding", wave: 4 },
];

export interface RaioxCatalogDefaults { objective?: string; decisionNeeded?: string; frontier?: string; }
export interface RaioxPlano {
  quando: 'agora' | 'depois_da_primeira_receita' | 'depois_da_base';
  objetivo: string;
  temos: string[];
  precisa: string[];
  ferramentas: string[];
  investimento: string;
  estrutura: string;
  criar: string[];
  mobile: string;
}
export interface RaioxCatalogItem {
  id: string;
  kind: 'modo' | 'entrega' | 'recurso';
  cashRank: number;
  name: string;
  cashWhy: string;
  promise: string;
  includes: string[];
  holds: string[];
  status: string;
  vault: string[];
  defaults: RaioxCatalogDefaults;
  plano: RaioxPlano;
}
export const RAIOX_INFRA = {
  "publicUrl": "https://raiox.tavir.com.br",
  "database": "O banco do produto publicado continua no Supabase. O escritório opera o caso e não troca esse apontamento.",
  "mail": "Resend no domínio tavir.com.br. Convite e entrega seguem com segredo e chave separados.",
  "gates": "Aprovar o conteúdo e autorizar o envio continuam sendo dois atos.",
  "improvements": [
    "Vigiar o plano gratuito do Supabase: projeto pausado tira o subdomínio do ar.",
    "Ler os casos publicados no escritório sem migrar a fonte para o SQLite local.",
    "Não enviar ao cliente o alias técnico da Vercel.",
    "Manter a pasta de deploy e as funções de convite, revisão e entrega como estão."
  ]
} as const;
export const RAIOX_CICLO = {
  "janela": "De 26 de outubro de 2026 ao fim do ano.",
  "foco": "Uma leitura que vira proposta e uma implantação que dá para entregar com o que já está de pé.",
  "escritorio": [
    {
      "ordem": 1,
      "titulo": "Estudo rápido e diagnóstico",
      "entrega": "Já abrem no escritório. A meta é uma devolutiva com uma oferta e um passo de 30 dias."
    },
    {
      "ordem": 2,
      "titulo": "Ficha da oferta na devolutiva",
      "entrega": "Nome, promessa, prova, garantia e o que fica de fora. O preço continua no orçamento, fora do módulo."
    },
    {
      "ordem": 3,
      "titulo": "Checklist de Presença Local",
      "entrega": "Entrega manual: ficha, dados, fotos e destino. Sem publicação automática."
    },
    {
      "ordem": 4,
      "titulo": "Página única na Fábrica",
      "entrega": "Só depois da oferta e do destino fechados. Uma URL, um pedido."
    }
  ],
  "mobile": {
    "estado": "Não há app da TAVIR neste escritório nem um app Flutter da TAVIR na pasta de projetos. Os apps Flutter ao redor são outros produtos.",
    "leva": [
      "Casos abertos, a prioridade e o próximo passo.",
      "Checklist de campo da Presença Local: foto, horário, telefone e WhatsApp.",
      "Frente do deep scan anotada no local, quando essa leitura estiver paga."
    ],
    "ficaNoPc": [
      "Preço, proposta e envio.",
      "Método do wiki, varredura conferida e construção de página, catálogo ou roteiro.",
      "Gates de aprovação e o banco publicado."
    ]
  }
} as const;
export const RAIOX_CATALOG: RaioxCatalogItem[] = [
  {
    "id": "estudo_rapido",
    "kind": "modo",
    "cashRank": 1,
    "name": "Estudo rápido",
    "cashWhy": "Abre caixa nesta semana: uma leitura curta para um conhecido, com preço pequeno e escopo que cabe numa conversa.",
    "promise": "Uma lacuna visível e um próximo passo. Serve para a empresa de um amigo ou para marcar a conversa paga.",
    "includes": [
      "Sinais públicos que o dono reconhece",
      "Uma lacuna na jornada",
      "Decisão de parar ou seguir para o diagnóstico pago"
    ],
    "holds": [
      "Varredura de canais",
      "Mapa de marca",
      "Implantação"
    ],
    "status": "vendavel_agora",
    "vault": [
      "negocios/perguntas-mom-test",
      "negocios/jornada-fisica-cliente-loja",
      "mercados/avaliacoes-google-no-ponto-de-venda"
    ],
    "defaults": {
      "objective": "Ver, numa leitura curta, onde a empresa perde a próxima conversa.",
      "decisionNeeded": "Se vale abrir um diagnóstico pago ou parar por aqui.",
      "frontier": "Sinais públicos e o que o dono confirmar. Sem varredura e sem implantação."
    },
    "plano": {
      "quando": "agora",
      "objetivo": "Cobrar uma leitura curta, ou usá-la para marcar o diagnóstico pago, com um decisor na conversa.",
      "temos": [
        "O caso abre no escritório: fronteira, evidência, uma prioridade e devolutiva.",
        "O wiki já tem Mom Test, jornada de loja e avaliações no ponto de venda.",
        "A porta pública raiox.tavir.com.br existe se a conversa for formalizar."
      ],
      "precisa": [
        "Um texto de uma página para deixar com o dono: a lacuna e o próximo passo.",
        "Preço decidido na hora de orçar. Não há tabela publicada.",
        "O decisor precisa aceitar ouvir e dizer se corrige a primeira lacuna."
      ],
      "ferramentas": [
        "Escritório e navegador, para sinais públicos.",
        "Não contratar varredura, anúncio nem ferramenta de ranking."
      ],
      "investimento": "Horas de uma conversa. Nenhuma assinatura nova. O preço sai no orçamento do caso, não de uma tabela.",
      "estrutura": "Um caso, fronteira curta, uma prioridade, devolutiva que para ou segue para o diagnóstico.",
      "criar": [
        "A folha de uma página já cabe na devolutiva. O texto que se envia é o que falta produzir no caso, sem sistema novo."
      ],
      "mobile": "No celular, depois: empresa, lacuna e próximo passo. A leitura e o preço ficam no PC."
    }
  },
  {
    "id": "diagnostico",
    "kind": "modo",
    "cashRank": 2,
    "name": "Diagnóstico",
    "cashWhy": "É o produto de escopo fixo que já tem subdomínio, banco, convite e entrega. O caixa entra quando a devolutiva vira uma proposta.",
    "promise": "Onde a jornada perde demanda, conversa ou pedido, e qual oferta única vem primeiro.",
    "includes": [
      "Fronteira da coleta",
      "Evidência classificada",
      "Uma prioridade",
      "Devolutiva: proposta de uma oferta ou não emitir"
    ],
    "holds": [
      "Deep scan",
      "Pacote de várias implantações",
      "Construção de página, catálogo ou atendimento"
    ],
    "status": "vendavel_agora",
    "vault": [
      "negocios/pre-mortem",
      "frameworks/framework-mom-test",
      "negocios/distribuicao-vendas"
    ],
    "defaults": {
      "objective": "Descobrir onde a jornada perde demanda, conversa ou pedido.",
      "decisionNeeded": "Qual oferta única contratar primeiro, ou não emitir proposta.",
      "frontier": "Presença pública, relato do dono e acessos autorizados. Uma prioridade."
    },
    "plano": {
      "quando": "agora",
      "objetivo": "Entregar a leitura paga e sair com uma proposta de uma oferta só.",
      "temos": [
        "Produto publicado: formulário, Resend, PDF, aprovação separada do envio e Supabase.",
        "Console do escritório com as mesmas regras de evidência, prioridade e devolutiva.",
        "Ficha da oferta e dois diagnósticos reais no histórico. A amostra ainda não fecha preço nem capacidade."
      ],
      "precisa": [
        "A proposta com valor continua no orçamento. A devolutiva registra a decisão e ainda não é o documento de preço.",
        "O escritório não lê os casos do Supabase. As duas pontas convivem; a fonte publicada não muda.",
        "Capacidade só fica publicável depois de 3 a 5 casos com horas medidas."
      ],
      "ferramentas": [
        "raiox.tavir.com.br, Supabase, Resend no domínio tavir.com.br e o escritório.",
        "A auditoria de Instagram por API só entra em caso pago, com a contagem de pedidos exata."
      ],
      "investimento": "Manter o Supabase acordado: no plano gratuito, projeto pausado tira o subdomínio do ar. Sem ferramenta nova e sem preço publicado.",
      "estrutura": "Intake no site publicado. Operação e devolutiva no escritório. Uma oferta seguinte.",
      "criar": [
        "Nada de banco, domínio ou fila nova. O passo é orçar a oferta que a devolutiva escolheu."
      ],
      "mobile": "No celular, depois: status, data da devolutiva e oferta recomendada. Envio e preço ficam no PC."
    }
  },
  {
    "id": "presenca_local",
    "kind": "entrega",
    "cashRank": 3,
    "name": "Presença Local",
    "cashWhy": "É a implantação que o diagnóstico já apontou em caso real: ser encontrado no Google antes de produzir mais conteúdo.",
    "promise": "Google, dados da loja, fotos e um caminho de contato que funciona.",
    "includes": [
      "Ficha local",
      "Telefone e horário",
      "Fotos do ponto",
      "Caminho até o WhatsApp"
    ],
    "holds": [
      "Diagnóstico novo",
      "Site completo",
      "Anúncio"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "mercados/avaliacoes-google-no-ponto-de-venda",
      "negocios/jornada-fisica-cliente-loja",
      "mercados/criterios-priorizacao-canal-vendas"
    ],
    "defaults": {},
    "plano": {
      "quando": "agora",
      "objetivo": "Entregar a primeira implantação já apontada por caso real: a empresa ser encontrada e o contato funcionar.",
      "temos": [
        "Ficha da oferta, com promessa de ativos entregues e sem promessa de ranking ou leads.",
        "Um diagnóstico real que apontou presença antes de mais conteúdo.",
        "Google Business Profile e WhatsApp são contas do cliente."
      ],
      "precisa": [
        "Checklist de entrega no escritório, ainda manual.",
        "Perfil da empresa no nome do cliente, com horário, telefone, área e fotos.",
        "Alguém do lado do cliente para atender o contato que passar a chegar."
      ],
      "ferramentas": [
        "Perfil da Empresa no Google e WhatsApp, ambos do cliente.",
        "Escritório para o checklist. Nenhuma ferramenta de posição no Google."
      ],
      "investimento": "Horas de implantação. Domínio, fotos e verificação são custo do cliente, separados da receita. A capacidade ainda não é publicável; estima-se pela lista de ativos.",
      "estrutura": "Um conjunto nomeado de ativos, revisão e entrega dos acessos ao titular.",
      "criar": [
        "O checklist de presença dentro do caso: ficha, dados consistentes, fotos, destino do contato. Publicação automática fica de fora."
      ],
      "mobile": "No celular, em campo: foto da fachada, horário, telefone e link do WhatsApp. Texto e publicação ficam no PC."
    }
  },
  {
    "id": "atendimento",
    "kind": "entrega",
    "cashRank": 4,
    "name": "Atendimento",
    "cashWhy": "Recorrência. Entra quando a conversa esfria antes do pedido e o dono aceita mudar a resposta.",
    "promise": "Quem chama recebe resposta, qualificação e um próximo passo.",
    "includes": [
      "Roteiro de resposta",
      "Qualificação",
      "Encaminhamento do pedido"
    ],
    "holds": [
      "Robô no lugar do atendimento ainda não medido",
      "Catálogo",
      "Marca"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "psicologia/prova-social",
      "copywriting/alcance-quente"
    ],
    "defaults": {},
    "plano": {
      "quando": "agora",
      "objetivo": "Cobrar o roteiro e a operação humana quando a conversa esfria antes do pedido.",
      "temos": [
        "Ficha da oferta e o escritório já consegue apontar Atendimento como a oferta seguinte.",
        "Envelope interno de horas, de 2026-07-05: 15 a 25 h no starter e 4 a 9 h por mês. Isso não é preço, SLA nem margem."
      ],
      "precisa": [
        "Volume, dono do processo e uma pessoa de fallback.",
        "Canal no nome do cliente. O teste de ponta a ponta ainda limita vender autonomia."
      ],
      "ferramentas": [
        "WhatsApp do cliente e o roteiro guardado no caso.",
        "Não abrir conta de API da Meta nem bot neste ciclo."
      ],
      "investimento": "Horas de roteiro e de operação. A conta do canal é do cliente. O envelope de horas não vira tabela.",
      "estrutura": "Roteiro, o que a resposta pode e não pode dizer, e um humano quando o caso sai do roteiro.",
      "criar": [
        "O roteiro no próprio caso. A automação é outro item e não entra na base de fim de ano."
      ],
      "mobile": "No celular, o operador vê o que responder e responde. O robô não nasce no telefone."
    }
  },
  {
    "id": "pagina_vendas",
    "kind": "entrega",
    "cashRank": 5,
    "name": "Página de vendas",
    "cashWhy": "Projeto fechado com uma oferta e um destino. Só depois que a prioridade for venda, não presença.",
    "promise": "Uma página, uma oferta, um pedido.",
    "includes": [
      "Promessa",
      "Prova",
      "Preço",
      "Chamada para o pedido"
    ],
    "holds": [
      "Site institucional inteiro",
      "Várias ofertas na mesma página"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "copywriting/valor-equation",
      "copywriting/nomenclatura-oferta",
      "frameworks/framework-100m-offers"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "Cobrar uma página permanente com uma oferta e um destino de pedido.",
      "temos": [
        "A Fábrica no escritório já tem trilha de oferta, promessa e preço.",
        "O wiki tem equação de valor e nomenclatura de oferta.",
        "Na arquitetura da marca, página é componente, não uma segunda marca."
      ],
      "precisa": [
        "Oferta nomeada, prova, preço orçado e um destino: WhatsApp ou pedido.",
        "Texto e imagens aprovados pelo cliente."
      ],
      "ferramentas": [
        "Fábrica. Hospedagem que o portfólio já usa, só com cliente pagante.",
        "Domínio do cliente. Nenhum construtor novo."
      ],
      "investimento": "Horas de uma página. Domínio e fotos são do cliente. Mídia paga não entra neste item.",
      "estrutura": "Uma URL, uma promessa, uma prova, um preço e um destino.",
      "criar": [
        "A página na Fábrica, puxada da oferta do caso. Sem gerador solto no Raio-X."
      ],
      "mobile": "O celular não constrói a página. Pode guardar o link publicado e o destino do pedido."
    }
  },
  {
    "id": "landing",
    "kind": "entrega",
    "cashRank": 6,
    "name": "Landing page",
    "cashWhy": "Peça de campanha com começo e fim. Cobra à parte da página de vendas permanente.",
    "promise": "Uma página para uma campanha ou uma oferta datada.",
    "includes": [
      "Uma promessa",
      "Uma prova",
      "Um prazo",
      "Um destino"
    ],
    "holds": [
      "Marca completa",
      "Catálogo"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "copywriting/valor-equation",
      "psicologia/escassez",
      "copywriting/garantias-reversao-risco"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "Cobrar uma página de campanha, com prazo, separada da página permanente.",
      "temos": [
        "A mesma Fábrica e o wiki de escassez e garantia.",
        "A diferença para a página de vendas é o prazo e o fim da campanha."
      ],
      "precisa": [
        "Uma oferta datada, uma prova e a data em que a página sai do ar ou perde o bônus."
      ],
      "ferramentas": [
        "Fábrica e o domínio ou caminho do cliente.",
        "Nenhuma ferramenta de anúncio neste item."
      ],
      "investimento": "Horas de uma página com data. A verba de mídia, se existir, é do cliente e não entra nesta cobrança.",
      "estrutura": "Uma promessa, uma prova, um prazo e um destino.",
      "criar": [
        "A mesma trilha da página de vendas, com campo de prazo. Sem produto novo."
      ],
      "mobile": "O celular guarda o link e a data de fim. A página se faz no PC."
    }
  },
  {
    "id": "criacao_oferta",
    "kind": "entrega",
    "cashRank": 7,
    "name": "Criação de oferta",
    "cashWhy": "Empacota o que o diagnóstico achou numa oferta que dá para cobrar. O método vem do wiki compilado, não do texto integral dos livros.",
    "promise": "Nome, promessa, prova, garantia e preço de uma oferta.",
    "includes": [
      "Equação de valor",
      "O que entra e o que sai",
      "Garantia",
      "Nome"
    ],
    "holds": [
      "Página",
      "Anúncio",
      "Atendimento"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "frameworks/framework-100m-offers",
      "copywriting/trim-and-stack",
      "copywriting/valor-equation",
      "negocios/grand-slam-offer"
    ],
    "defaults": {},
    "plano": {
      "quando": "agora",
      "objetivo": "Fechar uma oferta cobrável antes de construir página, catálogo ou anúncio.",
      "temos": [
        "Wiki compilado de oferta, equação de valor, o que entra e o que sai, e preço premium.",
        "A devolutiva já escolhe uma oferta seguinte.",
        "A Fábrica tem estágio de viabilidade e preço."
      ],
      "precisa": [
        "O dono decide o que entra e o que fica de fora.",
        "Uma prova real, não um depoimento inventado.",
        "O preço sai no orçamento do caso."
      ],
      "ferramentas": [
        "Wiki e o caso no escritório.",
        "Nenhuma planilha ou software de precificação novo."
      ],
      "investimento": "Horas de uma sessão. Sem assinatura. O número do preço não está publicado e não entra no módulo.",
      "estrutura": "Uma ficha: nome, promessa, prova, garantia, preço e o que ficou de fora.",
      "criar": [
        "A ficha nasce na devolutiva do caso. É o papel que autoriza a segunda cobrança."
      ],
      "mobile": "O celular mostra o nome da oferta e o próximo passo. Promessa, prova e preço ficam no PC."
    }
  },
  {
    "id": "catalogo",
    "kind": "entrega",
    "cashRank": 8,
    "name": "Catálogo",
    "cashWhy": "Vende quando o pedido trava porque o cliente não vê o que comprar.",
    "promise": "O que se vende, com preço e caminho de pedido, num lugar só.",
    "includes": [
      "Itens",
      "Preço",
      "Pedido"
    ],
    "holds": [
      "Marca",
      "Tráfego",
      "Atendimento automatizado"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "mercados/historia-de-vendas",
      "copywriting/nomenclatura-oferta"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "O cliente ver o que se vende, o preço e como pede, sem abrir uma loja.",
      "temos": [
        "A ficha de Comércio Digital descreve o projeto maior. Não há catálogo publicado da TAVIR.",
        "O WhatsApp do cliente já serve de destino de pedido."
      ],
      "precisa": [
        "Lista de itens com preço, quem atualiza e o caminho do pedido.",
        "Checkout, estoque e frete ficam no Comércio Digital, fora desta base."
      ],
      "ferramentas": [
        "Lista no caso e uma página ou mensagem com os itens.",
        "Nenhum gateway neste ciclo."
      ],
      "investimento": "Horas da lista. Meio de pagamento, se um dia entrar, é conta e custo do cliente.",
      "estrutura": "Itens, preço e um destino. Quem mantém a lista fica nomeado.",
      "criar": [
        "A lista de itens no caso, exportável para a página ou para o WhatsApp. A loja não se constrói agora."
      ],
      "mobile": "No celular, consultar item e preço e mandar o pedido no WhatsApp. Cadastro e alteração ficam no PC."
    }
  },
  {
    "id": "completo",
    "kind": "modo",
    "cashRank": 9,
    "name": "Leitura completa",
    "cashWhy": "Ticket maior. Pauta venda, posição e marca. Só abre quando o dono já aceita agir sobre a primeira prioridade.",
    "promise": "O que a empresa precisa ajustar em venda, posicionamento e marca, e qual implantação vem primeiro.",
    "includes": [
      "Mapa de vendas",
      "Posicionamento",
      "Leitura de marca",
      "Uma oferta seguinte, não o pacote inteiro"
    ],
    "holds": [
      "Executar página, catálogo e atendimento dentro da mesma leitura",
      "Nota mágica de maturidade"
    ],
    "status": "vendavel_com_escopo",
    "vault": [
      "frameworks/framework-posicionamento-dunford",
      "mercados/cinco-componentes-posicionamento",
      "mercados/alternativas-competitivas",
      "negocios/preco-premium"
    ],
    "defaults": {
      "objective": "Pautar vendas, posicionamento e marca, e indicar a primeira implantação.",
      "decisionNeeded": "O que muda primeiro, e qual oferta única executar.",
      "frontier": "Venda, posição e marca. A implantação fica na oferta seguinte."
    },
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "Cobrar a leitura maior, de venda, posição e marca, e ainda assim indicar uma implantação só.",
      "temos": [
        "O modo já abre no escritório, com fronteira própria.",
        "O wiki de posicionamento Dunford e de preço premium.",
        "A regra da marca: mais de um gargalo não vira pacote. O Raio-X ordena."
      ],
      "precisa": [
        "O dono já disposto a agir sobre a primeira prioridade.",
        "Mais tempo de coleta e acessos autorizados.",
        "Preço maior só depois de orçar. Não há série de horas."
      ],
      "ferramentas": [
        "As mesmas do diagnóstico e o wiki.",
        "Nenhuma ferramenta de marca ou de varredura automática."
      ],
      "investimento": "Mais horas que o diagnóstico. Sem assinatura nova. O preço não está publicado.",
      "estrutura": "O mesmo caso, fronteira maior, uma prioridade e uma oferta seguinte.",
      "criar": [
        "Nada além do modo que já existe. A devolutiva cita venda, posição e marca e escolhe um passo."
      ],
      "mobile": "O celular mostra a prioridade e a oferta. O mapa de marca fica no PC."
    }
  },
  {
    "id": "deep_scan",
    "kind": "recurso",
    "cashRank": 10,
    "name": "Deep scan",
    "cashWhy": "Entra só dentro da leitura completa. A varredura aumenta o preço da coleta; não substitui a proposta.",
    "promise": "Varredura dos canais, da opinião e de quem concorre, com diferencial apontado.",
    "includes": [
      "Site",
      "Instagram",
      "Google",
      "Google Maps quando houver loja física",
      "Opinião de cliente",
      "Quem são os concorrentes e o que os diferencia"
    ],
    "holds": [
      "Disparo automático para o prospect",
      "Varredura sem alguém conferir antes da devolutiva"
    ],
    "status": "dentro_da_leitura_completa",
    "vault": [
      "mercados/alternativas-competitivas",
      "mercados/avaliacoes-google-no-ponto-de-venda",
      "psicologia/prova-social"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "Cobrar a coleta larga dentro da leitura completa, com alguém conferindo cada canal.",
      "temos": [
        "O checklist no caso: site, Instagram, Google, opinião e concorrentes. Maps entra se for loja física.",
        "A proposta não sai enquanto uma frente obrigatória estiver vazia."
      ],
      "precisa": [
        "Uma pessoa olhando cada canal. Não há robô de varredura.",
        "Perfis públicos ou acesso autorizado. Loja física real para o Maps.",
        "Concorrentes nomeados e um diferencial observado, não um ranking."
      ],
      "ferramentas": [
        "Navegador, Google e Instagram público.",
        "API de Instagram só com contagem exata de pedidos, em caso pago.",
        "Não comprar ferramenta de concorrente nem de menções."
      ],
      "investimento": "Horas de coleta. Nenhuma assinatura nova neste ciclo. Automação só depois que 3 leituras pagas mostrarem o que se repete.",
      "estrutura": "Uma evidência utilizável por frente. Fonte indisponível não conta.",
      "criar": [
        "A coleta permanece manual. O checklist que já trava a proposta é a estrutura."
      ],
      "mobile": "No celular, marcar a frente em campo, com a fonte e o que foi visto. A conferência da proposta fica no PC."
    }
  },
  {
    "id": "branding",
    "kind": "entrega",
    "cashRank": 11,
    "name": "Branding",
    "cashWhy": "Implantação de marca. A leitura completa pode apontar a marca; a execução só se vende se a prioridade for essa.",
    "promise": "Nome, voz e sistema visual suficientes para a oferta que já foi escolhida.",
    "includes": [
      "Posição",
      "Voz",
      "Aplicação na peça que vende"
    ],
    "holds": [
      "Manual infinito",
      "Campanha",
      "Site"
    ],
    "status": "vender_se_a_prioridade_for_marca",
    "vault": [
      "mercados/posicionamento-como-contexto",
      "mercados/estilos-de-posicionamento",
      "design/dials-de-intencao-design"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_base",
      "objetivo": "Executar voz e aplicação visual só quando o diagnóstico mostrar que a marca é o gargalo.",
      "temos": [
        "Regra aprovada em 2026-08-04: branding completo só depois do diagnóstico.",
        "O design system do escritório é o da TAVIR, não o do cliente.",
        "Wiki de posicionamento e de intenção de design."
      ],
      "precisa": [
        "Evidência de que marca, e não presença ou conversa, é a primeira perda.",
        "Nome, voz e uma peça da oferta. Manual longo não entra.",
        "Fotos profissionais, se faltarem, são item e custo à parte do cliente."
      ],
      "ferramentas": [
        "Escritório e Fábrica.",
        "Nenhum software novo de brand kit."
      ],
      "investimento": "Horas de uma peça. Sem lançar identidade paralela. A arquitetura é branded house: uma marca-mãe, a TAVIR.",
      "estrutura": "Posição, voz e aplicação na peça que vende.",
      "criar": [
        "Checklist de marca no caso. Fora da base de fim de ano, salvo se a prioridade comprovada for essa."
      ],
      "mobile": "O celular não desenha a marca. Pode mostrar a peça aprovada."
    }
  },
  {
    "id": "atendimento_automatizado",
    "kind": "entrega",
    "cashRank": 12,
    "name": "Atendimento automatizado",
    "cashWhy": "Vem depois que o atendimento humano mostrou volume e roteiro. Automatizar antes disso cobra retrabalho.",
    "promise": "A primeira resposta e a qualificação seguem o roteiro já provado.",
    "includes": [
      "Roteiro estável",
      "Primeira resposta",
      "Passagem para uma pessoa quando o caso sai do roteiro"
    ],
    "holds": [
      "Substituir o dono sem roteiro",
      "Catálogo",
      "Anúncio"
    ],
    "status": "vender_depois_do_atendimento",
    "vault": [
      "frameworks/hook-model",
      "psicologia/fogg-behavior-model"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_base",
      "objetivo": "Automatizar a primeira resposta depois que o roteiro humano estiver estável e medido.",
      "temos": [
        "A ficha de Atendimento já veta autonomia em área regulada, disparo em massa e canal sem titular.",
        "Não há bot no escritório."
      ],
      "precisa": [
        "Roteiro provado, volume, humano de fallback, política de privacidade e teste de ponta a ponta.",
        "Canal e templates no nome do cliente."
      ],
      "ferramentas": [
        "O canal do cliente. Plataforma de bot não se contrata antes do roteiro.",
        "O escritório guarda o roteiro e os casos de teste."
      ],
      "investimento": "Conta, templates e conversas são do cliente. Horas de piloto da TAVIR. Sem SLA publicável.",
      "estrutura": "Roteiro, casos de teste e passagem para uma pessoa.",
      "criar": [
        "Nada neste ano. O item existe na fila para não sumir, e a venda espera o atendimento humano."
      ],
      "mobile": "Fora do app. Operação de bot não começa no telefone."
    }
  },
  {
    "id": "comercio",
    "kind": "entrega",
    "cashRank": 13,
    "name": "Comércio digital",
    "cashWhy": "Checkout e pedido. Só quando o gargalo já é a compra, não o encontro nem a conversa.",
    "promise": "O cliente escolhe e pede sem depender de uma conversa para cada item.",
    "includes": [
      "Pedido",
      "Preço",
      "Confirmação"
    ],
    "holds": [
      "Marca",
      "Tráfego frio"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "negocios/jornada-compra-ideal",
      "copywriting/valor-equation"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_base",
      "objetivo": "Implantar pedido e pagamento quando o gargalo já for a compra, não o encontro nem a conversa.",
      "temos": [
        "Ficha da oferta. Um case de construção, sem série comparável de horas.",
        "O degrau cobrável antes da loja é o catálogo com pedido no WhatsApp."
      ],
      "precisa": [
        "Itens, preço, estoque, frete, troca e um responsável.",
        "Conta de gateway no nome do cliente. A TAVIR não promete aprovação nem venda."
      ],
      "ferramentas": [
        "Plataforma escolhida no projeto e o gateway do cliente.",
        "Não construir loja própria neste ciclo."
      ],
      "investimento": "Projeto por módulo, horas ainda sem P80. Contas de terceiro ficam separadas da receita.",
      "estrutura": "Trilha, quantidade de itens, checkout, teste e entrega dos acessos.",
      "criar": [
        "Fora da base de fim de ano. Até lá, o pedido mora no catálogo simples."
      ],
      "mobile": "Fora do app neste ciclo. Acompanhamento de pedido só depois da loja existir."
    }
  },
  {
    "id": "crescimento",
    "kind": "entrega",
    "cashRank": 14,
    "name": "Crescimento",
    "cashWhy": "Retainer. Só com funil já medido. Antes disso é promessa sem base.",
    "promise": "Acompanhar o funil que já existe e ajustar o que a medição mostrar.",
    "includes": [
      "Medição",
      "Ajuste de uma etapa",
      "Revisão do período"
    ],
    "holds": [
      "Diagnóstico inicial",
      "Página do zero"
    ],
    "status": "vender_com_base_medida",
    "vault": [
      "frameworks/core-four",
      "frameworks/framework-100m-leads"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_base",
      "objetivo": "Cobrar um bloco mensal com um experimento, quando oferta, destino, atendimento e medição já existem.",
      "temos": [
        "Ficha da oferta e a regra de 2026-08-04: marketing só entra como Crescimento com a base pronta.",
        "Sem série de ciclos para publicar capacidade."
      ],
      "precisa": [
        "Taxa por etapa do funil, verba do cliente e quem aprova a peça.",
        "Destino e atendimento capazes de receber o que o teste trouxer."
      ],
      "ferramentas": [
        "A conta de anúncio é do cliente.",
        "Uma leitura mensal no escritório basta. Nenhuma ferramenta de mídia nova."
      ],
      "investimento": "Verba de mídia é do cliente e não é receita. Horas do bloco sem preço publicado.",
      "estrutura": "Uma hipótese, uma métrica, uma janela e a decisão de manter, iterar ou reverter.",
      "criar": [
        "Fora da base. Não vender crescimento sem funil medido."
      ],
      "mobile": "No celular, depois da base: a métrica do mês e a decisão. A peça e a verba ficam no PC."
    }
  },
  {
    "id": "conteudo",
    "kind": "entrega",
    "cashRank": 15,
    "name": "Conteúdo",
    "cashWhy": "Peça editorial depois da prioridade. Não entra no preço da leitura.",
    "promise": "Uma peça que sustenta a oferta já escolhida.",
    "includes": [
      "Uma peça",
      "Um canal",
      "Uma chamada"
    ],
    "holds": [
      "Calendário infinito",
      "Diagnóstico"
    ],
    "status": "entrega_posterior",
    "vault": [
      "copywriting/conteudo-gratuito",
      "negocios/agencia-como-professor"
    ],
    "defaults": {},
    "plano": {
      "quando": "depois_da_primeira_receita",
      "objetivo": "Cobrar uma peça que sustenta a oferta já escolhida.",
      "temos": [
        "O Studio no escritório.",
        "Wiki de conteúdo gratuito. O dossiê editorial do projeto antigo não entra no preço do Raio-X."
      ],
      "precisa": [
        "Oferta, canal, chamada e aprovação.",
        "Não abrir calendário infinito."
      ],
      "ferramentas": [
        "Studio. Nenhuma esteira nova de publicação."
      ],
      "investimento": "Horas de uma peça. Sem ferramenta de agendamento nova.",
      "estrutura": "Uma peça, um canal e uma chamada.",
      "criar": [
        "Produzir no Studio quando houver oferta paga. Sem produto editorial novo."
      ],
      "mobile": "O celular pode aprovar a peça. A produção fica no PC."
    }
  },
  {
    "id": "video",
    "kind": "entrega",
    "cashRank": 16,
    "name": "Vídeo e Reels",
    "cashWhy": "Serviço de cortes numa quantidade fechada. A bancada produz. O cliente não recebe acesso à ferramenta.",
    "promise": "Os vídeos combinados, prontos para publicar.",
    "includes": [
      "Quantidade fechada",
      "Cortes a partir do material do cliente"
    ],
    "holds": [
      "Login do DocuFlow",
      "Calendário de postagem",
      "Pacote ouro"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "copywriting/conteudo-gratuito"
    ],
    "defaults": {},
    "plano": {
      "quando": "agora",
      "objetivo": "Cobrar uma quantidade fechada de cortes e Reels quando a dor for edição, não presença.",
      "temos": [
        "O DocuFlow como bancada interna de edição.",
        "A devolutiva do escritório pode apontar este serviço."
      ],
      "precisa": [
        "Material do cliente e a quantidade combinada.",
        "O cliente não entra na bancada."
      ],
      "ferramentas": [
        "DocuFlow no PC da TAVIR.",
        "Nenhum login entregue ao cliente."
      ],
      "investimento": "Horas dos cortes. Sem assinatura nova e sem pacote ouro.",
      "estrutura": "Uma quantidade, um prazo e os arquivos entregues.",
      "criar": [
        "Nada de portal. A oferta seguinte do caso basta."
      ],
      "mobile": "O celular não edita. Pode receber o arquivo pronto."
    }
  },
  {
    "id": "proposta",
    "kind": "entrega",
    "cashRank": 17,
    "name": "Proposta com link",
    "cashWhy": "Um link com prazo para o cliente ler e aceitar. O comprovante com hash continua fora até o apontamento sair da conta pessoal.",
    "promise": "Uma proposta com endereço e data de validade.",
    "includes": [
      "Texto da proposta",
      "Link",
      "Prazo"
    ],
    "holds": [
      "Aceite com hash",
      "Portal de módulos",
      "Pacote ouro"
    ],
    "status": "vender_depois_da_devolutiva",
    "vault": [
      "copywriting/valor-equation",
      "mercados/historia-de-vendas"
    ],
    "defaults": {},
    "plano": {
      "quando": "agora",
      "objetivo": "Cobrar o envio de uma proposta com link e prazo quando a venda trava no aceite.",
      "temos": [
        "O escopo do aceite eletrônico no projeto anterior.",
        "A devolutiva do escritório pode apontar este serviço."
      ],
      "precisa": [
        "Texto, preço orçado fora do módulo e uma data de validade.",
        "O comprovante com hash espera o apontamento sair da conta pessoal da Vercel."
      ],
      "ferramentas": [
        "Um link com prazo, enviado por e-mail.",
        "O aceite com hash não entra neste pacote."
      ],
      "investimento": "Horas de uma proposta. Sem portal e sem pacote ouro.",
      "estrutura": "Um documento, um endereço e uma data.",
      "criar": [
        "O registro da oferta no caso. A publicação do aceite fica no projeto antigo."
      ],
      "mobile": "O cliente abre o link. A montagem fica no PC."
    }
  }
];
export const RAIOX_SELL_OFFERS = RAIOX_CATALOG.filter(i => i.kind === 'entrega').map(i => i.id);

export interface RaioxArtifact { file: string; sha256: string; url?: string; collectedAt: string; }
export interface RaioxEvidence {
  id: string; stage: RaioxStage; source: string; claim: string; classification: RaioxClass;
  front?: string; note?: string; gapIds: string[]; artifact?: RaioxArtifact;
  author: 'carlos' | 'dora'; review: 'pendente' | 'aprovada' | 'rejeitada'; createdAt: string;
}
export interface RaioxHypothesis { id: string; gapId: string; text: string; evidenceIds: string[]; createdAt: string; }
export interface RaioxPriority { stage: RaioxStage; gapId: string; bottleneck: string; rationale: string; confidence: RaioxConfidence; discarded?: string; decidedAt: string; }
export interface RaioxDocument { kind: 'relatorio' | 'plano'; version: number; md: string; pdf?: string; sha256: string; lint: string[]; createdAt: string; }
export interface RaioxDebrief {
  decision: 'proposta_emitida' | 'nao_emitir'; reason: string;
  offerId?: string; depth?: RaioxDepth; plan30?: string; plan60?: string; plan90?: string;
  documents?: RaioxDocument[];
  approval?: { hashes: string[]; at: string };
  delivery?: { channel: 'manual' | 'resend'; to: string; at: string; note?: string };
}
export interface RaioxMetric { key: string; label: string; value: number; unit: string; at: string; moment: 'd0' | 'd30'; source: string; }
export interface RaioxStepCheck { step: number; doneAt: string; proof: { kind: 'arquivo' | 'link' | 'nota'; value: string; sha256?: string }; }
export interface RaioxExecution { gapId: string; playbookVersion: string; startedAt: string; steps: RaioxStepCheck[]; metrics: RaioxMetric[]; fabricaProjectId?: string; closedAt?: string; }
export interface RaioxRemote { supabaseId: string; status: RaioxRemoteStatus; syncedAt: string; formUrl?: string; }
export interface RaioxCase {
  id: string; uuid: string; legacy: boolean;
  company: string; contact?: string; objective: string; decisionNeeded: string; frontier?: string;
  mode: RaioxMode; deepScan: boolean; physicalStore: boolean; origin: RaioxOrigin;
  segment?: string; publicLink?: string;
  status: RaioxStatus; evidence: RaioxEvidence[]; hypotheses: RaioxHypothesis[];
  priority?: RaioxPriority; debrief?: RaioxDebrief; execution?: RaioxExecution; remote?: RaioxRemote;
  consent?: { kind: 'termo_assinado' | 'verbal_registrado' | 'interno' | 'formulario'; at: string; note: string };
  createdAt: string; updatedAt: string; closedAt?: string;
}
