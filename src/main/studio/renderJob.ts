import { formatById, MOTION_TOKEN_PADRAO, SAFE_ZONES, type Perfil, type Peca, type RenderTipo } from '../../shared/studio';

export interface RenderJob {
  composition: 'TavirSlide' | 'TavirReel';
  props: Record<string, unknown>;
  format: { width: number; height: number; fps: number; maxSeconds?: number };
  output: string;
  type: RenderTipo;
  frame?: number;
}

export interface ProgressMessage {
  type: 'progress' | 'done' | 'error';
  pct?: number;
  path?: string;
  message?: string;
}

export function parseProgressLine(line: string): ProgressMessage | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const value = JSON.parse(trimmed) as ProgressMessage;
    if (value.type !== 'progress' && value.type !== 'done' && value.type !== 'error') return null;
    return value;
  } catch {
    return null;
  }
}

function even(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

export function buildRenderJob(input: {
  peca: Peca;
  perfil: Perfil | null;
  tipo: RenderTipo;
  output: string;
  frame?: number;
  background?: string;
  scenes?: Array<{ src: string; kind: 'image' | 'video'; durationFrames: number; caption: string; preset?: string }>;
  durationInFrames?: number;
  narrations?: Array<{ src: string; from: number; durationFrames: number }>;
  music?: string;
  words?: Array<{ text: string; startMs: number; endMs: number }>;
}): RenderJob {
  const format = formatById(input.peca.formato_id);
  if (!format) throw new Error('formato desconhecido');
  const fps = format.fps ?? 30;
  const width = input.tipo === 'proxy' ? even(format.width / 2) : format.width;
  const height = input.tipo === 'proxy' ? even(format.height / 2) : format.height;
  const zone = SAFE_ZONES.find((item) => item.id === format.safeZoneId) ?? { top: 0, bottom: 0, left: 60, right: 60 };
  const handle = input.perfil?.redes?.find((rede) => rede.rede === input.peca.rede)?.handle ?? '';
  const palette = input.perfil?.brand_kit.palette;
  const slides = input.peca.roteiro?.slides ?? [];
  const slide = slides[input.frame ?? 0] ?? slides[0];
  const video = format.kind === 'video';
  const seconds = Math.min(3, format.maxSeconds ?? 3);
  const durationInFrames = input.durationInFrames ?? (video ? Math.max(1, Math.round(fps * seconds)) : 1);
  return {
    composition: video ? 'TavirReel' : 'TavirSlide',
    type: input.tipo,
    output: input.output,
    frame: input.tipo === 'still' ? (input.frame ?? 0) : undefined,
    format: { width: format.width, height: format.height, fps, maxSeconds: format.maxSeconds },
    props: {
      width,
      height,
      fps,
      durationInFrames,
      title: slide?.titulo || input.peca.titulo,
      support: slide?.apoio || input.peca.pauta?.tema || '',
      handle,
      page: (input.frame ?? 0) + 1,
      pages: Math.max(1, slides.length),
      background: input.background ?? '',
      backgroundColor: palette?.ink ?? '#0B1220',
      titleColor: palette?.text ?? '#F4F6F2',
      accent: palette?.accent ?? '#B7F34A',
      fontFamily: input.perfil?.brand_kit.fonts.title || 'Instrument Sans',
      tokens: MOTION_TOKEN_PADRAO,
      zone: { top: zone.top, bottom: zone.bottom, left: zone.left, right: zone.right },
      debugSafeZone: false,
      layout: slide?.layout || ((input.frame ?? 0) === 0 ? 'capa' : 'texto'),
      scenes: (input.scenes ?? []).map((scene) => ({ ...scene, preset: scene.preset || 'zoom-lento' })),
      narrations: input.narrations ?? [],
      narration: '',
      music: input.music ?? '',
      words: input.words ?? input.peca.roteiro?.legendas ?? [],
    },
  };
}
