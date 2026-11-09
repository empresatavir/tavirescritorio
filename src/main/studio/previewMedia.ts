import * as fs from 'node:fs';
import { formatById, type StudioFormat } from '../../shared/studio';
import { chromeOf, cutCaption, formatsForProfile, previewAlerts, zonePercents, type PreviewView } from '../../shared/studioPreview';
import type { StudioStore } from './store';
import { getStudioStore } from './store';

const IMAGE_MAX = 4_000_000;
const VIDEO_MAX = 12_000_000;

function dataUrl(file: string, mime: string, max: number): string {
  if (!file || !fs.existsSync(file)) return '';
  const body = fs.readFileSync(file);
  if (body.length === 0 || body.length > max) return '';
  return `data:${mime};base64,${body.toString('base64')}`;
}

function newest<T extends { criado_em: string }>(items: T[], pred: (item: T) => boolean): T | undefined {
  return items.filter(pred).sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))[0];
}

function secondsOf(checks: Array<{ nome?: string; detalhe?: string }> | null | undefined): number | undefined {
  const line = checks?.find((item) => item.nome === 'duração')?.detalhe ?? '';
  const value = Number.parseFloat(line);
  return Number.isFinite(value) ? value : undefined;
}

function stillOf(store: StudioStore, pecaId: string, frame: number): string {
  const renders = store.listRenders(pecaId).filter((item) => item.status === 'pronto' && item.tipo === 'still');
  const named = newest(renders, (item) => item.caminho.includes(`still-f${frame}-`));
  const row = named || newest(renders, () => true);
  return row ? dataUrl(row.caminho, 'image/png', IMAGE_MAX) : '';
}

export function readPreview(pecaId: string, frame = 0, formatId = '', store: StudioStore = getStudioStore()): PreviewView {
  const peca = store.getPeca(pecaId);
  const blank: PreviewView = {
    empty: true, chrome: 'feed', caption: '', alerts: [], image: '', video: '', covers: [],
    formats: [], safe: { top: 0, bottom: 0, left: 0, right: 0 }, aspect: '4 / 5', index: 0, slideCount: 0, title: '',
  };
  if (!peca) return blank;
  const perfil = store.getPerfil(peca.perfil_id);
  const pieceFormat = formatById(peca.formato_id);
  if (!pieceFormat) return blank;
  const ids = (perfil?.redes ?? []).flatMap((rede) => rede.formatos ?? []);
  const formats = formatsForProfile(ids, peca.formato_id);
  const selected = formats.find((item) => item.id === formatId) ?? pieceFormat;
  const slides = peca.roteiro?.slides ?? [];
  const index = slides.length ? Math.max(0, Math.min(frame, slides.length - 1)) : 0;
  const slide = slides[index];
  const renders = store.listRenders(pecaId).filter((item) => item.status === 'pronto');
  let image = '';
  let video = '';
  if (pieceFormat.kind === 'video') {
    const row = newest(renders, (item) => item.tipo === 'proxy') || newest(renders, (item) => item.tipo === 'final');
    video = row ? dataUrl(row.caminho, 'video/mp4', VIDEO_MAX) : '';
  } else {
    image = stillOf(store, pecaId, index);
  }
  const videoRow = newest(renders, (item) => item.tipo === 'proxy' || item.tipo === 'final');
  const others = store.listPecas({ perfil_id: peca.perfil_id })
    .filter((item) => item.id !== peca.id)
    .sort((a, b) => (a.atualizado_em < b.atualizado_em ? 1 : -1))
    .slice(0, 8);
  const covers = [image || stillOf(store, peca.id, 0), ...others.map((item) => stillOf(store, item.id, 0))].filter(Boolean);
  return {
    empty: !image && !video,
    chrome: chromeOf(selected),
    caption: cutCaption(peca.legenda || ''),
    alerts: previewAlerts({
      format: pieceFormat,
      title: slide?.titulo || peca.titulo || '',
      slideIndex: index,
      slideCount: slides.length,
      seconds: secondsOf(videoRow?.checks),
    }),
    image,
    video,
    covers,
    formats: formats.map((item) => ({ id: item.id, label: item.label })),
    safe: zonePercents(pieceFormat),
    aspect: aspectText(selected),
    index,
    slideCount: slides.length,
    title: slide?.titulo || peca.titulo || '',
  };
}

function aspectText(format: StudioFormat): string {
  const divisor = gcd(format.width, format.height);
  return `${format.width / divisor} / ${format.height / divisor}`;
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}
