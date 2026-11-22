/**
 * Flow: contrato entre quem cria (Studio, APK, agentes, lote do DarkFlow) e quem posta (Flow/DarkFlow).
 * Mapa em docs/planning/GOAL_FLOW.md. O pacote aprovado não é autorização de publicação:
 * agenda só ativa por clique do Carlos no Flow.
 */
import { TEXT_LIMITS, formatById, type StudioNetwork } from './studio';

export const FLOW_ORIGENS = ['studio', 'apk', 'agente', 'lote'] as const;
export type FlowOrigem = typeof FLOW_ORIGENS[number];

export interface PacoteMidia {
  /** Caminho absoluto do arquivo final no pacote. */
  arquivo: string;
  tipo: 'video' | 'imagem';
  sha256: string;
  largura: number;
  altura: number;
  duracao_s?: number;
}

export interface PacoteAprovado {
  versao: 1;
  origem: FlowOrigem;
  peca_id: string | null;
  titulo: string;
  perfil: string;
  rede: StudioNetwork;
  formato: string;
  /** Em ordem de exibição (carrossel: lâmina 1 primeiro). */
  midias: PacoteMidia[];
  legenda: string;
  hashtags: string[];
  /** Houve geração por IA (imagem/vídeo do Google Flow ou voz sintética). Decisão D3. */
  ia: boolean;
}

/** Formatos que o DarkFlow aceita hoje (manifesto v1: um mp4 Reel). Carrossel, imagem e Stories são a F5. */
export const FORMATOS_DARKFLOW = ['ig-reels-9x16'];

export function aceitoPeloDarkflow(formato: string): boolean {
  return FORMATOS_DARKFLOW.includes(formato);
}

/** Onde a peça está no Flow, lido das agendas e ocorrências do DarkFlow (D2: «publicada» só quando publicou). */
export type FlowSituacao = 'fora' | 'na_biblioteca' | 'rascunho' | 'agendada' | 'pausada' | 'publicada' | 'atencao' | 'falhou' | 'sem_conexao';

export interface FlowEstado {
  situacao: FlowSituacao;
  /** Próxima ocorrência (agendada) ou a da publicação, em UTC. */
  quando?: string;
  permalink?: string;
  detalhe?: string;
  /** Publicada pelo adaptador falso do DarkFlow (modo simulação): nada foi ao Instagram. */
  simulado?: boolean;
}

export const FLOW_SITUACAO_LABEL: Record<FlowSituacao, string> = {
  fora: 'ainda não foi para o Flow',
  na_biblioteca: 'na biblioteca do Flow',
  rascunho: 'agenda em rascunho',
  agendada: 'agendada',
  pausada: 'agenda pausada',
  publicada: 'publicada',
  atencao: 'precisa de atenção no Flow',
  falhou: 'a publicação falhou',
  sem_conexao: 'DarkFlow fora do ar',
};

/** Texto que vai para a legenda do post: legenda + hashtags, como o DarkFlow monta. */
export function textoDoPost(p: Pick<PacoteAprovado, 'legenda' | 'hashtags'>): string {
  return `${p.legenda || ''}\n${(p.hashtags || []).join(' ')}`.trim();
}

/** Problemas que impedem o pacote de seguir. Lista vazia = pacote coerente (não quer dizer aprovado). */
export function problemasDoPacote(p: PacoteAprovado): string[] {
  const out: string[] = [];
  if (!FLOW_ORIGENS.includes(p.origem)) out.push(`origem desconhecida: ${p.origem}`);
  const format = formatById(p.formato);
  if (!format) out.push(`formato desconhecido: ${p.formato}`);
  if (!p.midias.length) out.push('pacote sem mídia');
  for (const m of p.midias) {
    if (!/^[a-f0-9]{64}$/.test(m.sha256)) out.push(`sha256 inválido em ${m.arquivo}`);
    if (!(m.largura > 0 && m.altura > 0)) out.push(`dimensões ausentes em ${m.arquivo}`);
  }
  if (format) {
    if (format.kind === 'video' && (p.midias.length !== 1 || p.midias[0]?.tipo !== 'video')) out.push('vídeo precisa de exatamente um arquivo de vídeo');
    if (format.kind === 'still' && (p.midias.length !== 1 || p.midias[0]?.tipo !== 'imagem')) out.push('post precisa de exatamente uma imagem');
    if (format.kind === 'carousel') {
      const min = format.minSlides ?? 2;
      const max = format.maxSlides ?? 10;
      if (p.midias.length < min || p.midias.length > max) out.push(`carrossel precisa de ${min} a ${max} lâminas`);
    }
    if (format.maxSeconds && p.midias[0]?.duracao_s && p.midias[0].duracao_s > format.maxSeconds) out.push(`vídeo passa de ${format.maxSeconds} s`);
  }
  if ((p.hashtags || []).length > TEXT_LIMITS.hashtagsMax) out.push(`mais de ${TEXT_LIMITS.hashtagsMax} hashtags`);
  if (textoDoPost(p).length > TEXT_LIMITS.legendaMaxChars) out.push(`legenda com hashtags passa de ${TEXT_LIMITS.legendaMaxChars} caracteres`);
  return out;
}

/* ---- Flow (F2): quadro e agenda nova ---- */

export interface PecaDoItem {
  peca_id: string;
  titulo: string;
  legenda: string;
  hashtags: string[];
  ia: boolean;
}

export interface FlowBoard {
  online: boolean;
  error?: string;
  status: Record<string, any> | null;
  library: Array<Record<string, any>>;
  schedules: Array<Record<string, any>>;
  occurrences: Array<Record<string, any>>;
  /** item_id da biblioteca → peça do Studio que o entregou. */
  pecas: Record<string, PecaDoItem>;
}

export interface NovaAgenda {
  item_id: string;
  name: string;
  recurrence: 'once' | 'daily' | 'weekly';
  start_date: string;
  end_date?: string | null;
  times: string[];
  weekdays?: number[];
  caption?: string;
  hashtags?: string;
  share_to_feed?: boolean;
  is_ai_generated?: boolean;
}
