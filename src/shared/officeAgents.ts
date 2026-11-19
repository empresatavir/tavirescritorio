/**
 * Catálogo dos agentes que o APK chama pelo "Chamar agente".
 * É a lista que o Escritório publica (nome, papel e opções prontas) e a que a fila aceita.
 * `scope` aponta o escopo canônico em agentes/escopo/agentes/; sem ele, vale só o `brief`.
 */

export interface OfficeAgentAction {
  id: string;
  /** Texto do botão no app. */
  label: string;
  /** O que o Carlos precisa informar (vira o placeholder do campo). */
  hint: string;
}

export interface OfficeAgent {
  name: string;
  /** Uma linha, para a lista do app. */
  role: string;
  /** Como o agente trabalha (vai no pedido). */
  brief: string;
  scope?: string;
  actions: OfficeAgentAction[];
}

export const TRIAGE = 'triagem';
export const IRIS = 'Íris Instagram';
export const ACTION_VIDEO = 'video';

export const OFFICE_AGENTS: OfficeAgent[] = [
  {
    name: IRIS,
    role: 'Analista de Instagram: perfis, conteúdo e vídeos',
    brief: 'Você analisa Instagram com dados coletados pela RapidAPI e entrega diagnóstico verificável, sem publicar nem interagir com o perfil.',
    scope: 'iris-instagram.md',
    actions: [
      { id: ACTION_VIDEO, label: 'Analisar vídeo por link', hint: 'Cole o link do Reel ou do post' },
      { id: 'perfil', label: 'Analisar perfil', hint: 'Informe o @ ou o link do perfil' },
      { id: 'texto', label: 'Extrair texto de um post', hint: 'Cole o link do post' },
    ],
  },
  {
    name: 'Maicon',
    role: 'Arquiteto de integrações: avalia ferramentas antes de adotar',
    brief: 'Você avalia ferramentas de terceiros e entrega um parecer: absorver por inteiro, em parte, só o conceito ou rejeitar.',
    scope: 'maicon.md',
    actions: [
      { id: 'ferramenta', label: 'Avaliar ferramenta', hint: 'Cole o link do repositório ou do site' },
      { id: 'ferramenta-video', label: 'Avaliar ferramenta mostrada em vídeo', hint: 'Cole o link do vídeo' },
    ],
  },
  {
    name: 'Atlas Web',
    role: 'Analista de sites, portais e plataformas',
    brief: 'Você transforma uma URL e um objetivo em diagnóstico verificável e plano priorizado.',
    scope: 'analista-web.md',
    actions: [
      { id: 'site', label: 'Analisar site', hint: 'Cole a URL e diga o objetivo' },
      { id: 'concorrente', label: 'Comparar com concorrente', hint: 'Cole as duas URLs' },
    ],
  },
  {
    name: 'Dora Descoberta',
    role: 'Levantamento de requisitos de um projeto novo',
    brief: 'Você transforma uma demanda crua em requisitos claros. Sem entrevista ao vivo: entregue o que já dá para afirmar e a lista de perguntas que faltam.',
    scope: 'dora-descoberta.md',
    actions: [{ id: 'requisitos', label: 'Levantar requisitos', hint: 'Descreva a demanda do cliente' }],
  },
  {
    name: 'Yuri UX',
    role: 'UX e prova visual',
    brief: 'Você audita usabilidade e descreve a mudança visual tela a tela, com o motivo de cada uma.',
    scope: 'yuri-ux.md',
    actions: [
      { id: 'usabilidade', label: 'Auditar usabilidade', hint: 'Informe a tela ou a URL' },
      { id: 'prova', label: 'Propor prova visual', hint: 'Descreva o projeto' },
    ],
  },
  {
    name: 'Lia Loja',
    role: 'Especialista em e-commerce',
    brief: 'Você analisa lojas virtuais com foco em confiança, conversão e falhas de pagamento.',
    scope: 'lia-loja.md',
    actions: [{ id: 'loja', label: 'Analisar loja', hint: 'Cole a URL da loja' }],
  },
  {
    name: 'CTO',
    role: 'Stack, infraestrutura e viabilidade técnica',
    brief: 'Você decide stack e viabilidade, com o motivo e o risco de cada escolha.',
    scope: 'cto.md',
    actions: [{ id: 'viabilidade', label: 'Avaliar viabilidade', hint: 'Descreva o que se quer construir' }],
  },
  {
    name: 'Rafa Construtor',
    role: 'Desenvolvedor Next.js e React',
    brief: 'Você implementa produto web em Next.js e React a partir de uma spec aprovada.',
    scope: 'rafa-construtor-react.md',
    actions: [{ id: 'implementar', label: 'Implementar tela ou ajuste', hint: 'Descreva o que construir e onde' }],
  },
  {
    name: 'Paula PM',
    role: 'Gerente de produto: transforma pedido em trabalho priorizado',
    brief: 'Você separa o que é desta versão do que fica fora e dá a cada item um critério de pronto conferível. Não implementa.',
    actions: [{ id: 'priorizar', label: 'Priorizar um pedido', hint: 'Descreva o pedido' }],
  },
  {
    name: 'Analista',
    role: 'Diagnóstico com números e recomendações',
    brief: 'Você analisa a situação ou os dados indicados e entrega um diagnóstico com números, causas prováveis e recomendações priorizadas.',
    actions: [{ id: 'diagnostico', label: 'Fazer diagnóstico', hint: 'Diga o que analisar e onde estão os dados' }],
  },
  {
    name: 'Revisor',
    role: 'Revisão de texto, documento ou código',
    brief: 'Você revisa o material indicado (texto, documento ou código), aponta problemas concretos e propõe a versão corrigida.',
    actions: [{ id: 'revisar', label: 'Revisar material', hint: 'Cole o texto ou diga o arquivo' }],
  },
  {
    name: 'Redator',
    role: 'Texto pronto para usar',
    brief: 'Você escreve o texto pedido, claro e pronto para usar, em português do Brasil.',
    actions: [{ id: 'escrever', label: 'Escrever texto', hint: 'Diga o tema, o formato e o público' }],
  },
  {
    name: 'Pesquisador',
    role: 'Pesquisa em fontes públicas, com link',
    brief: 'Você pesquisa o assunto em fontes públicas, cita cada fonte com link e separa fato de opinião.',
    actions: [{ id: 'pesquisar', label: 'Pesquisar assunto', hint: 'Diga o assunto e o que quer saber' }],
  },
  {
    name: 'Social',
    role: 'Redes sociais: pautas, legendas e calendário',
    brief: 'Você cuida de redes sociais: analisa perfis, propõe pautas, legendas e calendário.',
    actions: [
      { id: 'pautas', label: 'Propor pautas', hint: 'Diga o perfil e o período' },
      { id: 'legenda', label: 'Escrever legenda', hint: 'Descreva o post' },
    ],
  },
];

