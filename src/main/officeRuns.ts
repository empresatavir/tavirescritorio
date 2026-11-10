import * as fs from 'node:fs';
import * as path from 'node:path';
import { engineHub } from './drivers/engineHub';
import { findMotorBinary, runMotor, type MotorId } from './motors';
import { listRuns, readRun, startRun, type RunKind, type RunSummary } from './runLedger';
import { caseDir, listCases, raioxRoot } from './raiox/raioxStore';
import { studioHome } from './studio/paths';

export interface OfficeCheckpoint {
  at: string;
  label: string;
  reason: string;
  partial: string;
}

export interface OfficeRun extends RunSummary {
  workspace: string;
  module: string;
  place: string;
  checkpointAt?: string;
  checkpointHint?: string;
}

function motorId(engine: string): MotorId {
  if (engine === 'claude' || engine === 'anthropic') return 'claude';
  if (engine === 'codex' || engine === 'antigravity') return engine;
  return 'cursor';
}

export function readCheckpoint(workspace: string): OfficeCheckpoint | null {
  const files = [
    path.join(workspace, '.tavir', 'trilho', 'checkpoint.json'),
    path.join(workspace, '.tavir', 'checkpoint.json'),
  ];
  for (const file of files) {
    try {
      const row = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      const reason = String(row.reason || '').trim();
      const partial = String(row.partial || '');
      if (!reason && !partial.trim()) continue;
      return {
        at: String(row.at || ''),
        label: String(row.label || 'Etapa').slice(0, 80),
        reason: reason.slice(0, 400),
        partial,
      };
    } catch {
      /* próximo arquivo */
    }
  }
  return null;
}

