import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_GAPS, type RaioxStage } from '../../shared/raiox';
import { RaioxError } from './raioxRules';

export interface PlaybookStep { n: number; title: string; time: string; tool: string; how: string; proof: string; }
export interface PlaybookMetric { key: string; unit: string; how: string; }
export interface Playbook {
  id: string; title: string; stage: RaioxStage; offerId: string; wave: number;
  status: 'rascunho' | 'validado'; version: string; validatedAt?: string; validationCases: string[]; hours: number;
  signals: string[]; prereqs: string[]; baseline: PlaybookMetric[]; steps: PlaybookStep[]; done: string[];
  guided: string[]; excluded: string[]; risks: string[]; sources: string[]; file: string;
}

const REQUIRED_SECTIONS = [
  'Sinal no diagnóstico',
  'Pré-requisitos do cliente',
  'Passo 0 — Linha de base',
  'Passo a passo',
  'Critério de pronto',
  'Medição de 30 dias',
  'Versão guiada (o dono faz sozinho)',
  'Fica de fora',
  'Riscos',
  'Fontes',
];

const METRIC_RE = /^- Métrica: (\S+) \| Unidade: (.+?) \| Como coletar: (.+)$/;
const STEP_RE = /^### Passo (\d+) — (.+)$/;
const sectionSeen = new WeakMap<Playbook, Set<string>>();

function parseScalar(raw: string): string | string[] {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => item.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return value;
}

function frontmatter(text: string): { fields: Record<string, string | string[]>; body: string } {
  const normalized = text.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) return { fields: {}, body: normalized };
  const end = normalized.indexOf('\n---', 3);
  if (end < 0) return { fields: {}, body: normalized };
  const fields: Record<string, string | string[]> = {};
  for (const line of normalized.slice(3, end).split(/\r?\n/)) {
    const split = line.indexOf(':');
    if (split < 0) continue;
    fields[line.slice(0, split).trim()] = parseScalar(line.slice(split + 1));
  }
  return { fields, body: normalized.slice(end + 4).replace(/^\r?\n/, '') };
}

function sections(body: string): Map<string, string> {
  const map = new Map<string, string>();
  const parts = body.split(/^## /m).slice(1);
  for (const part of parts) {
    const breakAt = part.indexOf('\n');
    const name = (breakAt < 0 ? part : part.slice(0, breakAt)).trim();
    const content = breakAt < 0 ? '' : part.slice(breakAt + 1);
    map.set(name, content);
  }
  return map;
}

function bullets(content: string): string[] {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^- (.+)$/);
    return match ? [match[1].trim()] : [];
  });
}

function numbered(content: string): string[] {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\d+\.\s+(.+)$/);
    return match ? [match[1].trim()] : [];
  });
}

function metrics(content: string): PlaybookMetric[] {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(METRIC_RE);
    return match ? [{ key: match[1], unit: match[2].trim(), how: match[3].trim() }] : [];
  });
}

function stepsOf(content: string): PlaybookStep[] {
  const lines = content.split(/\r?\n/);
  const steps: PlaybookStep[] = [];
  let current: PlaybookStep | null = null;
  const flush = () => {
    if (current) steps.push(current);
  };
  for (const line of lines) {
    const heading = line.match(STEP_RE);
    if (heading) {
      flush();
      current = { n: Number(heading[1]), title: heading[2].trim(), time: '', tool: '', how: '', proof: '' };
      continue;
    }
    if (!current) continue;
    const time = line.match(/^- Tempo:\s*(.*)$/);
    const tool = line.match(/^- Ferramenta:\s*(.*)$/);
    const how = line.match(/^- Como:\s*(.*)$/);
    const proof = line.match(/^- Prova:\s*(.*)$/);
    if (time) current.time = time[1].trim();
    else if (tool) current.tool = tool[1].trim();
    else if (how) current.how = current.how ? `${current.how}\n${how[1].trim()}` : how[1].trim();
    else if (proof) current.proof = proof[1].trim();
  }
  flush();
  return steps;
}

