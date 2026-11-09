import type { Roteiro, RoteiroSlide } from '../../shared/studio';

const LAYOUTS = new Set(['capa', 'texto', 'imagem-cheia', 'dado', 'fonte', 'cta']);

export function needsSourceSlide(canon: string[]): boolean {
  return canon.some((line) => /fonte/i.test(line) && /[uú]ltimo slide/i.test(line));
}

/** Normaliza o roteiro. Se o canon pede fonte, o último slide passa a ser `fonte`. */
export function slidesFromRoteiro(roteiro: Roteiro | null | undefined, canon: string[] = [], fonte = ''): RoteiroSlide[] {
  const slides: RoteiroSlide[] = (roteiro?.slides ?? []).map((slide, index) => {
    const layout = slide.layout && LAYOUTS.has(slide.layout) ? slide.layout : (index === 0 ? 'capa' : 'texto');
    return {
      tag: slide.tag || layout,
      titulo: slide.titulo || '',
      apoio: slide.apoio || '',
      slot: slide.slot,
      layout,
    };
  });
  if (needsSourceSlide(canon)) {
    const last = slides[slides.length - 1];
    if (!last || last.layout !== 'fonte') {
      slides.push({ tag: 'fonte', titulo: 'Fonte', apoio: fonte, layout: 'fonte' });
    }
  }
  return slides;
}
