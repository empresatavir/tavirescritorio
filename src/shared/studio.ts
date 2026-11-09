/** Domínio do Studio. Constantes da seção 4 de docs/planning/GOAL_STUDIO.md. */

export const STUDIO_NETWORKS = ['instagram', 'youtube', 'tiktok', 'linkedin'] as const;
export type StudioNetwork = typeof STUDIO_NETWORKS[number];
export const STUDIO_NETWORK_LABEL: Record<StudioNetwork, string> = {
  instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', linkedin: 'LinkedIn',
};

export type StudioMediaKind = 'still' | 'carousel' | 'video';

export interface StudioFormat {
  id: string;
  network: StudioNetwork;
  label: string;
  kind: StudioMediaKind;
  width: number;
  height: number;
  fps?: number;
  maxSeconds?: number;
  minSlides?: number;
  maxSlides?: number;
  safeZoneId?: string;
}

export const STUDIO_FORMATS: StudioFormat[] = [
  { id: 'ig-carrossel-4x5', network: 'instagram', label: 'Carrossel 4:5', kind: 'carousel', width: 1080, height: 1350, minSlides: 2, maxSlides: 20, safeZoneId: 'ig-feed' },
  { id: 'ig-post-4x5',      network: 'instagram', label: 'Post 4:5',      kind: 'still',    width: 1080, height: 1350, safeZoneId: 'ig-feed' },
  { id: 'ig-post-1x1',      network: 'instagram', label: 'Post 1:1',      kind: 'still',    width: 1080, height: 1080, safeZoneId: 'ig-feed' },
  { id: 'ig-reels-9x16',    network: 'instagram', label: 'Reel 9:16',     kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 90,  safeZoneId: 'ig-reels' },
  { id: 'ig-stories-9x16',  network: 'instagram', label: 'Stories 9:16',  kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'ig-stories' },
  { id: 'yt-shorts-9x16',   network: 'youtube',   label: 'Shorts 9:16',   kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'yt-shorts' },
  { id: 'yt-longo-16x9',    network: 'youtube',   label: 'Vídeo 16:9',    kind: 'video',    width: 1920, height: 1080, fps: 30 },
  { id: 'yt-thumb-16x9',    network: 'youtube',   label: 'Miniatura',     kind: 'still',    width: 1280, height: 720 },
  { id: 'tt-video-9x16',    network: 'tiktok',    label: 'TikTok 9:16',   kind: 'video',    width: 1080, height: 1920, fps: 30, maxSeconds: 60,  safeZoneId: 'tiktok' },
  { id: 'li-post-4x5',      network: 'linkedin',  label: 'Post 4:5',      kind: 'still',    width: 1080, height: 1350 },
  { id: 'li-documento-4x5', network: 'linkedin',  label: 'Documento 4:5', kind: 'carousel', width: 1080, height: 1350, minSlides: 2, maxSlides: 20 },
];

export const PIECE_STAGES = ['pauta', 'angulo', 'roteiro', 'arte', 'audio', 'revisao', 'pacote', 'publicado'] as const;
export type PieceStage = typeof PIECE_STAGES[number];
export const PIECE_STAGE_LABEL: Record<PieceStage, string> = {
  pauta: 'Pauta', angulo: 'Ângulo', roteiro: 'Roteiro', arte: 'Arte', audio: 'Áudio',
  revisao: 'Revisão', pacote: 'Pacote', publicado: 'Publicado',
};
/** Etapas que só avançam por gate do CEO. 'pacote' → 'publicado' é o gate de publicação. */
export const PIECE_GATES: PieceStage[] = ['angulo', 'revisao', 'pacote'];

/** Carrossel e post pulam 'audio'. */
export function stagesFor(kind: StudioMediaKind): PieceStage[] {
  return kind === 'video' ? [...PIECE_STAGES] : PIECE_STAGES.filter((s) => s !== 'audio');
}

export const PIECE_STATUS = ['ativa', 'pausada', 'arquivada'] as const;
export type PieceStatus = typeof PIECE_STATUS[number];
export const GATE_DECISIONS = ['aprovado', 'ajuste', 'recusado'] as const;
export type GateDecision = typeof GATE_DECISIONS[number];

