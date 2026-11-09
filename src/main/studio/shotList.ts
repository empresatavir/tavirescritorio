import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatById, type RoteiroSlide } from '../../shared/studio';
import { ensureStudioTree } from './paths';
import { compilePrompt, flowAspect } from './promptCompiler';
import { slotCode } from './rules';
import { slidesFromRoteiro } from './slides';
import type { StudioStore } from './store';

function aspectOf(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(width, height) || 1;
  return `${width / g}:${height / g}`;
}

function needsImage(slide: RoteiroSlide): boolean {
  return slide.layout === 'imagem-cheia' || !!slide.slot;
}

export function compilePiecePrompts(pecaId: string, store: StudioStore): { ok: boolean; error?: string; count?: number } {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const perfil = store.getPerfil(peca.perfil_id);
  if (!perfil) return { ok: false, error: 'perfil não encontrado' };
  const format = formatById(peca.formato_id);
  if (!format) return { ok: false, error: 'formato desconhecido' };
  const serie = peca.serie_id ? store.getSerie(peca.serie_id) : null;
  const slides = slidesFromRoteiro(peca.roteiro, perfil.brand_kit.canon, peca.pauta?.fonte ?? '');
  const linked = slides
    .map((slide, index) => ({ slide, index }))
    .filter((item) => needsImage(item.slide));
  const chosen = linked.length
    ? linked
    : slides.map((slide, index) => ({ slide, index })).filter((item) => item.slide.layout !== 'fonte');
  if (!chosen.length) return { ok: false, error: 'não há slide para um prompt' };
  const aspect = aspectOf(format.width, format.height);
  const video = format.kind === 'video';
  const nextSlides = slides.slice();
  for (const item of chosen) {
    let codigo = item.slide.slot || '';
    if (!codigo) {
      try {
        codigo = slotCode(serie?.sigla || 'ST', peca.numero, item.index + 1, video ? 'video' : 'imagem');
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      nextSlides[item.index] = { ...item.slide, slot: codigo };
    }
    const slot = store.listSlots(pecaId).find((row) => row.codigo === codigo)
      ?? store.saveSlot({
        peca_id: pecaId,
        codigo,
        tipo: video ? 'video' : 'imagem',
        descricao: item.slide.titulo,
        formato_px: `${format.width}x${format.height}`,
      });
    const blob = `${item.slide.titulo} ${item.slide.apoio || ''}`.toLowerCase();
    const character = perfil.brand_kit.characters.find((person) => person.name && blob.includes(person.name.toLowerCase())) ?? null;
    const compiled = compilePrompt({
      kind: slot.tipo === 'video' ? 'video' : 'imagem',
      titulo: item.slide.titulo,
      apoio: item.slide.apoio,
      tema: peca.pauta?.tema,
      layout: item.slide.layout,
      character,
      brand: perfil.brand_kit,
      aspect,
    });
    const versao = store.listPrompts(slot.id).reduce((max, row) => Math.max(max, row.versao), 0) + 1;
    store.savePrompt({
      slot_id: slot.id,
      alvo: slot.tipo === 'video' ? 'flow-video' : 'flow-imagem',
      versao,
      camadas: compiled.camadas,
      texto: `${compiled.texto}\n\n${compiled.resumo}`,
    });
  }
  store.updatePeca(pecaId, { roteiro: { ...(peca.roteiro ?? {}), slides: nextSlides } });
  return { ok: true, count: chosen.length };
}

export function exportShotList(pecaId: string, store: StudioStore, home?: string): { ok: boolean; arquivo?: string; error?: string } {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const format = formatById(peca.formato_id);
  const aspect = format ? aspectOf(format.width, format.height) : '—';
  const slots = store.listSlots(pecaId);
  const blocks: string[] = ['# Prompts do Flow', ''];
  for (const slot of slots) {
    const latest = store.listPrompts(slot.id).slice().sort((a, b) => b.versao - a.versao)[0];
    if (!latest) continue;
    const ext = slot.tipo === 'video' ? 'mp4' : 'png';
    const asked = flowAspect(aspect);
    blocks.push(`## ${slot.codigo}`, '', `- proporção no Flow: ${asked}`, `- slide final: ${aspect}`, `- arquivo: ${slot.codigo}.${ext}`, '', latest.texto, '');
  }
  if (blocks.length <= 2) return { ok: false, error: 'não há prompt para exportar' };
  const dir = ensureStudioTree(home).pecaDirs(pecaId).root;
  fs.mkdirSync(dir, { recursive: true });
  const arquivo = path.join(dir, 'prompts.md');
  fs.writeFileSync(arquivo, blocks.join('\n'), 'utf8');
  return { ok: true, arquivo };
}
