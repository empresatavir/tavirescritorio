import { MOTION_PRESETS, type MotionPreset, type Roteiro, type RoteiroCena } from '../../shared/studio';

const PRESETS = new Set<string>(MOTION_PRESETS);

function presetOf(value: string | undefined, index: number, total: number): MotionPreset {
  if (value && PRESETS.has(value)) return value as MotionPreset;
  if (index === total - 1 && total > 1) return 'encerramento-cta';
  return index === 0 ? 'titulo-entrada' : 'zoom-lento';
}

/** Normaliza as cenas do reel. A duração real vem da narração; `duracao_min` é só o piso. */
export function scenesFromRoteiro(roteiro: Roteiro | null | undefined): RoteiroCena[] {
  const fromSlides: RoteiroCena[] = (roteiro?.slides ?? []).map((slide) => ({
    texto_narrado: slide.apoio || slide.titulo,
    texto_tela: slide.titulo,
    slot: slide.slot,
  }));
  const raw = roteiro?.cenas?.length ? roteiro.cenas : fromSlides;
  const filled = raw.filter((scene) => scene.texto_narrado?.trim());
  // As cenas são gravadas na narração. Imagem ligada depois fica só no slide: herda pela mesma posição.
  const slideSlots = fromSlides.filter((scene) => scene.texto_narrado?.trim()).map((scene) => scene.slot);
  return filled.map((scene, index) => ({
    texto_narrado: scene.texto_narrado.trim(),
    texto_tela: scene.texto_tela?.trim() || undefined,
    slot: scene.slot || slideSlots[index],
    preset: presetOf(scene.preset, index, filled.length),
    duracao_min: scene.duracao_min && scene.duracao_min > 0 ? scene.duracao_min : 1,
  }));
}
