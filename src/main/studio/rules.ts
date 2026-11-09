import {
  PIECE_GATES,
  TEXT_LIMITS,
  formatById,
  stagesFor,
  type GateDecision,
  type Peca,
  type PieceStage,
  type Roteiro,
  type SlotTipo,
  type StudioFormat,
} from '../../shared/studio';
import { previewAlerts } from '../../shared/studioPreview';
import { needsSourceSlide, slidesFromRoteiro } from './slides';

export interface RuleResult {
  ok: boolean;
  motivo: string;
  peca: Peca;
  gate?: {
    peca_id: string;
    etapa: PieceStage;
    decisao: GateDecision;
    comentario: string;
  };
}

function fail(peca: Peca, motivo: string): RuleResult {
  return { ok: false, motivo, peca };
}

export function nextStage(peca: { etapa: PieceStage; formato_id: string }): PieceStage | null {
  const format = formatById(peca.formato_id);
  if (!format) return null;
  const stages = stagesFor(format.kind);
  const i = stages.indexOf(peca.etapa);
  if (i < 0 || i + 1 >= stages.length) return null;
  return stages[i + 1];
}

export function prevStage(peca: { etapa: PieceStage; formato_id: string }): PieceStage | null {
  const format = formatById(peca.formato_id);
  if (!format) return null;
  const stages = stagesFor(format.kind);
  const i = stages.indexOf(peca.etapa);
  if (i <= 0) return null;
  return stages[i - 1];
}

/** O que falta para sair da etapa atual. Gate não entra aqui: quem chama decide. */
export function precondition(peca: Peca): { ok: boolean; motivo: string } {
  if (peca.status !== 'ativa') return { ok: false, motivo: 'peça não está ativa' };
  const format = formatById(peca.formato_id);
  if (!format) return { ok: false, motivo: 'formato desconhecido' };

  switch (peca.etapa) {
    case 'pauta':
    case 'audio':
      return { ok: true, motivo: '' };
    case 'angulo': {
      if (!peca.angulo_escolhido) return { ok: false, motivo: 'ângulo não escolhido' };
      if (!peca.angulos.some((a) => a.id === peca.angulo_escolhido)) {
        return { ok: false, motivo: 'ângulo escolhido não está na lista' };
      }
      return { ok: true, motivo: '' };
    }
    case 'roteiro': {
      if (!peca.roteiro) return { ok: false, motivo: 'roteiro ausente' };
      const n = peca.roteiro.slides?.length ?? 0;
      if (format.minSlides != null && n < format.minSlides) {
        return { ok: false, motivo: `roteiro com ${n} slides (mínimo ${format.minSlides})` };
      }
      if (format.maxSlides != null && n > format.maxSlides) {
        return { ok: false, motivo: `roteiro com ${n} slides (máximo ${format.maxSlides})` };
      }
      return { ok: true, motivo: '' };
    }
    case 'arte': {
      if (format.kind !== 'video') {
        const slides = peca.roteiro?.slides?.length ?? 0;
        const slots = peca.slots ?? [];
        if (!slides && slots.length === 0) return { ok: false, motivo: 'roteiro sem slides' };
        if (slots.some((s) => !s.ativo_id)) return { ok: false, motivo: 'há slot sem ativo' };
        return { ok: true, motivo: '' };
      }
      const slots = peca.slots;
      if (!slots || slots.length === 0) return { ok: false, motivo: 'nenhum slot na peça' };
      if (slots.some((s) => !s.ativo_id)) return { ok: false, motivo: 'há slot sem ativo' };
      return { ok: true, motivo: '' };
    }
    case 'revisao': {
      if (format.kind !== 'video') {
        const render = peca.render_final;
        if (render?.checks?.length && render.checks.every((item) => item.ok === true)) return { ok: true, motivo: '' };
        const items = reviewChecklist({
          roteiro: peca.roteiro,
          formatoId: peca.formato_id,
          slots: peca.slots ?? [],
        });
        const bad = items.filter((item) => !item.ok);
        if (bad.length) return { ok: false, motivo: bad.map((item) => item.detalhe).join('; ') };
        return { ok: true, motivo: '' };
      }
      const render = peca.render_final;
      if (!render) return { ok: false, motivo: 'render final ausente' };
      const checks = render.checks;
      if (!checks || checks.length === 0 || checks.some((c) => c.ok !== true)) {
        return { ok: false, motivo: 'render final sem checks verdes' };
      }
      return { ok: true, motivo: '' };
    }
    case 'pacote':
      if (!peca.pacote_montado) return { ok: false, motivo: 'pacote não montado' };
      return { ok: true, motivo: '' };
    case 'publicado':
      return { ok: false, motivo: 'peça já publicada' };
    default:
      return { ok: false, motivo: 'etapa desconhecida' };
  }
}

/** `advance` só vale em etapa sem gate e com a pré-condição cumprida. */
export function canAdvance(peca: Peca): boolean {
  if (PIECE_GATES.includes(peca.etapa)) return false;
  return precondition(peca).ok && nextStage(peca) != null;
}

export function advance(peca: Peca): RuleResult {
  if (peca.status !== 'ativa') return fail(peca, 'peça não está ativa');
  if (PIECE_GATES.includes(peca.etapa)) return fail(peca, 'etapa com gate');
  const pre = precondition(peca);
  if (!pre.ok) return fail(peca, pre.motivo);
  const next = nextStage(peca);
  if (!next) return fail(peca, 'não há próxima etapa');
  return { ok: true, motivo: '', peca: { ...peca, etapa: next } };
}

/**
 * Aprovado avança. Ajuste volta uma etapa e guarda o comentário no registro do gate.
 * Recusado arquiva a peça.
 */