export function officeAgent(name: string | null | undefined): OfficeAgent | null {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return null;
  return OFFICE_AGENTS.find((a) => a.name.toLowerCase() === wanted) || null;
}

export function officeAction(agent: OfficeAgent | null, id: string | null | undefined): OfficeAgentAction | null {
  const wanted = String(id || '').trim().toLowerCase();
  if (!agent || !wanted) return null;
  return agent.actions.find((a) => a.id === wanted || a.label.toLowerCase() === wanted) || null;
}

export function isTriage(name: string | null | undefined): boolean {
  return /^(triagem|n[ãa]o sei quem chamar)$/i.test(String(name || '').trim());
}

/** O que o Escritório publica para o app montar a tela de Chamar agente. */
export function publishedAgents(model: string): Array<{ name: string; model: string; role: string; actions: OfficeAgentAction[] }> {
  return OFFICE_AGENTS.map((a) => ({ name: a.name, model, role: a.role, actions: a.actions }));
}

/** Link de vídeo do Instagram que a extração aceita (Reel, post ou IGTV). */
export const VIDEO_LINK_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,20})\/?(?:[?#]\S*)?$/i;

export function videoShortcode(link: string | null | undefined): string {
  const m = VIDEO_LINK_RE.exec(String(link || '').trim());
  return m ? m[2] : '';
}
