import type { RaioxCase, RaioxClass, RaioxStage } from '../../shared/raiox';
import { RAIOX_CLASSES, RAIOX_FRONTS, RAIOX_GAPS, RAIOX_STAGES } from '../../shared/raiox';

const FORBIDDEN = [
  'garantido', 'garantimos', 'vai aumentar', 'com certeza', 'primeira posição',
  'primeiro lugar no google', 'r1', 'g5', 'hash', 'gate', 'sha256', 'chrome',
  'login', 'token', 'gallery-dl', 'rapidapi', 'supabase', 'telegram',
];

const PILOT = 'Esta é uma aplicação piloto: o método está em validação e o preço reflete isso.';

const REPORT_SECTIONS = [
  'Resumo executivo', 'Escopo e cobertura', 'Presença atual', 'Jornada de compra observada',
  'Reputação e relacionamento', 'Oportunidades priorizadas', 'Plano de testes', 'Limitações',
  'Fontes analisadas e limites',
];

const PLAN_SECTIONS = [
  'Objetivo operacional', 'Plano priorizado', 'Rotina orgânica', 'Relacionamento e satisfação',
  'Experimentos e decisão',
];

function publicPart(md: string): string {
  return md.split('<!-- CORTAR-PUBLICO -->')[0] ?? md;
}

function sectionBody(md: string, title: string): string {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

export function lintDocument(md: string, kind: 'relatorio' | 'plano', c: RaioxCase): string[] {
  const problems: string[] = [];
  const required = kind === 'relatorio' ? [...REPORT_SECTIONS] : [...PLAN_SECTIONS];
  if (c.physicalStore) required.push(kind === 'relatorio' ? 'Presença local no Google' : 'Presença Local no Google');
  for (const title of required) {
    if (!new RegExp(`^## ${title}\\s*$`, 'im').test(md)) problems.push(`Falta a seção "${title}".`);
  }
  if (!md.includes('<!-- CORTAR-PUBLICO -->')) problems.push('Falta o marcador <!-- CORTAR-PUBLICO -->.');
  const pub = publicPart(md).toLowerCase();
  for (const term of FORBIDDEN) {
    if (pub.includes(term)) problems.push(`Termo proibido na parte pública: ${term}.`);
  }
  if (kind === 'relatorio' && c.priority) {
    const gap = RAIOX_GAPS.find((item) => item.id === c.priority!.gapId);
    const body = sectionBody(md, 'Oportunidades priorizadas');
    if (gap && !body.toLowerCase().includes(gap.label.toLowerCase())) {
      problems.push('O gap da prioridade não abre as oportunidades priorizadas.');
    }
  }
  if (kind === 'plano' && c.debrief?.plan30 && !md.includes(c.debrief.plan30)) {
    problems.push('O plano de 30 dias da devolutiva não aparece no documento.');
  }
  if (c.debrief?.depth === 'piloto' && !md.includes(PILOT)) {
    problems.push('Falta a frase da aplicação piloto.');
  }
  return problems;
}

export function suggestionShape(value: unknown): { evidencias: Array<{ stage: RaioxStage; source: string; claim: string; classification: RaioxClass; front?: string; gapIds: string[]; url?: string; arquivo?: string }>; hipoteses: Array<{ gapId: string; texto: string; evidencias: number[] }> } {
  if (!value || typeof value !== 'object') throw new Error('o arquivo não é um objeto');
  const body = value as { evidencias?: unknown; hipoteses?: unknown };
  if (!Array.isArray(body.evidencias) || !Array.isArray(body.hipoteses)) throw new Error('faltam as listas evidencias e hipoteses');
  const evidencias = body.evidencias.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`evidência ${index + 1} inválida`);
    const item = row as Record<string, unknown>;
    const stage = typeof item.stage === 'string' ? item.stage : '';
    const classification = typeof item.classification === 'string' ? item.classification : '';
    if (!(RAIOX_STAGES as readonly string[]).includes(stage)) throw new Error(`etapa inválida na evidência ${index + 1}`);
    if (!(RAIOX_CLASSES as readonly string[]).includes(classification)) throw new Error(`classe inválida na evidência ${index + 1}`);
    if (typeof item.source !== 'string' || !item.source.trim() || typeof item.claim !== 'string' || !item.claim.trim()) {
      throw new Error(`fonte ou achado vazio na evidência ${index + 1}`);
    }
    const gapIds = Array.isArray(item.gapIds) ? item.gapIds : null;
    if (!gapIds || gapIds.some((id) => typeof id !== 'string' || !RAIOX_GAPS.some((gap) => gap.id === id))) {
      throw new Error(`gap inválido na evidência ${index + 1}`);
    }
    const front = typeof item.front === 'string' && item.front.trim() ? item.front.trim() : undefined;
    if (front && !RAIOX_FRONTS.some((itemFront) => itemFront.id === front)) throw new Error(`frente inválida na evidência ${index + 1}`);
    return {
      stage: stage as RaioxStage,
      source: item.source.trim(),
      claim: item.claim.trim(),
      classification: classification as RaioxClass,
      front,
      gapIds: gapIds as string[],
      url: typeof item.url === 'string' && item.url.trim() ? item.url.trim() : undefined,
      arquivo: typeof item.arquivo === 'string' && item.arquivo.trim() ? item.arquivo.trim() : undefined,
    };
  });
  const hipoteses = body.hipoteses.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`hipótese ${index + 1} inválida`);
    const item = row as Record<string, unknown>;
    if (typeof item.gapId !== 'string' || !RAIOX_GAPS.some((gap) => gap.id === item.gapId)) throw new Error('gap inválido');
    if (typeof item.texto !== 'string' || !item.texto.trim()) throw new Error(`texto vazio na hipótese ${index + 1}`);
    if (!Array.isArray(item.evidencias) || item.evidencias.some((n) => !Number.isInteger(n) || (n as number) < 0 || (n as number) >= evidencias.length)) {
      throw new Error('índice inexistente');
    }
    return { gapId: item.gapId, texto: item.texto.trim(), evidencias: item.evidencias as number[] };
  });
  return { evidencias, hipoteses };
}
