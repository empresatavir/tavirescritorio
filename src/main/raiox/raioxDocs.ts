import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { engineHub } from '../drivers/engineHub';
import { findMotorBinary, runMotor, type MotorCall, type MotorId, type MotorResult } from '../motors';
import { startRun, type RunHandle } from '../runLedger';
import { buildContext, repoRoot } from './raioxContext';
import { lintDocument } from './raioxDocLint';
import { RaioxError, attachDocuments } from './raioxRules';
import { caseDir, readCase, writeCase } from './raioxStore';
import type { RaioxDocument } from '../../shared/raiox';

const TIMEOUT_MS = 45 * 60 * 1000;
const PDF_TIMEOUT_MS = 90_000;
const PDF_MAX = 15 * 1024 * 1024;

function officeMotor(id: string): MotorId {
  if (id === 'claude' || id === 'anthropic') return 'claude';
  if (id === 'codex') return 'codex';
  if (id === 'antigravity') return 'antigravity';
  return 'cursor';
}

export interface DocsDeps {
  run?: (call: MotorCall) => Promise<MotorResult>;
  now?: () => string;
  repo?: string;
  execFile?: typeof execFile;
  ledger?: { start: typeof startRun };
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function nextVersion(dir: string): number {
  const base = path.join(dir, 'documentos');
  if (!fs.existsSync(base)) return 1;
  const nums = fs.readdirSync(base).map((name) => /^v(\d+)$/.exec(name)?.[1]).filter(Boolean).map(Number);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export async function writeDocuments(root: string, id: string, deps: DocsDeps = {}): Promise<{ ok: true; version: number; problems: string[] }> {
  const current = readCase(root, id);
  if (!current.debrief) throw new RaioxError('Registre a devolutiva antes de gerar os documentos.');
  const version = nextVersion(caseDir(root, id));
  const repo = deps.repo || repoRoot();
  buildContext(root, current, 'redacao', { version, repo });
  const prompt = fs.readFileSync(path.join(caseDir(root, id), '_contexto', 'prompt.md'), 'utf8');
  const settings = engineHub.getSettings();
  const motor = officeMotor(settings.defaultEngine);
  const workspace = caseDir(root, id);
  const runner = deps.run ?? runMotor;
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const ledger = deps.ledger ?? { start: startRun };
  const handle: RunHandle = await ledger.start({
    workspace, kind: 'raiox', label: 'Raio-X · redação', stage: current.status, owner: 'Raio-X',
    projectName: current.id, engine: motor, binary: findMotorBinary(motor) || '',
    model: settings.defaultModel, effort: settings.defaultEffort, mode: 'write', args: [], timeoutMs: TIMEOUT_MS, prompt,
  });
  const result = await runner({
    motor, workspace, prompt, model: settings.defaultModel, effort: settings.defaultEffort,
    access: 'write', timeoutMs: TIMEOUT_MS,
  });
  if (!result.ok) {
    const message = result.error?.message || 'A redação não terminou.';
    await handle.finish({ ok: false, error: message, reply: result.text || '' });
    throw new RaioxError(message);
  }
  const folder = path.join(workspace, 'documentos', `v${version}`);
  const files = [
    { kind: 'relatorio' as const, name: 'relatorio-raio-x.md' },
    { kind: 'plano' as const, name: 'plano-crescimento.md' },
  ];
  const docs: RaioxDocument[] = [];
  for (const file of files) {
    const full = path.join(folder, file.name);
    if (!fs.existsSync(full)) {
      await handle.finish({ ok: false, error: 'A redação não gravou os dois documentos.', reply: result.text || '' });
      throw new RaioxError('A redação não gravou os dois documentos.');
    }
    const md = fs.readFileSync(full, 'utf8');
    docs.push({
      kind: file.kind,
      version,
      md: path.posix.join('documentos', `v${version}`, file.name),
      sha256: sha256(full),
      lint: lintDocument(md, file.kind, current),
      createdAt: now,
    });
  }
  writeCase(root, attachDocuments(current, docs, now));
  await handle.finish({ ok: true, reply: result.text || '' });
  return { ok: true, version, problems: docs.flatMap((doc) => doc.lint) };
}

function runPython(repo: string, args: string[], exec: typeof execFile): Promise<void> {
  const script = path.join(repo, 'tools', 'publicar.py');
  return new Promise((resolve, reject) => {
    exec('python', ['-I', script, ...args], { timeout: PDF_TIMEOUT_MS }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function renderPdfs(root: string, id: string, version: number, deps: DocsDeps = {}): Promise<{ ok: true }> {
  const current = readCase(root, id);
  const docs = current.debrief?.documents?.filter((doc) => doc.version === version) || [];
  if (docs.length !== 2) throw new RaioxError('Gere os documentos antes do PDF.');
  const repo = deps.repo || repoRoot();
  const dir = caseDir(root, id);
  const folder = path.join(dir, 'documentos', `v${version}`);
  const exec = deps.execFile ?? execFile;
  const specs = [
    { kind: 'relatorio' as const, base: 'relatorio-raio-x', titulo: 'Relatório de Raio X' },
    { kind: 'plano' as const, base: 'plano-crescimento', titulo: 'Plano de Crescimento Orgânico' },
  ];
  try {
    for (const spec of specs) {
      const md = path.join(folder, `${spec.base}.md`);
      await runPython(repo, [md, '--tipo', 'relatorio', '--out', folder, '--nome', spec.base, '--titulo', spec.titulo, '--publico', '--marca', 'tavir', '--rotulo', current.id], exec);
      const pdf = path.join(folder, `${spec.base}.pdf`);
      if (!fs.existsSync(pdf)) throw new Error('ausente');
      const size = fs.statSync(pdf).size;
      if (size <= 0 || size > PDF_MAX) throw new Error('tamanho');
    }
  } catch {
    throw new RaioxError('O PDF não foi gerado. Confira Python e Edge/Chrome.');
  }
  const nextDocs = (current.debrief?.documents || []).map((doc) => doc.version === version
    ? { ...doc, pdf: path.posix.join('documentos', `v${version}`, doc.kind === 'relatorio' ? 'relatorio-raio-x.pdf' : 'plano-crescimento.pdf') }
    : doc);
  writeCase(root, { ...current, debrief: { ...current.debrief!, documents: nextDocs } });
  return { ok: true };
}

export function documentPath(root: string, id: string, relative: string): string {
  const dir = caseDir(root, id);
  const full = path.resolve(dir, relative);
  const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
  if (!full.startsWith(prefix) || !fs.existsSync(full)) throw new RaioxError('Documento não encontrado.');
  return full;
}