function textOf(fields: Record<string, string | string[]>, key: string): string {
  const value = fields[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function parsePlaybook(text: string, file: string): Playbook {
  const { fields, body } = frontmatter(text);
  const found = sections(body);
  const statusRaw = textOf(fields, 'status');
  const status = statusRaw === 'validado' ? 'validado' : 'rascunho';
  const validated = textOf(fields, 'validado_em');
  const cases = fields.casos_validacao;
  const guidedBody = found.get('Versão guiada (o dono faz sozinho)') ?? '';
  const guided = numbered(guidedBody);
  const playbook: Playbook = {
    id: textOf(fields, 'id'),
    title: textOf(fields, 'titulo'),
    stage: textOf(fields, 'etapa') as RaioxStage,
    offerId: textOf(fields, 'oferta'),
    wave: Number(textOf(fields, 'onda')),
    status,
    version: textOf(fields, 'versao'),
    validatedAt: validated || undefined,
    validationCases: Array.isArray(cases) ? cases : [],
    hours: Number(textOf(fields, 'tempo_total_h')),
    signals: bullets(found.get('Sinal no diagnóstico') ?? ''),
    prereqs: bullets(found.get('Pré-requisitos do cliente') ?? ''),
    baseline: metrics(found.get('Passo 0 — Linha de base') ?? ''),
    steps: stepsOf(found.get('Passo a passo') ?? ''),
    done: bullets(found.get('Critério de pronto') ?? ''),
    guided: guided.length ? guided : bullets(guidedBody),
    excluded: bullets(found.get('Fica de fora') ?? ''),
    risks: bullets(found.get('Riscos') ?? ''),
    sources: bullets(found.get('Fontes') ?? ''),
    file: path.basename(file),
  };
  sectionSeen.set(playbook, new Set(found.keys()));
  return playbook;
}

export function loadPlaybooks(dir?: string): Playbook[] {
  const root = dir ?? path.join(process.cwd(), 'raiox', 'playbooks');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => name.endsWith('.md') && name !== '_MODELO.md')
    .sort()
    .map((name) => parsePlaybook(fs.readFileSync(path.join(root, name), 'utf8'), name));
}

export function lintPlaybook(p: Playbook): string[] {
  const problems: string[] = [];
  const expected = path.basename(p.file, '.md');
  if (p.id !== expected) problems.push('id diferente do nome do arquivo');
  const gap = RAIOX_GAPS.find((item) => item.id === p.id);
  if (!gap) problems.push('gap fora da taxonomia');
  else {
    if (p.stage !== gap.stage) problems.push('etapa diferente da taxonomia');
    if (p.offerId !== gap.offerId) problems.push('oferta diferente da taxonomia');
    if (p.wave !== gap.wave) problems.push('onda diferente da taxonomia');
  }
  if (p.steps.length < 5) problems.push('menos de 5 passos');
  for (const step of p.steps) {
    if (!step.time) problems.push(`passo ${step.n} sem Tempo`);
    if (!step.proof) problems.push(`passo ${step.n} sem Prova`);
    if (!step.how) problems.push(`passo ${step.n} sem Como`);
  }
  if (p.baseline.length === 0) problems.push('sem métrica de linha de base');
  const names = sectionSeen.get(p);
  if (names) {
    for (const name of REQUIRED_SECTIONS) {
      if (!names.has(name)) problems.push(`seção ausente: ${name}`);
    }
  }
  if (p.status === 'validado' && !p.validatedAt) problems.push('validado sem data');
  if (p.status === 'validado' && p.validationCases.length === 0) problems.push('validado sem caso de validação');
  if (p.sources.length === 0) problems.push('sem fonte oficial');
  if (p.guided.length === 0) problems.push('versão guiada vazia');
  return problems;
}

export function playbookStatusFor(gapId: string | undefined): 'rascunho' | 'validado' {
  if (!gapId) return 'rascunho';
  return loadPlaybooks().find((item) => item.id === gapId)?.status ?? 'rascunho';
}

export function requirePlaybook(id: string): Playbook {
  const found = loadPlaybooks().find((item) => item.id === id);
  if (!found) throw new RaioxError('Playbook não encontrado.');
  return found;
}