export function writeCheckpoint(workspace: string, checkpoint: OfficeCheckpoint): void {
  const target = path.join(workspace, '.tavir', 'checkpoint.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(checkpoint), 'utf8');
}

export function isFactoryTrack(workspace: string): boolean {
  return fs.existsSync(path.join(workspace, '.tavir', 'control.json'));
}

/** Continua ou corrige uma execução que não é o trilho da Fábrica. O trilho usa o checkpoint dele. */
export async function followOfficeRun(workspace: string, runId: string, mode: 'continue' | 'correct', note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const root = path.resolve(workspace);
  if (!fs.existsSync(path.join(root, '.tavir', 'runs'))) return { ok: false, error: 'Esta execução não tem checkpoint para continuar.' };
  const detail = readRun(root, runId);
  if (!detail.ok) return { ok: false, error: detail.error || 'Execução não encontrada.' };
  const meta = detail.meta as { kind?: string; label?: string; stage?: string; owner?: string; projectName?: string };
  const checkpoint = readCheckpoint(root);
  const correction = note.trim();
  if (mode === 'correct' && !correction) return { ok: false, error: 'Escreva o que precisa mudar antes de corrigir.' };
  const prompt = [
    'Continue do checkpoint. Não refaça o que já está válido.',
    `Etapa: ${meta.stage || checkpoint?.label || ''}`,
    checkpoint ? `Checkpoint ${checkpoint.at} · ${checkpoint.label}\n${checkpoint.reason}\n${checkpoint.partial.slice(-4000)}` : '',
    detail.prompt ? `Pedido original:\n${String(detail.prompt).slice(-6000)}` : '',
    detail.resposta ? `Última resposta:\n${String(detail.resposta).slice(-4000)}` : '',
    mode === 'correct' ? `Correção:\n${correction}` : 'Siga do ponto em que parou.',
  ].filter(Boolean).join('\n\n');
  writeCheckpoint(root, {
    at: new Date().toISOString(),
    label: meta.label || meta.stage || 'Etapa',
    reason: mode === 'correct' ? correction.slice(0, 400) : 'Continuação pedida. A nova tentativa segue deste ponto.',
    partial: String(detail.resposta || checkpoint?.partial || '').slice(-2000),
  });
  const settings = engineHub.getSettings();
  const motor = motorId(settings.defaultEngine);
  const kind: RunKind = meta.kind === 'esteira' || meta.kind === 'trilho' || meta.kind === 'raiox' || meta.kind === 'chat' ? meta.kind : 'chat';
  const handle = await startRun({
    workspace: root,
    kind,
    label: `Continuidade · ${meta.label || 'execução'}`,
    stage: meta.stage || '',
    owner: meta.owner || 'Execução',
    projectName: meta.projectName || path.basename(root),
    engine: motor,
    binary: findMotorBinary(motor) || '',
    model: settings.defaultModel,
    effort: settings.defaultEffort,
    mode: 'write',
    args: [],
    timeoutMs: 45 * 60 * 1000,
    prompt,
  });
  const result = await runMotor({
    motor,
    workspace: root,
    prompt,
    model: settings.defaultModel,
    effort: settings.defaultEffort,
    access: 'write',
    timeoutMs: 45 * 60 * 1000,
    onRaw: (stream, text) => handle.raw(stream, text),
  });
  await handle.finish({
    ok: result.ok,
    status: result.error?.kind === 'paused' ? 'paused' : undefined,
    error: result.error?.kind === 'paused' ? 'Pausado por Carlos. A retomada continua deste ponto.' : result.error?.message,
    reply: result.text || '',
    exitCode: result.exitCode,
  });
  if (result.error?.kind === 'paused') return { ok: true };
  if (!result.ok) return { ok: false, error: result.error?.message || 'A continuação não terminou.' };
  return { ok: true };
}

const SKIP = new Set(['node_modules', '.git', 'dist', '.tavir', 'qa', '.next']);

function moduleOf(run: RunSummary, place: string): string {
  const blob = `${run.kind} ${run.owner} ${run.label} ${run.stage} ${place}`.toLowerCase();
  if (run.kind === 'raiox' || blob.includes('raio')) return 'Raio-X';
  if (blob.includes('flow')) return 'Flow';
  if (blob.includes('ediç') || blob.includes('edicao') || blob.includes('edição')) return 'Edição';
  if (blob.includes('studio') || blob.includes('estúdio') || blob.includes('motion')) return 'Studio';
  if (run.kind === 'esteira' || run.kind === 'trilho' || blob.includes('fábrica') || blob.includes('fabrica')) return 'Fábrica';
  return 'Chat';
}

function workspacesUnder(root: string, depth: number, budget: { n: number }, out: string[]): void {
  if (depth > 6 || budget.n > 600) return;
  budget.n += 1;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  if (entries.some((entry) => entry.isDirectory() && entry.name === '.tavir')) {
    if (fs.existsSync(path.join(root, '.tavir', 'runs'))) out.push(root);
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
    workspacesUnder(path.join(root, entry.name), depth + 1, budget, out);
  }
}

function projectPlaces(): { workspace: string; place: string }[] {
  try {
    const dbPath = path.join(process.cwd(), 'backend', 'tavir.db');
    if (!fs.existsSync(dbPath)) return [];
    const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (file: string) => { prepare: (sql: string) => { all: () => Array<{ name?: string; local_path?: string }> }; close: () => void } };
    const db = new DatabaseSync(dbPath);
    const rows = db.prepare('SELECT name, local_path FROM projects').all();
    if (typeof db.close === 'function') db.close();
    return rows
      .filter((row) => row.local_path && fs.existsSync(row.local_path))
      .map((row) => ({ workspace: String(row.local_path), place: row.name || 'Fábrica' }));
  } catch {
    return [];
  }
}

/** Toda chamada de motor que o livro gravou: Fábrica, Studio, Flow, Edição, Raio-X e chat. */
export function listOfficeRuns(): OfficeRun[] {
  const places: { workspace: string; place: string }[] = projectPlaces();
  const nested: string[] = [];
  workspacesUnder(studioHome(), 0, { n: 0 }, nested);
  for (const workspace of nested) places.push({ workspace, place: 'Studio' });
  try {
    const root = raioxRoot();
    for (const item of listCases(root)) places.push({ workspace: caseDir(root, item.id), place: item.id });
  } catch {
    /* pasta do Raio-X ainda não existe */
  }
  const seen = new Set<string>();
  const all: OfficeRun[] = [];
  for (const place of places) {
    const key = path.resolve(place.workspace);
    if (seen.has(key)) continue;
    seen.add(key);
    const checkpoint = readCheckpoint(place.workspace);
    const hint = checkpoint
      ? (checkpoint.reason || 'Há um checkpoint desta etapa. A nova tentativa continua dali.')
      : '';
    for (const run of listRuns(place.workspace, 80)) {
      all.push({
        ...run,
        workspace: place.workspace,
        place: place.place,
        module: moduleOf(run, place.place),
        checkpointAt: checkpoint ? String(checkpoint.at || '').replace('T', ' ').slice(0, 19) : undefined,
        checkpointHint: hint || undefined,
      });
    }
  }
  all.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
  return all.slice(0, 200);
}