export interface SafeZone { id: string; top: number; bottom: number; left: number; right: number; note: string; }
export const SAFE_ZONES: SafeZone[] = [
  { id: 'ig-feed',    top: 0,   bottom: 0,   left: 60, right: 60,  note: 'Margem de respiro; o feed não cobre a arte.' },
  { id: 'ig-reels',   top: 220, bottom: 420, left: 60, right: 140, note: 'Topo: cabeçalho. Base: legenda e áudio. Direita: curtir/comentar.' },
  { id: 'ig-stories', top: 250, bottom: 340, left: 60, right: 60,  note: 'Topo: barra de progresso e perfil. Base: responder.' },
  { id: 'yt-shorts',  top: 200, bottom: 480, left: 60, right: 160, note: 'Base maior por causa do título e inscrever-se.' },
  { id: 'tiktok',     top: 200, bottom: 480, left: 60, right: 160, note: 'Igual aos Shorts até o Carlos confirmar.' },
];
export const TEXT_LIMITS = {
  capaMaxChars: 60,
  slideMaxChars: 140,
  legendaVisivelChars: 125,
  legendaMaxChars: 2200,
  hashtagsMax: 5,
};

export interface BrandKit {
  palette: { ink: string; surface: string; text: string; accent: string; accent2: string };
  fonts: { title: string; body: string; mono?: string };
  logoPath?: string;
  voice?: { provider: 'edge-tts' | 'piper'; voiceId: string; rate?: string };
  imageStyle: string;
  negatives: string[];
  characters: Array<{ id: string; name: string; description: string; refImages: string[] }>;
  tone: string;
  canon: string[];
}

export const MOTION_PRESETS = [
  'titulo-entrada', 'troca-cena', 'destaque-palavra', 'zoom-lento',
  'legenda-palavra', 'transicao-capitulo', 'encerramento-cta',
] as const;
export type MotionPreset = typeof MOTION_PRESETS[number];

export interface MotionKit {
  id: string;
  profileId: string;
  name: string;
  version: number;
  status: 'rascunho' | 'aprovado';
  tokens: {
    easing: [number, number, number, number];
    enterFrames: number;
    exitFrames: number;
    staggerFrames: number;
    holdPerWordFrames: number;
    zoomFrom: number;
    zoomTo: number;
  };
  presets: Record<MotionPreset, { component: string; approvedAt?: string }>;
}

/** Valores indicados no contrato do kit (seção 4.4). */
export const MOTION_TOKEN_PADRAO: MotionKit['tokens'] = {
  easing: [0.2, 0.7, 0.2, 1],
  enterFrames: 9,
  exitFrames: 6,
  staggerFrames: 3,
  holdPerWordFrames: 10,
  zoomFrom: 1,
  zoomTo: 1.08,
};

export type PublicacaoModo = 'manual' | 'darkflow';
export type SlotTipo = 'imagem' | 'video';
export type AtivoOrigem = 'flow' | 'local' | 'render' | 'tts';
export type PromptAlvo = 'flow-imagem' | 'flow-video';
export type PromptNota = 'funcionou' | 'nao' | null;
export type RenderTipo = 'still' | 'proxy' | 'final';
export type MotionJobStatus = 'rodando' | 'reprovado' | 'aguardando_gate' | 'aprovado' | 'recusado';

export interface Pauta {
  tema?: string;
  fonte?: string;
  objetivo?: string;
}

export interface Angulo {
  id: string;
  gancho: string;
  promessa: string;
  prova: string;
  origem?: 'ceo' | 'motor';
}

export interface RoteiroSlide {
  tag?: string;
  titulo: string;
  apoio?: string;
  layout?: 'capa' | 'texto' | 'imagem-cheia' | 'dado' | 'fonte' | 'cta';
  slot?: string;
}

export interface Roteiro {
  slides?: RoteiroSlide[];
  legenda?: string;
  hashtags?: string[];
}

export interface StudioEvent {
  kind: 'render';
  renderId: string;
  type: 'progress' | 'done' | 'error' | 'cancelled';
  pct?: number;
  path?: string;
  message?: string;
}

export interface PreflightItem {
  item: string;
  ok: boolean;
  detalhe: string;
  comoResolver: string;
}

