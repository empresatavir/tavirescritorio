/**
 * Catálogo dos agentes que o APK chama pelo "Chamar agente".
 * É a lista que o Escritório publica (nome, papel e opções prontas) e a que a fila aceita.
 * `scope` aponta o escopo canônico em agentes/escopo/agentes/; sem ele, vale só o `brief`.
 */

import { ROSTER, SECTOR_ORDER } from './officeRoster';

export interface OfficeAgentAction {
  id: string;
  /** Texto do botão no app. */
  label: string;
  /** O que o Carlos precisa informar (vira o placeholder do campo). */
  hint: string;
}

export interface OfficeAgent {
  name: string;
  /** Slug do agente em backend/tavir.db (equipe da agência). Vazio nos ajudantes do Escritório. */
  id?: string;
  /** Grupo na lista do app (SECTOR_ORDER). */
  sector?: string;
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
export const MAICON = 'Maicon';
/** Estudo de vídeo (Instagram ou YouTube): ver, transcrever, abrir os links e cruzar com o Escritório. */
export const ACTION_STUDY = 'estudo-video';
/** Analista de YouTube da agência (analista-youtube): inteligência de negócios em vídeos. */
export const YURI_YOUTUBE = 'Yuri YouTube';
/** Quem pode estudar vídeo: o Maicon olha ferramenta e absorção; o Yuri olha negócio e aprendizado. */
export const STUDY_OWNERS = [MAICON, YURI_YOUTUBE];
/** Copiador de sites: o Escritório mede o site no navegador e o Kakashi redige o dossiê de reprodução. */
export const KAKASHI = 'Kakashi';
export const ACTION_ABSORB = 'absorver-site';

/** Primeiro endereço de site no texto (http/https ou domínio solto). */
export function firstSiteLink(text: string | null | undefined): string {
  const t = String(text || '');
  const full = /https?:\/\/[^\s<>"')]+/i.exec(t);
  if (full) return full[0].replace(/[.,;]+$/, '');
  const bare = /\b((?:[a-z0-9-]+\.)+(?:com\.br|com|br|io|app|dev|co|net|org|design|studio|ai|so|me|xyz))(\/[^\s<>"')]*)?/i.exec(t);
  return bare ? `https://${bare[0].replace(/[.,;]+$/, '')}` : '';
}

/** Família, nicho e modo ditos no pedido de absorção («sistema», «nicho: clínica», «modo conceito»). */
export function absorbHints(text: string | null | undefined): { family: 'marketing' | 'produto'; niche: string; mode: string } {
  const t = String(text || '');
  const family = /\b(sistema|produto|painel|dashboard|app|aplicativo|saas|crm|erp)\b/i.test(t) ? 'produto' : 'marketing';
  const niche = (/\bnicho\s*[:=]?\s*([^\n.;,]{2,40})/i.exec(t)?.[1] || '').trim();
  const mode = /\bconceit/i.test(t) ? 'conceito' : /\bpadr[aã]o\b/i.test(t) ? 'padrao' : '';
  return { family, niche, mode };
}

/** Agentes com comportamento próprio no Escritório (opções, escopo canônico) e os ajudantes genéricos. */
const CURATED: OfficeAgent[] = [
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
    name: MAICON,
    role: 'Arquiteto de integrações: estuda vídeos e ferramentas e diz se vale trazer para o Escritório',
    brief: 'Você avalia ferramentas e conteúdos de terceiros e entrega um parecer: absorver por inteiro, em parte, só o conceito ou rejeitar.',
    scope: 'maicon.md',
    actions: [
      { id: ACTION_STUDY, label: 'Estudar vídeo (Instagram ou YouTube)', hint: 'Cole o link do Reel, do post ou do vídeo do YouTube' },
      { id: 'ferramenta', label: 'Avaliar ferramenta', hint: 'Cole o link do repositório ou do site' },
    ],
  },
  {
    name: KAKASHI,
    role: 'Copiador de sites: absorve estrutura, componentes, animações, interações e tempos de um site de referência',
    brief: 'Você transforma um site de referência num dossiê com o qual outro agente refaz a experiência do zero: medidas com fonte, cada animação com gatilho, duração e curva, e a receita para aplicar a marca do cliente. Copia a técnica, nunca imagem, texto ou código.',
    scope: 'kakashi.md',
    actions: [{ id: ACTION_ABSORB, label: 'Absorver site', hint: 'Cole o endereço. Se quiser, diga o nicho, se é LP ou sistema e se serve para Padrão ou Conceito' }],
  },
  {
    name: YURI_YOUTUBE,
    role: 'Inteligência de negócios em vídeos: aulas, podcasts e entrevistas do YouTube ou do Instagram',
    brief: 'Você transforma um vídeo em inteligência rastreável: tese, modelo de negócio, operação, oportunidades e experimentos para a TAVIR, com o instante de cada ponto.',
    actions: [{ id: ACTION_STUDY, label: 'Estudar vídeo e tirar aprendizados', hint: 'Cole o link do YouTube ou do Instagram e diga o que quer aprender' }],
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
    name: 'Marina Marca',
    role: 'Marca: posicionamento, tom de voz, paleta e tipografia',
    brief: 'Você decide quem a marca é e entrega isso em tokens que a interface usa: posicionamento, tom de voz com exemplos, paleta com contraste conferido e tipografia. Cada escolha tem motivo ligado ao público.',
    scope: 'marina-marca.md',
    actions: [
      { id: 'marca', label: 'Definir a marca', hint: 'Diga o projeto, o público e o que ele promete' },
      { id: 'revisar', label: 'Revisar a marca atual', hint: 'Informe o projeto ou a URL' },
      { id: 'voz', label: 'Escrever o tom de voz', hint: 'Diga para quem a marca fala' },
    ],
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

/**
 * Catálogo que o app mostra: a equipe inteira da agência (ROSTER), na ordem dos grupos,
 * com o que o Escritório já sabe de cada um (CURATED) por cima, e os ajudantes genéricos no fim.
 */
function buildCatalog(): OfficeAgent[] {
  const byName = new Map(CURATED.map((c) => [c.name, c]));
  const team: OfficeAgent[] = ROSTER.map((r) => {
    const c = byName.get(r.name);
    if (c) return { ...c, id: r.id, sector: r.sector, role: c.role || r.role };
    return { name: r.name, id: r.id, sector: r.sector, role: r.role, brief: `Você é ${r.name}, da equipe TAVIR: ${r.role}.`, actions: r.actions };
  });
  const inTeam = new Set(team.map((t) => t.name));
  const helpers = CURATED.filter((c) => !inTeam.has(c.name)).map((c) => ({ ...c, sector: 'Escritório' }));
  const rank = (s?: string) => {
    const i = SECTOR_ORDER.indexOf(s || '');
    return i < 0 ? SECTOR_ORDER.length : i;
  };
  return [...team, ...helpers].map((x, i) => ({ x, i })).sort((p, q) => rank(p.x.sector) - rank(q.x.sector) || p.i - q.i).map((p) => p.x);
}

export const OFFICE_AGENTS: OfficeAgent[] = buildCatalog();

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
export function publishedAgents(model: string): Array<{ name: string; model: string; role: string; sector: string; actions: OfficeAgentAction[] }> {
  return OFFICE_AGENTS.map((a) => ({ name: a.name, model, role: a.role, sector: a.sector || 'Escritório', actions: a.actions }));
}

/** Motor ligado no Escritório, como o app mostra na escolha de motor e esforço. */
export interface PublishedEngine {
  id: string;
  label: string;
  /** Modelo usado quando o app escolhe este motor (o padrão do Escritório, se for o motor padrão). */
  model: string;
  modelLabel: string;
  efforts: Array<{ id: string; label: string }>;
  defaultEffort: string;
  isDefault: boolean;
}

/**
 * Motores que o app pode escolher: só os ligados. Com um só, o app nem mostra a escolha.
 * Vai em office_status.stats.engines (a tabela não tem coluna própria).
 */
export function publishedEngines(
  motors: Array<{ id: string; label: string; defaultModel: string; defaultEffort: string; models: Array<{ id: string; label: string; efforts: Array<{ id: string; label: string }> }> }>,
  settings: { defaultEngine: string; defaultModel: string; defaultEffort: string },
): PublishedEngine[] {
  return motors.map((m) => {
    const isDefault = m.id === settings.defaultEngine;
    const wanted = isDefault ? settings.defaultModel : m.defaultModel;
    const model = m.models.find((x) => x.id === wanted) || m.models[0];
    const efforts = (model?.efforts || []).map((e) => ({ id: e.id, label: e.label }));
    const pref = isDefault ? settings.defaultEffort : m.defaultEffort;
    return {
      id: m.id,
      label: m.label,
      model: model?.id || '',
      modelLabel: model?.label || '',
      efforts,
      defaultEffort: efforts.some((e) => e.id === pref) ? pref : efforts[0]?.id || '',
      isDefault,
    };
  });
}

/**
 * Motor, modelo e esforço de um pedido do app. `motor`/`esforco` só valem se o motor estiver ligado;
 * senão fica o padrão do Escritório.
 */
export function callForRequest(
  fields: Record<string, string> | null | undefined,
  engines: PublishedEngine[],
  settings: { defaultEngine: string; defaultModel: string; defaultEffort: string },
): { engine: string; model: string; effort: string } {
  const f = fields || {};
  const wanted = String(f.motor || '').trim().toLowerCase();
  const chosen = engines.find((e) => e.id === wanted) || engines.find((e) => e.isDefault);
  const base = chosen
    ? { engine: chosen.id, model: chosen.model, effort: chosen.defaultEffort }
    : { engine: settings.defaultEngine, model: settings.defaultModel, effort: settings.defaultEffort };
  const effort = String(f.esforco || '').trim().toLowerCase();
  if (effort && chosen && chosen.efforts.some((e) => e.id === effort)) base.effort = effort;
  return base;
}

/** Link de vídeo do Instagram que a extração aceita (Reel, post ou IGTV). */
export const VIDEO_LINK_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,20})\/?(?:[?#]\S*)?$/i;

export function videoShortcode(link: string | null | undefined): string {
  const m = VIDEO_LINK_RE.exec(String(link || '').trim());
  return m ? m[2] : '';
}
