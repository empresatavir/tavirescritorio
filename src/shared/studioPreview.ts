import {
  SAFE_ZONES,
  STUDIO_FORMATS,
  TEXT_LIMITS,
  type StudioFormat,
} from './studio';

/** Largura de um telefone moderno, em pt. Tamanho real: 1 px CSS = 1 pt. */
export const PHONE_WIDTH_PT = 390;

export type PreviewChrome = 'feed' | 'vertical' | 'thumb' | 'linkedin' | 'landscape';

export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewAlert {
  id: 'safe' | 'title' | 'slides' | 'duration';
  text: string;
}

export interface ZonePercents {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const CHAR_WIDTH = 0.52;

export function cutCaption(text: string, limit = TEXT_LIMITS.legendaVisivelChars): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(clean);
  if (chars.length <= limit) return clean;
  const head = chars.slice(0, limit).join('');
  const space = head.lastIndexOf(' ');
  const cut = (space > 0 ? head.slice(0, space) : head).trimEnd();
  return `${cut}…mais`;
}

/** Escala da moldura dentro da coluna. Em 390 px CSS a escala é 1. */
export function frameScale(cssWidth: number, deviceWidth = PHONE_WIDTH_PT): number {
  if (!(cssWidth > 0) || !(deviceWidth > 0)) return 1;
  return cssWidth / deviceWidth;
}

export function chromeOf(format: StudioFormat): PreviewChrome {
  if (format.id === 'yt-thumb-16x9') return 'thumb';
  if (format.network === 'linkedin') return 'linkedin';
  if (format.width > format.height) return 'landscape';
  if (format.kind === 'video') return 'vertical';
  return 'feed';
}

export function formatsForProfile(formatIds: string[], pieceFormatId: string): StudioFormat[] {
  const ids = new Set(formatIds.filter(Boolean));
  if (pieceFormatId) ids.add(pieceFormatId);
  return STUDIO_FORMATS.filter((format) => ids.has(format.id));
}

function zoneOf(format: StudioFormat): { top: number; bottom: number; left: number; right: number } {
  return SAFE_ZONES.find((item) => item.id === format.safeZoneId) ?? { top: 0, bottom: 0, left: 60, right: 60 };
}

/** Caixa do título, alinhada à base, com a mesma tipografia do slide. */
export function titleBox(input: {
  title: string;
  width: number;
  height: number;
  zone: { top: number; bottom: number; left: number; right: number };
  fontSize?: number;
  lineHeight?: number;
}): TextBox {
  const font = input.fontSize ?? 64;
  const line = input.lineHeight ?? 1.05;
  const innerW = Math.max(1, input.width - input.zone.left - input.zone.right);
  const perLine = Math.max(1, Math.floor(innerW / (font * CHAR_WIDTH)));
  const lines = Math.max(1, Math.ceil(Math.max(1, Array.from(input.title || ' ').length) / perLine));
  const height = lines * font * line;
  return {
    x: input.zone.left,
    y: input.height - input.zone.bottom - height,
    width: innerW,
    height,
  };
}

export function textOutsideSafeZone(
  box: TextBox,
  frame: { width: number; height: number },
  zone: { top: number; bottom: number; left: number; right: number },
): boolean {
  const right = frame.width - zone.right;
  const bottom = frame.height - zone.bottom;
  return box.x < zone.left - 0.5
    || box.y < zone.top - 0.5
    || box.x + box.width > right + 0.5
    || box.y + box.height > bottom + 0.5;
}

export function zonePercents(format: StudioFormat): ZonePercents {
  const zone = zoneOf(format);
  return {
    top: (zone.top / format.height) * 100,
    bottom: (zone.bottom / format.height) * 100,
    left: (zone.left / format.width) * 100,
    right: (zone.right / format.width) * 100,
  };
}

export function previewAlerts(input: {
  format: StudioFormat;
  title: string;
  slideIndex: number;
  slideCount: number;
  seconds?: number;
}): PreviewAlert[] {
  const alerts: PreviewAlert[] = [];
  const title = input.title || '';
  const limit = input.slideIndex === 0 ? TEXT_LIMITS.capaMaxChars : TEXT_LIMITS.slideMaxChars;
  if (Array.from(title).length > limit) {
    alerts.push({ id: 'title', text: `Título acima do limite (${Array.from(title).length}/${limit})` });
  }
  if (input.format.minSlides != null && input.slideCount < input.format.minSlides) {
    alerts.push({ id: 'slides', text: `Slide a menos: ${input.slideCount} de no mínimo ${input.format.minSlides}` });
  }
  if (input.format.maxSlides != null && input.slideCount > input.format.maxSlides) {
    alerts.push({ id: 'slides', text: `Slide a mais: ${input.slideCount} de no máximo ${input.format.maxSlides}` });
  }
  if (input.format.kind === 'video' && input.format.maxSeconds != null && input.seconds != null && input.seconds > input.format.maxSeconds) {
    alerts.push({ id: 'duration', text: `Vídeo acima de ${input.format.maxSeconds} s` });
  }
  const zone = zoneOf(input.format);
  const box = titleBox({ title, width: input.format.width, height: input.format.height, zone });
  if (title && textOutsideSafeZone(box, input.format, zone)) {
    alerts.push({ id: 'safe', text: 'Texto fora da zona segura' });
  }
  return alerts;
}

export function aspectOf(format: StudioFormat): string {
  const divisor = gcd(format.width, format.height);
  return `${format.width / divisor} / ${format.height / divisor}`;
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export interface PreviewView {
  empty: boolean;
  chrome: PreviewChrome;
  caption: string;
  alerts: PreviewAlert[];
  image: string;
  video: string;
  covers: string[];
  formats: Array<{ id: string; label: string }>;
  safe: ZonePercents;
  aspect: string;
  index: number;
  slideCount: number;
  title: string;
}