export function applyGate(peca: Peca, etapa: PieceStage, decisao: GateDecision, comentario: string): RuleResult {
  if (peca.status !== 'ativa') return fail(peca, 'peça não está ativa');
  if (peca.etapa !== etapa) return fail(peca, 'a peça está em outra etapa');

  if (decisao === 'recusado') {
    return {
      ok: true,
      motivo: '',
      peca: { ...peca, status: 'arquivada' },
      gate: { peca_id: peca.id, etapa, decisao, comentario },
    };
  }

  if (decisao === 'ajuste') {
    const prev = prevStage(peca);
    if (!prev) return fail(peca, 'não há etapa anterior');
    return {
      ok: true,
      motivo: '',
      peca: { ...peca, etapa: prev },
      gate: { peca_id: peca.id, etapa, decisao, comentario },
    };
  }

  const pre = precondition(peca);
  if (!pre.ok) return fail(peca, pre.motivo);
  const next = nextStage(peca);
  if (!next) return fail(peca, 'não há próxima etapa');
  return {
    ok: true,
    motivo: '',
    peca: { ...peca, etapa: next },
    gate: { peca_id: peca.id, etapa, decisao, comentario },
  };
}

/** `MP-0014-S03`: S = slide/imagem, C = cena de vídeo. */
export function slotCode(serieSigla: string, numero: number, indice: number, tipo: SlotTipo): string {
  const sigla = serieSigla.trim().toUpperCase();
  if (!/^[A-Z]{2,6}$/.test(sigla)) throw new Error('sigla inválida');
  if (!Number.isInteger(numero) || numero < 0 || !Number.isInteger(indice) || indice < 0) {
    throw new Error('número ou índice inválido');
  }
  const letter = tipo === 'video' ? 'C' : 'S';
  return `${sigla}-${String(numero).padStart(4, '0')}-${letter}${String(indice).padStart(2, '0')}`;
}

export function reviewChecklist(input: {
  roteiro: Roteiro | null;
  formatoId: string;
  canon?: string[];
  fonte?: string;
  slots?: Array<{ codigo?: string; ativo_id: string | null }>;
}): Array<{ nome: string; ok: boolean; detalhe: string }> {
  const format = formatById(input.formatoId);
  if (!format) return [{ nome: 'formato', ok: false, detalhe: 'formato desconhecido' }];
  const slides = slidesFromRoteiro(input.roteiro, input.canon ?? [], input.fonte ?? '');
  const texts = validateTexts({ ...(input.roteiro ?? {}), slides }, format);
  const items = [{
    nome: 'limites de texto',
    ok: texts.ok,
    detalhe: texts.ok ? 'dentro dos limites' : texts.erros.join('; '),
  }];
  const unsafe = slides.filter((slide, index) => previewAlerts({
    format, title: slide.titulo, slideIndex: index, slideCount: slides.length,
  }).some((alert) => alert.id === 'safe'));
  items.push({
    nome: 'zona segura',
    ok: unsafe.length === 0,
    detalhe: unsafe.length ? `texto fora da zona no slide ${slides.indexOf(unsafe[0]) + 1}` : 'texto dentro da zona',
  });
  const byCode = new Map((input.slots ?? []).map((slot) => [slot.codigo, slot]));
  const missing = slides.filter((slide) => slide.slot && !byCode.get(slide.slot)?.ativo_id);
  items.push({
    nome: 'slots',
    ok: missing.length === 0,
    detalhe: missing.length ? `sem ativo: ${missing.map((slide) => slide.slot).join(', ')}` : 'slots completos',
  });
  if (needsSourceSlide(input.canon ?? [])) {
    const last = slides[slides.length - 1];
    const cited = !!last && last.layout === 'fonte' && !!last.apoio;
    items.push({
      nome: 'fonte citada',
      ok: cited,
      detalhe: cited ? 'último slide cita a fonte' : 'o canon exige fonte no último slide',
    });
  }
  return items;
}

export function validateTexts(roteiro: Roteiro | null, formato: StudioFormat): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!roteiro) return { ok: false, erros: ['roteiro ausente'] };
  const slides = roteiro.slides ?? [];
  const capa = slides.find((s) => s.layout === 'capa') ?? slides[0];
  if (capa && capa.titulo.length > TEXT_LIMITS.capaMaxChars) {
    erros.push(`capa com ${capa.titulo.length} caracteres (máximo ${TEXT_LIMITS.capaMaxChars})`);
  }
  slides.forEach((slide, i) => {
    const apoio = slide.apoio ?? '';
    if (apoio.length > TEXT_LIMITS.slideMaxChars) {
      erros.push(`slide ${i + 1} com ${apoio.length} caracteres de apoio (máximo ${TEXT_LIMITS.slideMaxChars})`);
    }
  });
  const legenda = roteiro.legenda ?? '';
  if (legenda.length > TEXT_LIMITS.legendaMaxChars) {
    erros.push(`legenda com ${legenda.length} caracteres (máximo ${TEXT_LIMITS.legendaMaxChars})`);
  }
  const tags = roteiro.hashtags ?? [];
  if (tags.length > TEXT_LIMITS.hashtagsMax) {
    erros.push(`${tags.length} hashtags (máximo ${TEXT_LIMITS.hashtagsMax})`);
  }
  if (formato.minSlides != null && slides.length < formato.minSlides) {
    erros.push(`${slides.length} slides (mínimo ${formato.minSlides})`);
  }
  if (formato.maxSlides != null && slides.length > formato.maxSlides) {
    erros.push(`${slides.length} slides (máximo ${formato.maxSlides})`);
  }
  return { ok: erros.length === 0, erros };
}