/** Linha de `perfis`. `brand_kit_json` é o JSON gravado. */
export interface PerfilRow {
  id: string;
  nome: string;
  iniciais: string;
  cor_avatar: string;
  brand_kit_json: string;
  motion_kit_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface PerfilRedeRow {
  id: string;
  perfil_id: string;
  rede: string;
  handle: string;
  formatos_json: string;
  posts_semana: number;
  publicacao: string;
  ativo: number;
}

export interface SerieRow {
  id: string;
  perfil_id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
}

export interface PecaRow {
  id: string;
  numero: number;
  perfil_id: string;
  serie_id: string | null;
  rede: string;
  formato_id: string;
  titulo: string;
  etapa: string;
  status: string;
  pauta_json: string | null;
  angulos_json: string;
  angulo_escolhido: string | null;
  roteiro_json: string | null;
  legenda: string | null;
  hashtags_json: string;
  agendado_para: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface SlotRow {
  id: string;
  peca_id: string;
  codigo: string;
  tipo: string;
  descricao: string | null;
  formato_px: string | null;
  ativo_id: string | null;
}

export interface AtivoRow {
  id: string;
  peca_id: string;
  slot_id: string | null;
  tipo: string;
  origem: string;
  caminho: string;
  sha256: string | null;
  largura: number | null;
  altura: number | null;
  duracao_ms: number | null;
  licenca: string | null;
  criado_em: string;
}

export interface PromptRow {
  id: string;
  slot_id: string;
  alvo: string;
  versao: number;
  camadas_json: string;
  texto: string;
  nota: string | null;
  criado_em: string;
}

export interface RenderRow {
  id: string;
  peca_id: string;
  tipo: string;
  caminho: string;
  status: string;
  checks_json: string | null;
  criado_em: string;
}

export interface GateRow {
  id: string;
  peca_id: string;
  etapa: string;
  decisao: string;
  comentario: string | null;
  decidido_em: string;
}

export interface MotionKitRow {
  id: string;
  perfil_id: string;
  nome: string;
  versao: number;
  status: string;
  tokens_json: string;
  presets_json: string;
  criado_em: string;
}

export interface MotionJobRow {
  id: string;
  kit_id: string;
  preset: string;
  motor: string;
  modelo: string | null;
  pedido: string;
  workspace: string;
  status: string;
  checks_json: string | null;
  run_id: string | null;
  criado_em: string;
}

export interface EventoRow {
  id: string;
  ref_tipo: string;
  ref_id: string;
  acao: string;
  detalhe: string | null;
  quando: string;
}

export interface Perfil {
  id: string;
  nome: string;
  iniciais: string;
  cor_avatar: string;
  brand_kit: BrandKit;
  motion_kit_id: string | null;
  criado_em: string;
  atualizado_em: string;
  redes?: PerfilRede[];
}

export interface PerfilInput {
  id?: string;
  nome: string;
  iniciais: string;
  cor_avatar: string;
  brand_kit: BrandKit;
  motion_kit_id?: string | null;
}

export interface PerfilRede {
  id: string;
  perfil_id: string;
  rede: StudioNetwork;
  handle: string;
  formatos: string[];
  posts_semana: number;
  publicacao: PublicacaoModo;
  ativo: boolean;
}

export interface PerfilRedeInput {
  id?: string;
  rede: StudioNetwork;
  handle: string;
  formatos: string[];
  posts_semana: number;
  publicacao: PublicacaoModo;
  ativo?: boolean;
}

export interface Serie {
  id: string;
  perfil_id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
}

export interface SerieInput {
  id?: string;
  perfil_id: string;
  nome: string;
  sigla: string;
  descricao?: string | null;
}

export interface SlotRef {
  id: string;
  ativo_id: string | null;
  codigo?: string;
}

export interface RenderCheck {
  ok: boolean;
  nome?: string;
  detalhe?: string;
}

export interface Peca {
  id: string;
  numero: number;
  perfil_id: string;
  serie_id: string | null;
  rede: StudioNetwork;
  formato_id: string;
  titulo: string;
  etapa: PieceStage;
  status: PieceStatus;
  pauta: Pauta | null;
  angulos: Angulo[];
  angulo_escolhido: string | null;
  roteiro: Roteiro | null;
  legenda: string | null;
  hashtags: string[];
  agendado_para: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Preenchido na leitura para as regras. Não é coluna. */
  slots?: SlotRef[];
  render_final?: { status: string; checks: RenderCheck[] } | null;
  pacote_montado?: boolean;
}

export interface PecaCreateInput {
  perfil_id: string;
  serie_id?: string | null;
  rede: StudioNetwork;
  formato_id: string;
  titulo: string;
  pauta?: Pauta | null;
}

export interface PecaUpdate {
  titulo?: string;
  serie_id?: string | null;
  pauta?: Pauta | null;
  angulos?: Angulo[] | null;
  angulo_escolhido?: string | null;
  roteiro?: Roteiro | null;
  legenda?: string | null;
  hashtags?: string[] | null;
  agendado_para?: string | null;
}

export interface PecaFiltro {
  perfil_id?: string;
  rede?: StudioNetwork;
  etapa?: PieceStage;
  status?: PieceStatus;
  serie_id?: string;
}

export interface Slot {
  id: string;
  peca_id: string;
  codigo: string;
  tipo: SlotTipo;
  descricao: string | null;
  formato_px: string | null;
  ativo_id: string | null;
}

export interface SlotInput {
  id?: string;
  peca_id: string;
  codigo: string;
  tipo: SlotTipo;
  descricao?: string | null;
  formato_px?: string | null;
  ativo_id?: string | null;
}

export interface Ativo {
  id: string;
  peca_id: string;
  slot_id: string | null;
  tipo: string;
  origem: AtivoOrigem;
  caminho: string;
  sha256: string | null;
  largura: number | null;
  altura: number | null;
  duracao_ms: number | null;
  licenca: string | null;
  criado_em: string;
}

export interface AtivoInput {
  id?: string;
  peca_id: string;
  slot_id?: string | null;
  tipo: string;
  origem: AtivoOrigem;
  caminho: string;
  sha256?: string | null;
  largura?: number | null;
  altura?: number | null;
  duracao_ms?: number | null;
  licenca?: string | null;
}

export interface Prompt {
  id: string;
  slot_id: string;
  alvo: PromptAlvo;
  versao: number;
  camadas: unknown;
  texto: string;
  nota: PromptNota;
  criado_em: string;
}

export interface PromptInput {
  id?: string;
  slot_id: string;
  alvo: PromptAlvo;
  versao?: number;
  camadas?: unknown;
  texto: string;
  nota?: PromptNota;
}

export interface RenderItem {
  id: string;
  peca_id: string;
  tipo: RenderTipo;
  caminho: string;
  status: string;
  checks: RenderCheck[] | null;
  criado_em: string;
}

export interface RenderInput {
  id?: string;
  peca_id: string;
  tipo: RenderTipo;
  caminho: string;
  status: string;
  checks?: RenderCheck[] | null;
}

export interface Gate {
  id: string;
  peca_id: string;
  etapa: PieceStage;
  decisao: GateDecision;
  comentario: string | null;
  decidido_em: string;
}

export interface MotionKitRecord {
  id: string;
  perfil_id: string;
  nome: string;
  versao: number;
  status: 'rascunho' | 'aprovado';
  tokens: MotionKit['tokens'];
  presets: MotionKit['presets'] | Record<string, { component: string; approvedAt?: string }>;
  criado_em: string;
}

export interface MotionKitInput {
  id?: string;
  perfil_id: string;
  nome: string;
  versao?: number;
  status?: 'rascunho' | 'aprovado';
  tokens: MotionKit['tokens'];
  presets?: MotionKitRecord['presets'];
}

export interface MotionJob {
  id: string;
  kit_id: string;
  preset: string;
  motor: string;
  modelo: string | null;
  pedido: string;
  workspace: string;
  status: MotionJobStatus;
  checks: unknown;
  run_id: string | null;
  criado_em: string;
}

export interface MotionJobInput {
  id?: string;
  kit_id: string;
  preset: string;
  motor: string;
  modelo?: string | null;
  pedido: string;
  workspace: string;
  status?: MotionJobStatus;
  checks?: unknown;
  run_id?: string | null;
}

export interface StudioEvento {
  id: string;
  ref_tipo: string;
  ref_id: string;
  acao: string;
  detalhe: string | null;
  quando: string;
}

export function formatById(id: string): StudioFormat | undefined {
  return STUDIO_FORMATS.find((f) => f.id === id);
}

export function isStudioNetwork(value: string): value is StudioNetwork {
  return (STUDIO_NETWORKS as readonly string[]).includes(value);
}

export function isPieceStage(value: string): value is PieceStage {
  return (PIECE_STAGES as readonly string[]).includes(value);
}

export function isPieceStatus(value: string): value is PieceStatus {
  return (PIECE_STATUS as readonly string[]).includes(value);
}

export function isGateDecision(value: string): value is GateDecision {
  return (GATE_DECISIONS as readonly string[]).includes(value);
}
